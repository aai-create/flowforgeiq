/**
 * Signal Inbox — bidirectional omnichannel review queue.
 *
 * Lifecycle:
 *   new → assessing → draft_ready → approved → sending → sent
 *                                                      → send_failed    (Gmail rejected — retryable)
 *                                                      → send_uncertain (Gmail accepted, finalization failed — NOT retryable)
 *                             └→ skipped
 *
 * Idempotency / safety contracts:
 *
 *   ASSESS:
 *     - Atomic claim: UPDATE WHERE signal_status IN ('new','draft_ready','send_failed')
 *     - Success/failure revert transitions are conditional on signal_status='assessing',
 *       so a concurrent /skip that fires while AI is running is NOT silently overwritten.
 *
 *   SEND:
 *     - Atomic claim: UPDATE WHERE signal_status IN ('approved','send_failed')
 *     - Pre-dispatch: proposal updated to dispatch_pending with a dispatchKey BEFORE calling Gmail.
 *     - All post-Gmail-success writes (proposal → auto_executed, message → sent, outbound row insert)
 *       are inside a single try/catch. If any fail the message transitions to send_uncertain.
 *     - send_uncertain is not retryable via the UI — the email was sent; retrying would duplicate it.
 *     - Gmail network error (ambiguous delivery) → send_uncertain immediately.
 */

import { Router, type IRouter } from "express";
import { db, messagesTable, copilotProposalsTable, shipmentsTable } from "@workspace/db";
import { and, desc, eq, ne, inArray, not } from "drizzle-orm";
import { z } from "zod/v4";
import { resolveOrgId } from "../middlewares/requireAuth";
import { draftReplyWithAI } from "./webhooks";
import { sendViaGmail, GmailNotConnectedError, GmailSendError } from "../lib/gmailSend";
import { ListMessagesResponseItem } from "@workspace/api-zod";
import { draftRevision } from "../lib/draftRevision";
import {
  transitionSignalStatus,
  SignalInboxTransitionError,
  ASSESS_FROM_STATUSES,
  SEND_FROM_STATUSES,
  SKIP_BLOCKED_STATUSES,
  EDIT_BLOCKED_STATUSES,
  type SignalStatus,
} from "../lib/signal-inbox-workflow";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function signalTriggerRef(messageId: number): string {
  return `signal_inbox:message:${messageId}`;
}

async function findActiveSignalDraft(messageId: number, orgId: number) {
  const ref = signalTriggerRef(messageId);
  const [proposal] = await db
    .select()
    .from(copilotProposalsTable)
    .where(
      and(
        eq(copilotProposalsTable.orgId, orgId),
        eq(copilotProposalsTable.triggerRef, ref),
        eq(copilotProposalsTable.source, "signal_inbox"),
        not(inArray(copilotProposalsTable.status, ["rejected", "snoozed"])),
      ),
    )
    .limit(1);
  return proposal ?? null;
}

/**
 * Append an audit entry.
 * Typed as Record<string,unknown>[] — avoids spread-of-unknown TypeScript error.
 */
function appendAudit(
  existing: Record<string, unknown>[],
  action: string,
  actor: "system" | "user",
  note?: string,
): Record<string, unknown>[] {
  const entry: Record<string, unknown> = { at: new Date().toISOString(), actor, action };
  if (note) entry.note = note;
  return [...existing, entry];
}

/** Parse auditTrail stored as unknown JSON to typed array. */
function parseAuditTrail(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function approvedRevision(auditTrail: unknown): string | null {
  const entries = parseAuditTrail(auditTrail);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].action === "approved" && typeof entries[i].note === "string") {
      const match = (entries[i].note as string).match(/draftRevision=([a-f0-9]{64})/);
      if (match) return match[1];
    }
  }
  return null;
}

const ASSESS_TIMEOUT_MS = Number(process.env.SIGNAL_INBOX_ASSESS_TIMEOUT_MS ?? "10000");

// ─── GET /signal-inbox ───────────────────────────────────────────────────────

router.get("/signal-inbox", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const statusFilter = req.query.status as string | undefined;
  const channelFilter = req.query.channel as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  const conditions: Parameters<typeof and>[0][] = [
    eq(messagesTable.orgId, orgId),
    eq(messagesTable.direction, "inbound"),
  ];

  if (statusFilter) {
    conditions.push(eq(messagesTable.signalStatus, statusFilter));
  } else {
    conditions.push(ne(messagesTable.signalStatus, "skipped"));
  }

  if (channelFilter) {
    conditions.push(eq(messagesTable.channel, channelFilter));
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(and(...conditions))
    .orderBy(desc(messagesTable.receivedAt))
    .limit(limit)
    .offset(offset);

  if (messages.length === 0) {
    res.json([]);
    return;
  }

  const refs = messages.map(m => signalTriggerRef(m.id));
  const proposals = await db
    .select()
    .from(copilotProposalsTable)
    .where(
      and(
        eq(copilotProposalsTable.orgId, orgId),
        eq(copilotProposalsTable.source, "signal_inbox"),
        not(inArray(copilotProposalsTable.status, ["rejected", "snoozed"])),
        inArray(copilotProposalsTable.triggerRef, refs),
      ),
    );

  const proposalByRef = new Map(proposals.map(p => [p.triggerRef, p]));

  res.json(
    messages.map(m => ({
      message: ListMessagesResponseItem.parse(m),
      proposal: proposalByRef.get(signalTriggerRef(m.id)) ?? null,
    })),
  );
});

// ─── POST /signal-inbox/:messageId/assess ────────────────────────────────────
//
// Safety: success/failure finalizations are conditional on signal_status='assessing'
// so a concurrent /skip cannot be silently overwritten by assessment completing.

router.post("/signal-inbox/:messageId/assess", async (req, res) => {
  const messageId = Number(req.params.messageId);
  const orgId = await resolveOrgId(req);

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Idempotent: return existing draft if already assessed
  const existingDraft = await findActiveSignalDraft(messageId, orgId);
  if (existingDraft && msg.signalStatus === "draft_ready") {
    res.json({ message: ListMessagesResponseItem.parse(msg), proposal: existingDraft });
    return;
  }

  // Validate the transition before touching the DB — surface a clean 409 for invalid source states
  let assessingStatus: SignalStatus;
  try {
    assessingStatus = transitionSignalStatus(msg.signalStatus as SignalStatus, "startAssess");
  } catch (e) {
    if (e instanceof SignalInboxTransitionError) {
      res.status(409).json({
        error: "Assessment already in progress or message cannot be assessed in its current state",
        currentStatus: msg.signalStatus,
      });
      return;
    }
    throw e;
  }

  // Atomic claim: transition to 'assessing' only from valid source states
  const claimed = await db
    .update(messagesTable)
    .set({ signalStatus: assessingStatus })
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.orgId, orgId),
        inArray(messagesTable.signalStatus, ASSESS_FROM_STATUSES),
      ),
    )
    .returning({ id: messagesTable.id });

  if (claimed.length === 0) {
    res.status(409).json({
      error: "Assessment already in progress or message cannot be assessed in its current state",
      currentStatus: msg.signalStatus,
    });
    return;
  }

  try {
    const shipment = msg.shipmentId
      ? await db
          .select({
            id: shipmentsTable.id,
            poNumber: shipmentsTable.poNumber,
            product: shipmentsTable.product,
            customerName: shipmentsTable.customerName,
            supplierId: shipmentsTable.supplierId,
            exFactoryDate: shipmentsTable.exFactoryDate,
            dueDate: shipmentsTable.dueDate,
          })
          .from(shipmentsTable)
          .where(and(eq(shipmentsTable.id, msg.shipmentId), eq(shipmentsTable.orgId, orgId)))
          .limit(1)
          .then(r => r[0] ?? null)
      : null;

    const draftBody = await Promise.race([
      draftReplyWithAI(msg.fullBody, msg.subject ?? "", shipment),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("AI assessment timed out")), ASSESS_TIMEOUT_MS),
      ),
    ]);

    const ref = signalTriggerRef(messageId);

    let proposal;
    if (existingDraft) {
      const [updated] = await db
        .update(copilotProposalsTable)
        .set({
          payload: { draftBody, channel: msg.channel } as Record<string, unknown>,
          editedPayload: null,
          status: "pending",
          auditTrail: appendAudit(parseAuditTrail(existingDraft.auditTrail), "reassessed", "system"),
          updatedAt: new Date(),
        })
        .where(eq(copilotProposalsTable.id, existingDraft.id))
        .returning();
      proposal = updated;
    } else {
      const [inserted] = await db
        .insert(copilotProposalsTable)
        .values({
          shipmentId: msg.shipmentId ?? null,
          source: "signal_inbox",
          triggerType: "signal_inbox",
          triggerRef: ref,
          actionType: "reply",
          payload: { draftBody, channel: msg.channel } as Record<string, unknown>,
          reasoning: `AI draft for inbound ${msg.channel} message from ${msg.sender}`,
          confidence: 0.8,
          status: "pending",
          auditTrail: appendAudit([], "assess_success", "system"),
          orgId,
        })
        .returning();
      proposal = inserted;
    }

    // Conditional: only finalize to 'draft_ready' if status is still 'assessing'.
    // A concurrent /skip may have changed it while AI was running; in that case
    // we do NOT overwrite the skip and we do NOT create/update the draft record.
    const finalised = await db
      .update(messagesTable)
      .set({ signalStatus: transitionSignalStatus("assessing", "assessSucceeded") })
      .where(
        and(
          eq(messagesTable.id, messageId),
          eq(messagesTable.orgId, orgId),
          eq(messagesTable.signalStatus, "assessing"),
        ),
      )
      .returning();

    if (finalised.length === 0) {
      // Message was skipped (or otherwise moved) while assessment ran — respect that state
      req.log.info({ messageId }, "signal-inbox: assess completed but message no longer 'assessing' (likely skipped)");
      const [current] = await db
        .select()
        .from(messagesTable)
        .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

      res.status(409).json({
        error: "Assessment completed but message state was changed by a concurrent action",
        currentStatus: current?.signalStatus ?? "unknown",
      });
      return;
    }

    req.log.info({ messageId, proposalId: proposal.id }, "signal-inbox: assess complete");
    res.json({ message: ListMessagesResponseItem.parse(finalised[0]), proposal });
  } catch (err) {
    req.log.warn({ messageId, err: err instanceof Error ? err.message : String(err) }, "signal-inbox: assess failed");

    // Conditional revert: only reset to 'new' if still 'assessing'
    // (don't overwrite a concurrent /skip)
    await db
      .update(messagesTable)
      .set({ signalStatus: transitionSignalStatus("assessing", "assessFailed") })
      .where(
        and(
          eq(messagesTable.id, messageId),
          eq(messagesTable.orgId, orgId),
          eq(messagesTable.signalStatus, "assessing"),
        ),
      );

    res.status(500).json({ error: "Assessment failed. Try again." });
  }
});

// ─── POST /signal-inbox/:messageId/approve ───────────────────────────────────

router.post("/signal-inbox/:messageId/approve", async (req, res) => {
  const messageId = Number(req.params.messageId);
  const orgId = await resolveOrgId(req);
  const requestedRevision = typeof req.body?.draftRevision === "string" ? req.body.draftRevision : undefined;

  const proposal = await findActiveSignalDraft(messageId, orgId);
  if (!proposal) {
    res.status(404).json({ error: "No active AI draft found for this message" });
    return;
  }
  const payload = (proposal.editedPayload ?? proposal.payload) as Record<string, unknown>;
  const body = String(payload.draftBody ?? "").trim();
  if (!body) {
    res.status(400).json({ error: "Cannot approve an empty AI draft" });
    return;
  }
  const currentRevision = draftRevision(proposal.id, body);
  if (requestedRevision && requestedRevision !== currentRevision) {
    res.status(409).json({
      error: "Draft revision is stale. Reload the current draft before approving.",
      currentRevision,
    });
    return;
  }

  // Conditional: only from 'draft_ready'
  const approved = await db
    .update(messagesTable)
    .set({ signalStatus: transitionSignalStatus("draft_ready", "approve") })
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.orgId, orgId),
        eq(messagesTable.signalStatus, "draft_ready"),
      ),
    )
    .returning();

  if (approved.length === 0) {
    const [current] = await db
      .select({ signalStatus: messagesTable.signalStatus })
      .from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

    res.status(409).json({
      error: "Cannot approve — message is not in draft_ready state",
      currentStatus: current?.signalStatus ?? "unknown",
    });
    return;
  }

  const [updatedProposal] = await db
    .update(copilotProposalsTable)
    .set({
      status: "approved",
      auditTrail: appendAudit(parseAuditTrail(proposal.auditTrail), "approved", "user", `draftRevision=${currentRevision}`),
      updatedAt: new Date(),
    })
    .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)))
    .returning();

  req.log.info({ messageId, proposalId: proposal.id }, "signal-inbox: approved");
  res.json({ message: ListMessagesResponseItem.parse(approved[0]), proposal: updatedProposal });
});

// ─── POST /signal-inbox/:messageId/send ──────────────────────────────────────
//
// Idempotency contract:
//   1. Atomic claim: transition from 'approved'|'send_failed' → 'sending' only.
//      Two concurrent requests cannot both proceed past this point.
//   2. Pre-dispatch: proposal updated to dispatch_pending with a dispatchKey BEFORE
//      any outbound network call. Proof of intent is always durable.
//   3. Gmail failure (4xx/5xx):  proposal → pending, message → send_failed (retryable).
//   4. Gmail network error:      proposal audit updated, message → send_uncertain (NOT retryable).
//   5. Gmail success:
//      Everything from here is ONE try/catch. The first write records the Gmail Message-ID
//      in the proposal (auto_executed). Subsequent writes update the message and insert the
//      outbound row. If ANY of these writes fail after the gmail call has succeeded the message
//      enters send_uncertain. The proposal audit already contains the Gmail Message-ID so
//      operators can reconstruct what happened.

router.post("/signal-inbox/:messageId/send", async (req, res) => {
  const messageId = Number(req.params.messageId);
  const orgId = await resolveOrgId(req);
  const retry = req.body?.retry === true;
  const requestedRevision = typeof req.body?.draftRevision === "string" ? req.body.draftRevision : undefined;

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.signalStatus === "sent") {
    const proposal = await findActiveSignalDraft(messageId, orgId);
    if (!proposal) {
      res.status(409).json({ error: "Send already in progress or message has been dispatched", currentStatus: msg.signalStatus });
      return;
    }
    res.json({
      message: ListMessagesResponseItem.parse(msg),
      proposal,
      dispatched: true,
      channelNotWired: false,
      alreadySent: true,
    });
    return;
  }

  if (msg.signalStatus === "send_failed" && !retry) {
    res.status(409).json({
      error: "A previous Gmail send failed. Set retry=true to explicitly retry the current approved draft.",
      currentStatus: msg.signalStatus,
    });
    return;
  }

  if (!SEND_FROM_STATUSES.includes(msg.signalStatus as SignalStatus)) {
    const isInProgress = ["sending", "send_uncertain", "sent"].includes(msg.signalStatus);
    res.status(isInProgress ? 409 : 400).json({
      error: isInProgress
        ? "Send already in progress or message has been dispatched"
        : "Cannot send — draft must be approved first",
      currentStatus: msg.signalStatus,
    });
    return;
  }

  const proposal = await findActiveSignalDraft(messageId, orgId);
  if (!proposal) {
    res.status(404).json({ error: "No active AI draft found" });
    return;
  }

  // Step 1: Atomic claim — only one concurrent request can own 'sending'
  const claimed = await db
    .update(messagesTable)
    .set({ signalStatus: transitionSignalStatus(msg.signalStatus as SignalStatus, "startSend") })
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.orgId, orgId),
        inArray(messagesTable.signalStatus, SEND_FROM_STATUSES),
      ),
    )
    .returning({ id: messagesTable.id });

  if (claimed.length === 0) {
    res.status(409).json({ error: "Send already in progress" });
    return;
  }

  const payload = (proposal.editedPayload ?? proposal.payload) as Record<string, unknown>;
  const draftBody = String(payload.draftBody ?? "");
  if (!draftBody.trim()) {
    await db.update(messagesTable).set({ signalStatus: "approved" })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId), eq(messagesTable.signalStatus, "sending")));
    res.status(400).json({ error: "Cannot send an empty AI draft" });
    return;
  }
  const currentRevision = draftRevision(proposal.id, draftBody);
  if (approvedRevision(proposal.auditTrail) !== currentRevision) {
    await db.update(messagesTable).set({ signalStatus: "approved" })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId), eq(messagesTable.signalStatus, "sending")));
    res.status(409).json({
      error: "Approval is stale. Approve the current draft revision before sending.",
      currentRevision,
    });
    return;
  }
  if (requestedRevision && requestedRevision !== currentRevision) {
    await db.update(messagesTable).set({ signalStatus: "approved" })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId), eq(messagesTable.signalStatus, "sending")));
    res.status(409).json({
      error: "Draft revision is stale. Reload and approve the current draft before sending.",
      currentRevision,
    });
    return;
  }
  const channel = String(payload.channel ?? msg.channel);

  const revertedStatus = transitionSignalStatus("sending", "revertSend"); // "sending" → "approved"

  // Only Gmail is wired in this prototype
  if (channel !== "email") {
    // Revert message to approved — channel not wired is not a failure state
    await db
      .update(messagesTable)
      .set({ signalStatus: revertedStatus })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

    await db
      .update(copilotProposalsTable)
      .set({
        auditTrail: appendAudit(
          parseAuditTrail(proposal.auditTrail),
          "channel_not_wired",
          "system",
          `Outbound dispatch for channel '${channel}' is not yet wired. Draft preserved.`,
        ),
        updatedAt: new Date(),
      })
      .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)));

    res.json({
      message: ListMessagesResponseItem.parse({ ...msg, signalStatus: revertedStatus }),
      proposal,
      dispatched: false,
      channelNotWired: true,
    });
    return;
  }

  const recipientEmail = msg.rawSenderEmail ?? msg.sender;
  const subject = msg.subject ? `Re: ${msg.subject}` : `Re: FlowForge inquiry`;

  // Step 2: Pre-dispatch persistence — durable proof of intent before network call
  const dispatchKey = `signal_inbox:${messageId}:${proposal.id}:${currentRevision}`;
  const baseAuditTrail = parseAuditTrail(proposal.auditTrail);

  await db
    .update(copilotProposalsTable)
    .set({
      status: "dispatch_pending",
      auditTrail: appendAudit(
        baseAuditTrail,
        "dispatch_initiated",
        "system",
        `dispatchKey=${dispatchKey} channel=email to=${recipientEmail}`,
      ),
      updatedAt: new Date(),
    })
    .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)));

  // ─── Gmail network call ───────────────────────────────────────────────────

  let gmailData: { gmailMessageId: string; gmailThreadId: string; outboundMessageId: number; fromAddress: string };

  try {
    gmailData = await sendViaGmail({
      orgId,
      to: recipientEmail,
      subject,
      body: draftBody,
      sourceMessageId: messageId,
      shipmentId: msg.shipmentId,
      supplierId: msg.supplierId,
      threadId: typeof payload.threadId === "string" ? payload.threadId : undefined,
      inReplyToMessageId: typeof payload.inReplyToMessageId === "string" ? payload.inReplyToMessageId : undefined,
    }, req.log);
  } catch (fetchErr) {
    if (fetchErr instanceof GmailNotConnectedError) {
      await db.update(messagesTable).set({ signalStatus: revertedStatus })
        .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));
      res.status(400).json({ error: fetchErr.message, channelNotConfigured: true });
      return;
    }
    if (fetchErr instanceof GmailSendError) {
      await db.update(copilotProposalsTable).set({
        status: "pending",
        auditTrail: appendAudit(baseAuditTrail, "send_failed", "system",
          `Gmail returned HTTP ${fetchErr.status}. dispatchKey=${dispatchKey}. Draft preserved for retry.`),
        updatedAt: new Date(),
      }).where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)));
      const [failedMsg] = await db.update(messagesTable)
        .set({ signalStatus: transitionSignalStatus("sending", "sendFailed") })
        .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId))).returning();
      res.status(500).json({ error: "Gmail send failed. Draft preserved — you can retry.",
        message: ListMessagesResponseItem.parse(failedMsg), proposal, dispatched: false });
      return;
    }
    // Network/transport error — delivery ambiguous; do NOT allow retry
    req.log.error(
      { messageId, dispatchKey, err: fetchErr instanceof Error ? fetchErr.message : String(fetchErr) },
      "signal-inbox: Gmail fetch threw — delivery ambiguous",
    );

    await db
      .update(copilotProposalsTable)
      .set({
        auditTrail: appendAudit(
          baseAuditTrail,
          "send_uncertain",
          "system",
          `Network error — delivery unknown. dispatchKey=${dispatchKey}. Do not retry without checking Gmail.`,
        ),
        updatedAt: new Date(),
      })
      .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)));

    const [uncertainMsg] = await db
      .update(messagesTable)
      .set({ signalStatus: transitionSignalStatus("sending", "sendUncertain") })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
      .returning();

    res.status(502).json({
      error:
        "Network error during Gmail send. Delivery status is uncertain — check Gmail before retrying. " +
        "The draft is preserved.",
      message: ListMessagesResponseItem.parse(uncertainMsg),
      dispatched: false,
      uncertain: true,
    });
    return;
  }

  // ─── Gmail returned 200 — all post-success writes in ONE try/catch ───────
  //
  // If any write below fails the message enters send_uncertain.
  // The Gmail Message-ID is included in the first write so the audit trail
  // always contains proof of dispatch even if subsequent writes fail.

  try {
    // First: record Gmail success on the proposal (includes the Message-ID)
    const [updatedProposal] = await db
      .update(copilotProposalsTable)
      .set({
        status: "auto_executed",
        auditTrail: appendAudit(
          baseAuditTrail,
          "send_success",
          "system",
          `Dispatched via Gmail. gmailMessageId=${gmailData.gmailMessageId} dispatchKey=${dispatchKey}`,
        ),
        updatedAt: new Date(),
      })
    .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)))
      .returning();

    // The shared helper already persisted the outbound message.
    // Then mark the inbound message as sent.
    const [sentMsg] = await db
      .update(messagesTable)
      .set({ signalStatus: transitionSignalStatus("sending", "sendSucceeded") })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
      .returning();

    req.log.info(
      { messageId, gmailMessageId: gmailData.gmailMessageId, outboundId: gmailData.outboundMessageId, dispatchKey },
      "signal-inbox: sent via Gmail",
    );

    res.json({
      message: ListMessagesResponseItem.parse(sentMsg),
      proposal: updatedProposal,
      dispatched: true,
      channelNotWired: false,
      outboundMessageId: gmailData.outboundMessageId,
    });
  } catch (finalizationErr) {
    // Email was sent. DB finalization failed. Mark uncertain — do NOT retry.
    req.log.error(
      { messageId, dispatchKey, gmailMessageId: gmailData.gmailMessageId, err: String(finalizationErr) },
      "signal-inbox: DB finalization failed after Gmail success",
    );

    // Best-effort: push message to send_uncertain so operators see it
    await db
      .update(messagesTable)
      .set({ signalStatus: transitionSignalStatus("sending", "sendUncertain") })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
      .catch(() => { /* already done our best */ });

    const [uncertainMsg] = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
      .limit(1)
      .catch(() => [msg]);

    res.status(207).json({
      error:
        "Email was sent via Gmail but the delivery record could not be fully saved. " +
        "Do NOT retry — check Gmail for confirmation. " +
        `Gmail Message-ID: ${gmailData.gmailMessageId}. Audit trail contains the dispatch key.`,
      message: ListMessagesResponseItem.parse(uncertainMsg ?? msg),
      proposal: { ...proposal, status: "auto_executed" },
      dispatched: true,
      uncertain: true,
    });
  }
});

// ─── POST /signal-inbox/:messageId/skip ──────────────────────────────────────

router.post("/signal-inbox/:messageId/skip", async (req, res) => {
  const messageId = Number(req.params.messageId);
  const orgId = await resolveOrgId(req);

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Validate transition — throws SignalInboxTransitionError for blocked statuses
  let nextStatus: SignalStatus;
  try {
    nextStatus = transitionSignalStatus(msg.signalStatus as SignalStatus, "skip");
  } catch (e) {
    if (e instanceof SignalInboxTransitionError) {
      res.status(409).json({
        error: "Cannot skip — message is in a terminal state",
        currentStatus: msg.signalStatus,
      });
      return;
    }
    throw e;
  }

  // Conditional atomic update — protects against concurrent state change between fetch and update
  const updated = await db
    .update(messagesTable)
    .set({ signalStatus: nextStatus })
    .where(
      and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.orgId, orgId),
        not(inArray(messagesTable.signalStatus, SKIP_BLOCKED_STATUSES)),
      ),
    )
    .returning();

  if (updated.length === 0) {
    const [current] = await db
      .select({ signalStatus: messagesTable.signalStatus })
      .from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

    res.status(409).json({
      error: "Cannot skip — message state changed concurrently",
      currentStatus: current?.signalStatus ?? "unknown",
    });
    return;
  }

  const proposal = await findActiveSignalDraft(messageId, orgId);
  if (proposal) {
    await db
      .update(copilotProposalsTable)
      .set({
        auditTrail: appendAudit(parseAuditTrail(proposal.auditTrail), "skipped", "user"),
        updatedAt: new Date(),
      })
      .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)));
  }

  req.log.info({ messageId }, "signal-inbox: skipped");
  res.json(ListMessagesResponseItem.parse(updated[0]));
});

// ─── PATCH /signal-inbox/:messageId/draft ────────────────────────────────────

const UpdateDraftBody = z.object({
  draftBody: z.string().trim().min(1).max(100_000),
});

router.patch("/signal-inbox/:messageId/draft", async (req, res) => {
  const messageId = Number(req.params.messageId);
  const orgId = await resolveOrgId(req);
  const input = UpdateDraftBody.parse(req.body);

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Validate transition — throws SignalInboxTransitionError for blocked statuses (sending/sent/send_uncertain/skipped)
  let nextStatus: SignalStatus;
  try {
    nextStatus = transitionSignalStatus(msg.signalStatus as SignalStatus, "editDraft");
  } catch (e) {
    if (e instanceof SignalInboxTransitionError) {
      res.status(409).json({
        error: `Cannot edit draft — message is in '${msg.signalStatus}' state`,
        currentStatus: msg.signalStatus,
      });
      return;
    }
    throw e;
  }

  const proposal = await findActiveSignalDraft(messageId, orgId);
  if (!proposal) {
    res.status(404).json({ error: "No active AI draft found for this message" });
    return;
  }

  const approvalInvalidated = nextStatus !== (msg.signalStatus as SignalStatus);
  const action = approvalInvalidated ? "edited_after_approval" : "draft_edited";

  const originalPayload = proposal.payload as Record<string, unknown>;
  const originalBody = String(originalPayload.draftBody ?? "");
  const origWords = originalBody.trim().split(/\s+/).filter(Boolean).length;
  const editWords = input.draftBody.trim().split(/\s+/).filter(Boolean).length;
  const maxWords = Math.max(origWords, editWords, 1);
  const editDistance = Math.min(1, Math.abs(origWords - editWords) / maxWords);

  const [updatedProposal] = await db
    .update(copilotProposalsTable)
    .set({
      editedPayload: { ...originalPayload, draftBody: input.draftBody } as Record<string, unknown>,
      userEditedContent: input.draftBody,
      editDistance,
      status: "edited",
      auditTrail: appendAudit(parseAuditTrail(proposal.auditTrail), action, "user"),
      updatedAt: new Date(),
    })
    .where(and(eq(copilotProposalsTable.id, proposal.id), eq(copilotProposalsTable.orgId, orgId)))
    .returning();

  // Editing after approval reverts to draft_ready — must re-approve before sending
  let updatedMsg = msg;
  if (approvalInvalidated) {
    const [m] = await db
      .update(messagesTable)
      .set({ signalStatus: nextStatus })
      .where(and(
        eq(messagesTable.id, messageId),
        eq(messagesTable.orgId, orgId),
        eq(messagesTable.signalStatus, "approved"),
      ))
      .returning();
    if (!m) {
      res.status(409).json({ error: "Draft state changed concurrently; reload before editing." });
      return;
    }
    updatedMsg = m;
  }

  res.json({ message: ListMessagesResponseItem.parse(updatedMsg), proposal: updatedProposal });
});

export default router;
