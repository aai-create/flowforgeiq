import { Router, type IRouter } from "express";
import { db, messagesTable, suppliersTable, shipmentsTable, buyerEmailsTable, gmailCredentialsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  ListMessagesResponseItem,
  CreateMessageBody,
  UpdateMessageBody,
  UpdateMessageResponse,
} from "@workspace/api-zod";
import { z } from "zod/v4";
import { ingestDocumentFromBase64 } from "./webhooks";
import { buildRawEmail, getValidAccessToken } from "./integrations";

const router: IRouter = Router();

router.get("/messages", async (req, res) => {
  const flaggedParam = req.query["isFlagged"];
  let rows = await db.select().from(messagesTable).orderBy(desc(messagesTable.receivedAt));
  if (flaggedParam === "true") {
    rows = rows.filter(r => r.isFlagged);
  }
  rows = rows.filter(r => r.routingStatus !== "needs-review");
  res.json(rows.map(r => ListMessagesResponseItem.parse(r)));
});

router.get("/messages/needs-review", async (req, res) => {
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.routingStatus, "needs-review"))
    .orderBy(desc(messagesTable.receivedAt));
  res.json(rows.map(r => ListMessagesResponseItem.parse(r)));
});

router.post("/messages", async (req, res) => {
  const input = CreateMessageBody.parse(req.body);
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
      routingStatus: "routed",
      receivedAt: new Date(),
    })
    .returning();

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
      });
    });
  }

  res.status(201).json(ListMessagesResponseItem.parse(inserted));
});

router.patch("/messages/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdateMessageBody.parse(req.body);
  const [updated] = await db.update(messagesTable).set(input).where(eq(messagesTable.id, id)).returning();
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
  const input = AssignBody.parse(req.body);

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
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
    .where(eq(messagesTable.id, id))
    .returning();

  if (msg.rawSenderEmail) {
    await db
      .insert(buyerEmailsTable)
      .values({
        senderEmail: msg.rawSenderEmail.toLowerCase(),
        buyerName: input.buyerName,
        confirmed: true,
      })
      .onConflictDoUpdate({
        target: buyerEmailsTable.senderEmail,
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
  const input = SendReplyBody.parse(req.body);

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [cred] = await db.select().from(gmailCredentialsTable).limit(1);
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
    })
    .returning();

  req.log.info(
    { from: cred.gmailAddress, to: recipientEmail, messageId: id },
    "send-reply: sent via Gmail",
  );

  res.status(201).json(ListMessagesResponseItem.parse(outbound[0]));
});

export default router;
