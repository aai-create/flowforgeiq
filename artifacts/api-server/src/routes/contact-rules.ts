import { Router, type IRouter } from "express";
import { db, contactRoutingRulesTable, shipmentsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

const VALID_CHANNELS = ["email", "whatsapp", "sms", "wechat", "imessage", "other"] as const;
type RuleChannel = typeof VALID_CHANNELS[number];

function formatRule(r: {
  id: number;
  channel: string;
  senderId: string;
  fromEmail: string | null;
  shipmentId: number;
  poNumber: string | null;
  active: boolean;
  deactivationReason?: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    channel: r.channel,
    senderId: r.senderId,
    fromEmail: r.fromEmail ?? (r.channel === "email" ? r.senderId : null),
    shipmentId: r.shipmentId,
    poNumber: r.poNumber ?? null,
    active: r.active,
    deactivationReason: r.deactivationReason ?? null,
    createdBy: r.createdBy ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/settings/contact-rules", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db
    .select({
      id: contactRoutingRulesTable.id,
      channel: contactRoutingRulesTable.channel,
      senderId: contactRoutingRulesTable.senderId,
      fromEmail: contactRoutingRulesTable.fromEmail,
      shipmentId: contactRoutingRulesTable.shipmentId,
      active: contactRoutingRulesTable.active,
      deactivationReason: contactRoutingRulesTable.deactivationReason,
      createdBy: contactRoutingRulesTable.createdBy,
      createdAt: contactRoutingRulesTable.createdAt,
      updatedAt: contactRoutingRulesTable.updatedAt,
      poNumber: shipmentsTable.poNumber,
    })
    .from(contactRoutingRulesTable)
    .leftJoin(shipmentsTable, eq(contactRoutingRulesTable.shipmentId, shipmentsTable.id))
    .where(eq(contactRoutingRulesTable.orgId, orgId))
    .orderBy(desc(contactRoutingRulesTable.createdAt));

  res.json(rows.map(formatRule));
});

const CreateContactRuleBody = z.object({
  /** Universal sender identifier: email address, phone number, display name, or handle. */
  senderId: z.string().min(1),
  /** Messaging channel. Defaults to "email" when omitted. */
  channel: z.enum(VALID_CHANNELS).optional().default("email"),
  /** Convenience alias — when provided and channel is email, used as senderId if senderId is absent. @deprecated Use senderId instead. */
  fromEmail: z.string().optional(),
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

  // Resolve the canonical senderId
  let senderId = body.senderId.trim();
  // Backwards compat: if caller only sent fromEmail (legacy), use that
  if (!senderId && body.fromEmail) {
    senderId = body.fromEmail.toLowerCase();
  }
  // For email channel, normalise to lowercase
  if (body.channel === "email") {
    senderId = senderId.toLowerCase();
  }

  if (!senderId) {
    res.status(400).json({ error: "senderId is required" });
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

  const fromEmailValue = body.channel === "email" ? senderId : null;

  const [inserted] = await db
    .insert(contactRoutingRulesTable)
    .values({
      orgId,
      channel: body.channel,
      senderId,
      fromEmail: fromEmailValue,
      shipmentId: body.shipmentId,
      createdBy: req.userId ?? null,
      active: true,
    })
    .onConflictDoUpdate({
      target: [contactRoutingRulesTable.orgId, contactRoutingRulesTable.channel, contactRoutingRulesTable.senderId],
      set: {
        shipmentId: body.shipmentId,
        active: true,
        fromEmail: fromEmailValue,
        createdBy: req.userId ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  req.log.info({ channel: body.channel, senderId, shipmentId: body.shipmentId }, "contact-rules: created/updated");

  res.status(201).json(formatRule({
    id: inserted!.id,
    channel: inserted!.channel,
    senderId: inserted!.senderId,
    fromEmail: inserted!.fromEmail,
    shipmentId: inserted!.shipmentId,
    poNumber: shipmentCheck.poNumber,
    active: inserted!.active,
    deactivationReason: inserted!.deactivationReason ?? null,
    createdBy: inserted!.createdBy ?? null,
    createdAt: inserted!.createdAt,
    updatedAt: inserted!.updatedAt,
  }));
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

  res.json(formatRule({
    id: updated.id,
    channel: updated.channel,
    senderId: updated.senderId,
    fromEmail: updated.fromEmail,
    shipmentId: updated.shipmentId,
    poNumber: ship?.poNumber ?? null,
    active: updated.active,
    deactivationReason: updated.deactivationReason ?? null,
    createdBy: updated.createdBy ?? null,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }));
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
