import { Router, type IRouter } from "express";
import { db, poNumberingConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

async function getConfig() {
  const [cfg] = await db.select().from(poNumberingConfigTable).limit(1);
  if (cfg) return cfg;
  const [inserted] = await db
    .insert(poNumberingConfigTable)
    .values({ prefix: "PO-", sequenceFormat: "{seq}", supplierSuffix: "S", nextSeq: 1 })
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

router.get("/settings/po-numbering", async (req, res) => {
  const cfg = await getConfig();
  res.json({ ...cfg, preview: makePreview(cfg) });
});

const UpdateBody = z.object({
  prefix:         z.string().optional(),
  sequenceFormat: z.string().optional(),
  supplierSuffix: z.string().optional(),
  resetSeq:       z.number().int().positive().optional(),
});

router.put("/settings/po-numbering", async (req, res) => {
  const body = UpdateBody.parse(req.body);
  const cfg = await getConfig();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.prefix         !== undefined) patch.prefix         = body.prefix;
  if (body.sequenceFormat !== undefined) patch.sequenceFormat = body.sequenceFormat;
  if (body.supplierSuffix !== undefined) patch.supplierSuffix = body.supplierSuffix;
  if (body.resetSeq       !== undefined) patch.nextSeq        = body.resetSeq;
  await db.update(poNumberingConfigTable).set(patch).where(eq(poNumberingConfigTable.id, cfg.id));
  const updated = await getConfig();
  res.json({ ...updated, preview: makePreview(updated) });
});

router.get("/settings/po-numbering/next", async (req, res) => {
  const cfg = await getConfig();
  res.json(makePreview(cfg));
});

router.post("/settings/po-numbering/next", async (req, res) => {
  const cfg = await getConfig();
  const preview = makePreview(cfg);
  await db
    .update(poNumberingConfigTable)
    .set({ nextSeq: cfg.nextSeq + 1, updatedAt: new Date() })
    .where(eq(poNumberingConfigTable.id, cfg.id));
  res.json(preview);
});

export { buildPoNumber, getConfig };
export default router;
