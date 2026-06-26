import { Router, type IRouter } from "express";
import { db, messagesTable, suppliersTable, shipmentsTable, buyerEmailsTable, gmailCredentialsTable, teamUsersTable, pushTokensTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
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
import { buildRawEmail, getValidAccessToken } from "./integrations";
import { normaliseChat } from "../lib/chatNormalise";
import { extractFromChatText } from "../lib/extraction";

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
    })
    .from(messagesTable)
    .leftJoin(teamUsersTable, eq(messagesTable.routedToClerkUserId, teamUsersTable.clerkUserId))
    .where(and(eq(messagesTable.routingStatus, "needs-review"), eq(messagesTable.orgId, orgId)))
    .orderBy(desc(messagesTable.receivedAt));
  res.json(rows.map(r => ListMessagesResponseItem.parse({ ...r.message, routedToUserName: r.routedToUserName ?? null })));
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

  const [cred] = await db.select().from(gmailCredentialsTable).where(eq(gmailCredentialsTable.orgId, orgId)).limit(1);
  if (!cred) {
    res.status(400).json({ error: "Gmail not connected. Connect your Gmail account in Settings first." });
    return;
  }

  const accessToken = await getValidAccessToken(cred);
  if (!accessToken) {
    res.status(401).json({ error: "Gmail token expired and could not be refreshed. Reconnect Gmail in Settings." });
    return;
  }

  const recipientEmail = input.to ?? msg.rawSenderEmail ?? msg.sender;
  const subject = input.subject ?? (msg.subject ? `Re: ${msg.subject}` : `Re: FlowForge inquiry`);

  const raw = buildRawEmail({
    from: cred.gmailAddress,
    to: recipientEmail,
    subject,
    body: input.body,
  });

  const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!gmailRes.ok) {
    const errText = await gmailRes.text();
    req.log.error({ status: gmailRes.status, body: errText }, "send-reply: Gmail API error");
    res.status(500).json({ error: "Gmail send failed", details: errText });
    return;
  }

  const outbound = await db
    .insert(messagesTable)
    .values({
      shipmentId: msg.shipmentId ?? null,
      supplierId: msg.supplierId ?? null,
      sender: cred.gmailAddress,
      recipient: recipientEmail,
      channel: "gmail",
      subject,
      direction: "outbound",
      snippet: input.body.slice(0, 200),
      fullBody: input.body,
      aiDraft: "",
      aiAction: "",
      aiTags: [],
      unread: false,
      isFlagged: false,
      routingStatus: "routed",
      receivedAt: new Date(),
      orgId,
    })
    .returning();

  req.log.info(
    { from: cred.gmailAddress, to: recipientEmail, messageId: id },
    "send-reply: sent via Gmail",
  );

  res.status(201).json(ListMessagesResponseItem.parse(outbound[0]));
});

const CHAT_ROUTING_THRESHOLD = 0.65;

const IngestChatBody = z.object({
  rawText: z.string().min(1),
  channel: z.enum(["whatsapp", "wechat", "imessage", "sms"]),
  senderHint: z.string().optional(),
});

router.post("/messages/ingest-chat", async (req, res) => {
  const input = IngestChatBody.parse(req.body);

  const normalised = normaliseChat(input.rawText, input.channel, input.senderHint);

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

  const extracted = await extractFromChatText(normalised.fullText, shipmentRows, normalised.primarySender);

  const routingStatus =
    extracted.confidence >= CHAT_ROUTING_THRESHOLD && extracted.shipmentId != null
      ? "routed"
      : "needs-review";

  const snippet = normalised.fullText.replace(/\s+/g, " ").trim().slice(0, 200);

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
    aiDraft: extracted.aiDraft,
    aiAction: extracted.aiAction,
    aiTags: extracted.aiTags,
  });
});

export default router;
