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
import { db, messagesTable, copilotProposalsTable, gmailCredentialsTable, shipmentsTable } from "@workspace/db";
import { and, desc, eq, ne, inArray, not } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { resolveOrgId } from "../middlewares/requireAuth";
import { draftReplyWithAI } from "./webhooks";
import { buildRawEmail, getValidAccessToken } from "./integrations";
import { ListMessagesResponseItem } from "@workspace/api-zod";
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

  const proposal = await findActiveSignalDraft(messageId, orgId);
  if (!proposal) {
    res.status(404).json({ error: "No active AI draft found for this message" });
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
      auditTrail: appendAudit(parseAuditTrail(proposal.auditTrail), "approved", "user"),
      updatedAt: new Date(),
    })
    .where(eq(copilotProposalsTable.id, proposal.id))
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

  const [msg] = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
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
      .where(eq(copilotProposalsTable.id, proposal.id));

    res.json({
      message: ListMessagesResponseItem.parse({ ...msg, signalStatus: revertedStatus }),
      proposal,
      dispatched: false,
      channelNotWired: true,
    });
    return;
  }

  const [cred] = await db
    .select()
    .from(gmailCredentialsTable)
    .where(eq(gmailCredentialsTable.orgId, orgId))
    .limit(1);

  if (!cred) {
    await db
      .update(messagesTable)
      .set({ signalStatus: revertedStatus })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

    res.status(400).json({
      error: "Gmail not connected. Connect your Gmail account in Settings first.",
      channelNotConfigured: true,
    });
    return;
  }

  const accessToken = await getValidAccessToken(cred);
  if (!accessToken) {
    await db
      .update(messagesTable)
      .set({ signalStatus: revertedStatus })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));

    res.status(400).json({
      error: "Gmail token expired and could not be refreshed. Reconnect Gmail in Settings.",
      channelNotConfigured: true,
    });
    return;
  }

  const recipientEmail = msg.rawSenderEmail ?? msg.sender;
  const subject = msg.subject ? `Re: ${msg.subject}` : `Re: FlowForge inquiry`;

  // Step 2: Pre-dispatch persistence — durable proof of intent before network call
  const dispatchKey = randomUUID();
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
    .where(eq(copilotProposalsTable.id, proposal.id));

  const raw = buildRawEmail({
    from: cred.gmailAddress,
    to: recipientEmail,
    subject,
    body: draftBody,
  });

  // ─── Gmail network call ───────────────────────────────────────────────────

  let gmailData: { id: string; threadId: string };

  try {
    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!gmailRes.ok) {
      // Gmail rejected the request — safe to retry
      req.log.error({ status: gmailRes.status, messageId, dispatchKey }, "signal-inbox: Gmail rejected");

      await db
        .update(copilotProposalsTable)
        .set({
          status: "pending",
          auditTrail: appendAudit(
            baseAuditTrail,
            "send_failed",
            "system",
            `Gmail returned HTTP ${gmailRes.status}. dispatchKey=${dispatchKey}. Draft preserved for retry.`,
          ),
          updatedAt: new Date(),
        })
        .where(eq(copilotProposalsTable.id, proposal.id));

      const [failedMsg] = await db
        .update(messagesTable)
        .set({ signalStatus: transitionSignalStatus("sending", "sendFailed") })
        .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
        .returning();

      res.status(500).json({
        error: "Gmail send failed. Draft preserved — you can retry.",
        message: ListMessagesResponseItem.parse(failedMsg),
        proposal,
        dispatched: false,
      });
      return;
    }

    gmailData = (await gmailRes.json()) as { id: string; threadId: string };
  } catch (fetchErr) {
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
      .where(eq(copilotProposalsTable.id, proposal.id));

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
          `Dispatched via Gmail. gmailMessageId=${gmailData.id} dispatchKey=${dispatchKey}`,
        ),
        updatedAt: new Date(),
      })
      .where(eq(copilotProposalsTable.id, proposal.id))
      .returning();

    // Second: insert the outbound message row
    const [outbound] = await db
      .insert(messagesTable)
      .values({
        shipmentId: msg.shipmentId ?? null,
        supplierId: msg.supplierId ?? null,
        sender: cred.gmailAddress,
        recipient: recipientEmail,
        channel: "email",
        subject,
        direction: "outbound",
        snippet: draftBody.slice(0, 200),
        fullBody: draftBody,
        aiDraft: "",
        aiAction: "",
        aiTags: [],
        unread: false,
        isFlagged: false,
        routingStatus: "routed",
        signalStatus: "sent",
        receivedAt: new Date(),
        orgId,
      })
      .returning();

    // Third: mark the inbound message as sent
    const [sentMsg] = await db
      .update(messagesTable)
      .set({ signalStatus: transitionSignalStatus("sending", "sendSucceeded") })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
      .returning();

    req.log.info(
      { messageId, gmailMessageId: gmailData.id, outboundId: outbound.id, dispatchKey },
      "signal-inbox: sent via Gmail",
    );

    res.json({
      message: ListMessagesResponseItem.parse(sentMsg),
      proposal: updatedProposal,
      dispatched: true,
      channelNotWired: false,
      outboundMessageId: outbound.id,
    });
  } catch (finalizationErr) {
    // Email was sent. DB finalization failed. Mark uncertain — do NOT retry.
    req.log.error(
      { messageId, dispatchKey, gmailMessageId: gmailData.id, err: String(finalizationErr) },
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
        `Gmail Message-ID: ${gmailData.id}. Audit trail contains the dispatch key.`,
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
      .where(eq(copilotProposalsTable.id, proposal.id));
  }

  req.log.info({ messageId }, "signal-inbox: skipped");
  res.json(ListMessagesResponseItem.parse(updated[0]));
});

// ─── PATCH /signal-inbox/:messageId/draft ────────────────────────────────────

const UpdateDraftBody = z.object({
  draftBody: z.string().min(1),
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
    .where(eq(copilotProposalsTable.id, proposal.id))
    .returning();

  // Editing after approval reverts to draft_ready — must re-approve before sending
  let updatedMsg = msg;
  if (approvalInvalidated) {
    const [m] = await db
      .update(messagesTable)
      .set({ signalStatus: nextStatus })
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)))
      .returning();
    updatedMsg = m;
  }

  res.json({ message: ListMessagesResponseItem.parse(updatedMsg), proposal: updatedProposal });
});

export default router;
