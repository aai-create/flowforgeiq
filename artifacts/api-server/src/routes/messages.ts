import { Router, type IRouter } from "express";
import { db, messagesTable, suppliersTable, shipmentsTable, buyerEmailsTable, teamUsersTable, pushTokensTable, contactRoutingRulesTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import { sendExpoPushNotifications } from "../lib/pushNotifications";
import {
  ListMessagesResponseItem,
  CreateMessageBody,
  UpdateMessageBody,
  UpdateMessageResponse,
} from "@workspace/api-zod";
import { z } from "zod/v4";
import { ingestDocumentFromBase64 } from "./webhooks";
import { sendViaGmail, GmailNotConnectedError, GmailSendError } from "../lib/gmailSend";
import { normaliseChat } from "../lib/chatNormalise";
import { extractFromChatText } from "../lib/extraction";
import { deterministicShipmentMatch, triageInboundEmail } from "../lib/inbound-triage";

const router: IRouter = Router();

router.get("/messages", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const flaggedParam = req.query["isFlagged"];
  let rows = await db.select().from(messagesTable).where(eq(messagesTable.orgId, orgId)).orderBy(desc(messagesTable.receivedAt));
  if (flaggedParam === "true") {
    rows = rows.filter(r => r.isFlagged);
  }
  rows = rows.filter(r => r.routingStatus !== "needs-review");
  res.json(rows.map(r => ListMessagesResponseItem.parse(r)));
});

router.get("/messages/needs-review", async (req, res) => {
  const orgId = await resolveOrgId(req);

  const rows = await db
    .select({
      message: messagesTable,
      routedToUserName: teamUsersTable.name,
      inactiveRuleFromEmail: contactRoutingRulesTable.fromEmail,
      inactiveRuleShipmentId: contactRoutingRulesTable.shipmentId,
      inactiveRulePoNumber: shipmentsTable.poNumber,
    })
    .from(messagesTable)
    .leftJoin(teamUsersTable, eq(messagesTable.routedToClerkUserId, teamUsersTable.clerkUserId))
    .leftJoin(
      contactRoutingRulesTable,
      and(
        eq(contactRoutingRulesTable.orgId, orgId),
        eq(contactRoutingRulesTable.active, false),
        sql`lower(${messagesTable.rawSenderEmail}) = lower(${contactRoutingRulesTable.fromEmail})`,
      ),
    )
    .leftJoin(shipmentsTable, eq(contactRoutingRulesTable.shipmentId, shipmentsTable.id))
    .where(and(eq(messagesTable.routingStatus, "needs-review"), eq(messagesTable.orgId, orgId)))
    .orderBy(desc(messagesTable.receivedAt));

  res.json(
    rows.map(r =>
      ListMessagesResponseItem.parse({
        ...r.message,
        routedToUserName: r.routedToUserName ?? null,
        inactiveContactRule:
          r.inactiveRuleFromEmail != null && r.inactiveRulePoNumber != null
            ? {
                fromEmail: r.inactiveRuleFromEmail,
                oldPoNumber: r.inactiveRulePoNumber,
                oldShipmentId: r.inactiveRuleShipmentId,
              }
            : null,
      }),
    ),
  );
});

router.post("/messages", async (req, res) => {
  const input = CreateMessageBody.parse(req.body);
  const orgId = await resolveOrgId(req);
  const [inserted] = await db
    .insert(messagesTable)
    .values({
      shipmentId: input.shipmentId,
      supplierId: input.supplierId ?? null,
      sender: input.sender,
      recipient: input.recipient ?? null,
      channel: input.channel,
      subject: input.subject ?? null,
      direction: input.direction ?? "inbound",
      snippet: input.snippet,
      fullBody: input.fullBody,
      aiDraft: input.aiDraft ?? "",
      aiAction: input.aiAction ?? "",
      aiTags: input.aiTags ?? [],
      unread: false,
      isFlagged: false,
      routingStatus: (input.routingStatus as "routed" | "needs-review" | undefined) ?? "routed",
      routingConfidence: input.routingConfidence ?? null,
      matchMethod: input.matchMethod ?? null,
      rawChatText: input.rawChatText ?? null,
      receivedAt: new Date(),
      orgId,
    })
    .returning();

  if ((input.direction ?? "inbound") === "inbound") {
    setImmediate(async () => {
      try {
        const tokenRows = await db
          .select({ expoPushToken: pushTokensTable.expoPushToken })
          .from(pushTokensTable)
          .where(eq(pushTokensTable.orgId, orgId));
        const tokens = tokenRows.map((r) => r.expoPushToken);
        if (tokens.length === 0) return;

        const routingStatus = inserted.routingStatus ?? "routed";
        const confidence = inserted.routingConfidence ?? 0;
        const HIGH_CONFIDENCE_THRESHOLD = Number(process.env.CHAT_ROUTING_THRESHOLD ?? "0.65");
        const isHighConfidenceRouted =
          routingStatus === "routed" && confidence >= HIGH_CONFIDENCE_THRESHOLD && inserted.shipmentId != null;

        if (isHighConfidenceRouted) {
          const poRow = inserted.shipmentId
            ? await db
                .select({ poNumber: shipmentsTable.poNumber })
                .from(shipmentsTable)
                .where(eq(shipmentsTable.id, inserted.shipmentId))
                .then((r) => r[0] ?? null)
            : null;
          const poLabel = poRow ? `PO ${poRow.poNumber}` : "a shipment";
          await sendExpoPushNotifications(
            tokens,
            `Message auto-routed to ${poLabel}`,
            `From ${inserted.sender ?? "Unknown"}: ${(inserted.snippet ?? "").slice(0, 80)}`,
            { type: "message-routed", messageId: inserted.id, shipmentId: inserted.shipmentId },
            req.log,
          );
        } else {
          const channel = input.channel ?? "message";
          const sender = inserted.sender ?? "Unknown";
          const snippet = (inserted.snippet ?? "").slice(0, 80);
          await sendExpoPushNotifications(
            tokens,
            `New ${channel} from ${sender}`,
            snippet || "New inbound message",
            { type: "message", messageId: inserted.id, shipmentId: inserted.shipmentId ?? null },
            req.log,
          );
        }
      } catch (err) {
        req.log.warn({ err }, "messages-post: push notification error");
      }
    });
  }

  if (
    input.channel === "whatsapp" &&
    input.attachmentBase64 &&
    input.attachmentMimeType
  ) {
    const fileName = input.attachmentName ?? `whatsapp-media-${Date.now()}`;
    setImmediate(async () => {
      await ingestDocumentFromBase64({
        fileName,
        mimeType: input.attachmentMimeType!,
        base64Content: input.attachmentBase64!,
        sourceChannel: "whatsapp",
        orgId,
      });
    });
  }

  res.status(201).json(ListMessagesResponseItem.parse(inserted));
});

router.delete("/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const [deleted] = await db.delete(messagesTable).where(and(eq(messagesTable.id, id), eq(messagesTable.orgId, orgId))).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});

router.patch("/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const input = UpdateMessageBody.parse(req.body);
  const [updated] = await db.update(messagesTable).set(input).where(and(eq(messagesTable.id, id), eq(messagesTable.orgId, orgId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateMessageResponse.parse(updated));
});

const AssignBody = z.object({
  buyerName: z.string().min(1),
  shipmentId: z.number().int().positive(),
});

router.patch("/messages/:id/assign", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const input = AssignBody.parse(req.body);

  const [msg] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, id), eq(messagesTable.orgId, orgId)));
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [updated] = await db
    .update(messagesTable)
    .set({
      shipmentId: input.shipmentId,
      routingStatus: "routed",
    })
    .where(and(eq(messagesTable.id, id), eq(messagesTable.orgId, orgId)))
    .returning();

  if (msg.rawSenderEmail) {
    await db
      .insert(buyerEmailsTable)
      .values({
        senderEmail: msg.rawSenderEmail.toLowerCase(),
        buyerName: input.buyerName,
        confirmed: true,
        orgId,
      })
      .onConflictDoUpdate({
        target: [buyerEmailsTable.orgId, buyerEmailsTable.senderEmail],
        set: {
          buyerName: input.buyerName,
          confirmed: true,
          updatedAt: new Date(),
        },
      });
    req.log.info(
      { senderEmail: msg.rawSenderEmail, buyerName: input.buyerName },
      "messages-assign: saved buyer_email mapping",
    );
  }

  res.json(ListMessagesResponseItem.parse(updated));
});

const SendReplyBody = z.object({
  body: z.string().min(1),
  subject: z.string().optional(),
  to: z.string().optional(),
});

router.post("/messages/:id/send-reply", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const input = SendReplyBody.parse(req.body);

  const [msg] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, id), eq(messagesTable.orgId, orgId)));
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const recipientEmail = input.to ?? msg.rawSenderEmail ?? msg.sender;
  const subject = input.subject ?? (msg.subject ? `Re: ${msg.subject}` : `Re: FlowForge inquiry`);
  try {
    const result = await sendViaGmail({
      orgId,
      to: recipientEmail,
      subject,
      body: input.body,
      sourceMessageId: id,
       ...(msg.gmailThreadId ? { threadId: msg.gmailThreadId } : {}),
       ...(msg.gmailMessageId ? { inReplyToMessageId: msg.gmailMessageId } : {}),
      shipmentId: msg.shipmentId,
      supplierId: msg.supplierId,
    }, req.log);
    const [outbound] = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.id, result.outboundMessageId), eq(messagesTable.orgId, orgId)));
    res.status(201).json(ListMessagesResponseItem.parse(outbound));
  } catch (err) {
    if (err instanceof GmailNotConnectedError) {
      res.status(err.reason === "not_connected" ? 400 : 401).json({ error: err.message });
      return;
    }
    if (err instanceof GmailSendError) {
      res.status(500).json({ error: "Gmail send failed", details: err.detail });
      return;
    }
    throw err;
  }
});

const CHAT_ROUTING_THRESHOLD = 0.65;

const IngestChatBody = z.object({
  rawText: z.string().min(1),
  channel: z.enum(["whatsapp", "wechat", "imessage", "sms", "email", "other"]),
  senderHint: z.string().optional(),
});

router.post("/messages/ingest-chat", async (req, res) => {
  const input = IngestChatBody.parse(req.body);

  const normalised = normaliseChat(input.rawText, input.channel, input.senderHint);
  const contentTriage = triageInboundEmail("", normalised.fullText);

  const orgId = await resolveOrgId(req);
  const shipmentRows = await db
    .select({
      id: shipmentsTable.id,
      poNumber: shipmentsTable.poNumber,
      product: shipmentsTable.product,
      customerName: shipmentsTable.customerName,
      supplierName: suppliersTable.name,
      status: shipmentsTable.status,
      currentStageId: shipmentsTable.currentStageId,
    })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .where(eq(shipmentsTable.orgId, orgId));

  const directShipmentId = deterministicShipmentMatch("", contentTriage.normalizedBody, shipmentRows);
  const extracted = directShipmentId !== null
    ? {
        shipmentId: directShipmentId,
        confidence: 1,
        matchMethod: "po-reference",
        extractedFields: {},
        aiDraft: "",
        aiAction: "",
        aiTags: [],
      }
    : await extractFromChatText(
        contentTriage.normalizedBody,
        shipmentRows,
        normalised.primarySender,
        {
          orgId,
          workflow: "chat_ingestion",
          event: "manual_chat_ingestion",
          correlationId: req.header("x-request-id") ?? undefined,
        },
      );

  const routingStatus =
    extracted.confidence >= CHAT_ROUTING_THRESHOLD && extracted.shipmentId != null
      ? "routed"
      : "needs-review";

  const snippet = contentTriage.normalizedBody.slice(0, 200);

  req.log.info(
    { channel: input.channel, confidence: extracted.confidence, routingStatus, shipmentId: extracted.shipmentId },
    "ingest-chat: processed",
  );

  res.status(200).json({
    routingStatus,
    shipmentId: extracted.shipmentId ?? null,
    supplierId: null,
    confidence: extracted.confidence,
    matchMethod: extracted.matchMethod,
    extractedFields: extracted.extractedFields,
    sender: normalised.primarySender,
    snippet,
    fullBody: input.rawText,
    normalizedBody: contentTriage.normalizedBody,
    normalizationVersion: contentTriage.normalizationVersion,
    aiDraft: extracted.aiDraft,
    aiAction: extracted.aiAction,
    aiTags: extracted.aiTags,
  });
});

export default router;
