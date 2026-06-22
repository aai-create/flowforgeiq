import { Router, type IRouter } from "express";
import { db, poNumberingConfigTable, teamUsersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { getAuth } from "@clerk/express";
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getConfig(orgId = 1) {
  const [cfg] = await db.select().from(poNumberingConfigTable).where(eq(poNumberingConfigTable.orgId, orgId)).limit(1);
  if (cfg) return cfg;
  const [inserted] = await db
    .insert(poNumberingConfigTable)
    .values({ prefix: "PO-", sequenceFormat: "{seq}", supplierSuffix: "S", nextSeq: 1, orgId })
    .returning();
  return inserted!;
}

function buildPoNumber(prefix: string, format: string, seq: number): string {
  return prefix + format.replace("{seq}", String(seq).padStart(4, "0"));
}

function makePreview(cfg: { prefix: string; sequenceFormat: string; supplierSuffix: string; nextSeq: number }) {
  const buyerPo = buildPoNumber(cfg.prefix, cfg.sequenceFormat, cfg.nextSeq);
  const supplierPo = buyerPo + cfg.supplierSuffix;
  return { buyerPo, supplierPo };
}

router.get("/settings/inbound-email", async (req, res) => {
  const base = process.env.INBOUND_EMAIL_BASE ?? "iq@flowforgeiq.com";

  // Try to get the authenticated user's token (optional auth — unauthenticated callers get the base address)
  let inboundEmailAddress = base;
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (userId) {
      const [localPart, domain] = base.split("@");
      const [teamUser] = await db
        .select({ inboundToken: teamUsersTable.inboundToken })
        .from(teamUsersTable)
        .where(eq(teamUsersTable.clerkUserId, userId));
      const token = teamUser?.inboundToken;
      if (token && localPart && domain) {
        inboundEmailAddress = `${localPart}+${token}@${domain}`;
      }
    }
  } catch {
    // If auth resolution fails, fall back to the base address
  }

  res.json({ inboundEmailAddress });
});

router.get("/settings/po-numbering", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const cfg = await getConfig(orgId);
  res.json({ ...cfg, preview: makePreview(cfg) });
});

const UpdateBody = z.object({
  prefix:         z.string().optional(),
  sequenceFormat: z.string().optional(),
  supplierSuffix: z.string().optional(),
  resetSeq:       z.number().int().positive().optional(),
});

router.put("/settings/po-numbering", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const body = UpdateBody.parse(req.body);
  const cfg = await getConfig(orgId);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.prefix         !== undefined) patch.prefix         = body.prefix;
  if (body.sequenceFormat !== undefined) patch.sequenceFormat = body.sequenceFormat;
  if (body.supplierSuffix !== undefined) patch.supplierSuffix = body.supplierSuffix;
  if (body.resetSeq       !== undefined) patch.nextSeq        = body.resetSeq;
  await db.update(poNumberingConfigTable).set(patch).where(eq(poNumberingConfigTable.id, cfg.id));
  const updated = await getConfig(orgId);
  res.json({ ...updated, preview: makePreview(updated) });
});

router.get("/settings/po-numbering/next", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const cfg = await getConfig(orgId);
  res.json(makePreview(cfg));
});

router.post("/settings/po-numbering/next", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const cfg = await getConfig(orgId);
  const [updated] = await db
    .update(poNumberingConfigTable)
    .set({ nextSeq: sql`${poNumberingConfigTable.nextSeq} + 1`, updatedAt: new Date() })
    .where(eq(poNumberingConfigTable.id, cfg.id))
    .returning();
  const consumedSeq = (updated?.nextSeq ?? cfg.nextSeq + 1) - 1;
  const preview = {
    buyerPo: buildPoNumber(cfg.prefix, cfg.sequenceFormat, consumedSeq),
    supplierPo: buildPoNumber(cfg.prefix, cfg.sequenceFormat, consumedSeq) + cfg.supplierSuffix,
  };
  res.json(preview);
});

export { buildPoNumber, getConfig };
export default router;
