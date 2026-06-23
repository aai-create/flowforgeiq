import { Router, type IRouter } from "express";
import { db, buyersTable, shipmentsTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { ListBuyersResponseItem, UpdateBuyerBody } from "@workspace/api-zod";
import { resolveOrgId } from "../middlewares/requireAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router: IRouter = Router();

router.get("/buyers", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db
    .select()
    .from(buyersTable)
    .where(eq(buyersTable.orgId, orgId))
    .orderBy(asc(buyersTable.name));
  res.json(rows.map(r => ListBuyersResponseItem.parse(r)));
});

router.patch("/buyers/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid buyer id" });
    return;
  }

  const parsed = UpdateBuyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const fields = parsed.data;
  const hasUpdate = Object.keys(fields).some(
    (k) => fields[k as keyof typeof fields] !== undefined,
  );
  if (!hasUpdate) {
    res.status(400).json({ error: "Request body must include at least one field to update" });
    return;
  }

  if (fields.email != null && !EMAIL_RE.test(fields.email)) {
    res.status(400).json({ error: "email must be a valid email address" });
    return;
  }

  if (fields.email != null) {
    fields.email = fields.email.toLowerCase().trim();
  }

  const orgId = await resolveOrgId(req);
  const updated = await db
    .update(buyersTable)
    .set(fields)
    .where(and(eq(buyersTable.id, id), eq(buyersTable.orgId, orgId)))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Buyer not found" });
    return;
  }

  if (fields.name !== undefined) {
    await db
      .update(shipmentsTable)
      .set({ customerName: fields.name })
      .where(and(eq(shipmentsTable.buyerId, id), eq(shipmentsTable.orgId, orgId)));
  }

  res.json(ListBuyersResponseItem.parse(updated[0]));
});

export default router;
