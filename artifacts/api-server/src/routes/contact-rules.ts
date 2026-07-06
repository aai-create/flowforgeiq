import { Router, type IRouter } from "express";
import { db, contactRoutingRulesTable, shipmentsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/settings/contact-rules", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db
    .select({
      id: contactRoutingRulesTable.id,
      fromEmail: contactRoutingRulesTable.fromEmail,
      shipmentId: contactRoutingRulesTable.shipmentId,
      active: contactRoutingRulesTable.active,
      createdBy: contactRoutingRulesTable.createdBy,
      createdAt: contactRoutingRulesTable.createdAt,
      updatedAt: contactRoutingRulesTable.updatedAt,
      poNumber: shipmentsTable.poNumber,
    })
    .from(contactRoutingRulesTable)
    .leftJoin(shipmentsTable, eq(contactRoutingRulesTable.shipmentId, shipmentsTable.id))
    .where(eq(contactRoutingRulesTable.orgId, orgId))
    .orderBy(desc(contactRoutingRulesTable.createdAt));

  res.json(rows.map(r => ({
    id: r.id,
    fromEmail: r.fromEmail,
    shipmentId: r.shipmentId,
    poNumber: r.poNumber ?? null,
    active: r.active,
    createdBy: r.createdBy ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

const CreateContactRuleBody = z.object({
  fromEmail: z.string().email().toLowerCase(),
  shipmentId: z.number().int().positive(),
});

router.post("/settings/contact-rules", async (req, res) => {
  const orgId = await resolveOrgId(req);
  let body: z.infer<typeof CreateContactRuleBody>;
  try {
    body = CreateContactRuleBody.parse(req.body);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [shipmentCheck] = await db
    .select({ id: shipmentsTable.id, poNumber: shipmentsTable.poNumber })
    .from(shipmentsTable)
    .where(and(eq(shipmentsTable.id, body.shipmentId), eq(shipmentsTable.orgId, orgId)))
    .limit(1);

  if (!shipmentCheck) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }

  const [inserted] = await db
    .insert(contactRoutingRulesTable)
    .values({
      orgId,
      fromEmail: body.fromEmail.toLowerCase(),
      shipmentId: body.shipmentId,
      createdBy: req.userId ?? null,
      active: true,
    })
    .onConflictDoUpdate({
      target: [contactRoutingRulesTable.orgId, contactRoutingRulesTable.fromEmail],
      set: {
        shipmentId: body.shipmentId,
        active: true,
        createdBy: req.userId ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  req.log.info({ fromEmail: body.fromEmail, shipmentId: body.shipmentId }, "contact-rules: created/updated");

  res.status(201).json({
    id: inserted!.id,
    fromEmail: inserted!.fromEmail,
    shipmentId: inserted!.shipmentId,
    poNumber: shipmentCheck.poNumber,
    active: inserted!.active,
    createdBy: inserted!.createdBy ?? null,
    createdAt: inserted!.createdAt.toISOString(),
    updatedAt: inserted!.updatedAt.toISOString(),
  });
});

const PatchContactRuleBody = z.object({
  active: z.boolean().optional(),
  shipmentId: z.number().int().positive().optional(),
});

router.patch("/settings/contact-rules/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const orgId = await resolveOrgId(req);
  let body: z.infer<typeof PatchContactRuleBody>;
  try {
    body = PatchContactRuleBody.parse(req.body);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  if (body.shipmentId !== undefined) {
    const [shipmentCheck] = await db
      .select({ id: shipmentsTable.id })
      .from(shipmentsTable)
      .where(and(eq(shipmentsTable.id, body.shipmentId), eq(shipmentsTable.orgId, orgId)))
      .limit(1);
    if (!shipmentCheck) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.active !== undefined) patch.active = body.active;
  if (body.shipmentId !== undefined) patch.shipmentId = body.shipmentId;

  const [updated] = await db
    .update(contactRoutingRulesTable)
    .set(patch)
    .where(and(eq(contactRoutingRulesTable.id, id), eq(contactRoutingRulesTable.orgId, orgId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const [ship] = await db
    .select({ poNumber: shipmentsTable.poNumber })
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, updated.shipmentId))
    .limit(1);

  req.log.info({ id, patch }, "contact-rules: patched");

  res.json({
    id: updated.id,
    fromEmail: updated.fromEmail,
    shipmentId: updated.shipmentId,
    poNumber: ship?.poNumber ?? null,
    active: updated.active,
    createdBy: updated.createdBy ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.delete("/settings/contact-rules/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const orgId = await resolveOrgId(req);
  const [deleted] = await db
    .delete(contactRoutingRulesTable)
    .where(and(eq(contactRoutingRulesTable.id, id), eq(contactRoutingRulesTable.orgId, orgId)))
    .returning({ id: contactRoutingRulesTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  req.log.info({ id }, "contact-rules: deleted");
  res.status(204).end();
});

export default router;
