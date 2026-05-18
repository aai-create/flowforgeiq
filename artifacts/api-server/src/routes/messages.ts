import { Router, type IRouter } from "express";
import { db, messagesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  ListMessagesResponseItem,
  CreateMessageBody,
  UpdateMessageBody,
  UpdateMessageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/messages", async (_req, res) => {
  const rows = await db.select().from(messagesTable).orderBy(desc(messagesTable.receivedAt));
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
      channel: input.channel,
      snippet: input.snippet,
      fullBody: input.fullBody,
      aiDraft: input.aiDraft ?? "",
      aiAction: input.aiAction ?? "",
      aiTags: input.aiTags ?? [],
      unread: false,
      receivedAt: new Date(),
    })
    .returning();
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
