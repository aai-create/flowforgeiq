import { Router, type IRouter } from "express";
import { db, suppliersTable, messagesTable } from "@workspace/db";
import { sql, asc, eq } from "drizzle-orm";
import { ListSuppliersResponseItem, UpdateSupplierBody } from "@workspace/api-zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router: IRouter = Router();

router.get("/suppliers", async (_req, res) => {
  const rows = await db
    .select({
      id: suppliersTable.id,
      name: suppliersTable.name,
      country: suppliersTable.country,
      contactEmail: suppliersTable.contactEmail,
      threadCount: sql<number>`count(distinct ${messagesTable.shipmentId})::int`,
    })
    .from(suppliersTable)
    .leftJoin(messagesTable, sql`${messagesTable.supplierId} = ${suppliersTable.id}`)
    .groupBy(suppliersTable.id)
    .orderBy(asc(suppliersTable.name));
  res.json(rows.map(r => ListSuppliersResponseItem.parse(r)));
});

router.patch("/suppliers/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid supplier id" });
    return;
  }

  const parsed = UpdateSupplierBody.safeParse(req.body);
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

  if (fields.contactEmail != null && !EMAIL_RE.test(fields.contactEmail)) {
    res.status(400).json({ error: "contactEmail must be a valid email address" });
    return;
  }

  if (fields.contactEmail != null) {
    fields.contactEmail = fields.contactEmail.toLowerCase().trim();
  }

  const updated = await db
    .update(suppliersTable)
    .set(fields)
    .where(eq(suppliersTable.id, id))
    .returning();

  if (updated.length === 0) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  const supplier = updated[0];
  const [withThreadCount] = await db
    .select({
      id: suppliersTable.id,
      name: suppliersTable.name,
      country: suppliersTable.country,
      contactEmail: suppliersTable.contactEmail,
      threadCount: sql<number>`count(distinct ${messagesTable.shipmentId})::int`,
    })
    .from(suppliersTable)
    .leftJoin(messagesTable, sql`${messagesTable.supplierId} = ${suppliersTable.id}`)
    .where(eq(suppliersTable.id, supplier.id))
    .groupBy(suppliersTable.id);

  res.json(ListSuppliersResponseItem.parse(withThreadCount));
});

export default router;
