import { Router, type IRouter } from "express";
import { db, messagesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  ListMessagesResponseItem,
  CreateMessageBody,
  UpdateMessageBody,
  UpdateMessageResponse,
} from "@workspace/api-zod";
import { ingestDocumentFromBase64 } from "./webhooks";

const router: IRouter = Router();

router.get("/messages", async (req, res) => {
  const flaggedParam = req.query["isFlagged"];
  let rows = await db.select().from(messagesTable).orderBy(desc(messagesTable.receivedAt));
  if (flaggedParam === "true") {
    rows = rows.filter(r => r.isFlagged);
  }
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

export default router;
