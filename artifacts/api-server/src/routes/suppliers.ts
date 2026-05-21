import { Router, type IRouter } from "express";
import { db, suppliersTable, messagesTable } from "@workspace/db";
import { sql, asc, eq } from "drizzle-orm";
import { ListSuppliersResponseItem, UpdateSupplierBody, CreateSupplierBody } from "@workspace/api-zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router: IRouter = Router();

function supplierSelect() {
  return {
    id: suppliersTable.id,
    name: suppliersTable.name,
    country: suppliersTable.country,
    contactEmail: suppliersTable.contactEmail,
    contactName: suppliersTable.contactName,
    whatsAppNumber: suppliersTable.whatsAppNumber,
    paymentTerms: suppliersTable.paymentTerms,
    threadCount: sql<number>`count(distinct ${messagesTable.shipmentId})::int`,
  };
}

router.get("/suppliers", async (_req, res) => {
  const rows = await db
    .select(supplierSelect())
    .from(suppliersTable)
    .leftJoin(messagesTable, sql`${messagesTable.supplierId} = ${suppliersTable.id}`)
    .groupBy(suppliersTable.id)
    .orderBy(asc(suppliersTable.name));
  res.json(rows.map(r => ListSuppliersResponseItem.parse(r)));
});

router.post("/suppliers", async (req, res) => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;
  if (input.contactEmail != null && !EMAIL_RE.test(input.contactEmail)) {
    res.status(400).json({ error: "contactEmail must be a valid email address" });
    return;
  }
  if (input.contactEmail != null) {
    input.contactEmail = input.contactEmail.toLowerCase().trim();
  }
  const [row] = await db.insert(suppliersTable).values(input).returning();
  const result = ListSuppliersResponseItem.parse({ ...row, threadCount: 0 });
  res.status(201).json(result);
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
    .select(supplierSelect())
    .from(suppliersTable)
    .leftJoin(messagesTable, sql`${messagesTable.supplierId} = ${suppliersTable.id}`)
    .where(eq(suppliersTable.id, supplier.id))
    .groupBy(suppliersTable.id);

  res.json(ListSuppliersResponseItem.parse(withThreadCount));
});

export default router;
