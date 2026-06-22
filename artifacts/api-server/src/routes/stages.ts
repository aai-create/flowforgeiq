import { Router, type IRouter } from "express";
import { db, stagesTable, shipmentsTable } from "@workspace/db";
import { asc, eq, sql, and } from "drizzle-orm";
import { ListStagesResponseItem, ReorderStagesBody } from "@workspace/api-zod";
import { resolveOrgId, requireAdmin } from "../middlewares/requireAuth";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/stages", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db.select().from(stagesTable).where(eq(stagesTable.orgId, orgId)).orderBy(asc(stagesTable.sortOrder));
  res.json(rows.map(r => ListStagesResponseItem.parse(r)));
});

router.post("/stages/reorder", requireAdmin, async (req, res) => {
  const orgId = await resolveOrgId(req);
  const input = ReorderStagesBody.parse(req.body);
  await db.transaction(async (tx) => {
    for (let i = 0; i < input.stageIds.length; i++) {
      await tx
        .update(stagesTable)
        .set({ sortOrder: i })
        .where(sql`${stagesTable.id} = ${input.stageIds[i]} AND ${stagesTable.orgId} = ${orgId}`);
    }
  });
  const rows = await db.select().from(stagesTable).where(eq(stagesTable.orgId, orgId)).orderBy(asc(stagesTable.sortOrder));
  res.json(rows.map(r => ListStagesResponseItem.parse(r)));
});

const StageCreateBody = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

router.post("/stages", requireAdmin, async (req, res) => {
  const orgId = req.orgId;
  const body = StageCreateBody.parse(req.body);

  const existing = await db.select().from(stagesTable).where(eq(stagesTable.orgId, orgId)).orderBy(asc(stagesTable.sortOrder));
  const maxOrder = existing.length > 0 ? Math.max(...existing.map(s => s.sortOrder)) : -1;

  const [row] = await db.insert(stagesTable).values({
    id: body.id,
    label: body.label,
    sortOrder: maxOrder + 1,
    orgId,
  }).returning();

  res.status(201).json(ListStagesResponseItem.parse(row));
});

const StageUpdateBody = z.object({
  label: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

router.put("/stages/:id", requireAdmin, async (req, res) => {
  const orgId = req.orgId;
  const stageId = String(req.params["id"]);
  const body = StageUpdateBody.parse(req.body);

  await db.update(stagesTable)
    .set(body)
    .where(sql`${stagesTable.id} = ${stageId} AND ${stagesTable.orgId} = ${orgId}`);

  const [row] = await db.select().from(stagesTable)
    .where(sql`${stagesTable.id} = ${stageId} AND ${stagesTable.orgId} = ${orgId}`);
  if (!row) {
    res.status(404).json({ error: "Stage not found" });
    return;
  }
  res.json(ListStagesResponseItem.parse(row));
});

router.delete("/stages/:id", requireAdmin, async (req, res) => {
  const orgId = req.orgId;
  const stageId = String(req.params["id"]);

  const [shipment] = await db
    .select({ id: shipmentsTable.id })
    .from(shipmentsTable)
    .where(sql`${shipmentsTable.currentStageId} = ${stageId} AND ${shipmentsTable.orgId} = ${orgId}`)
    .limit(1);

  if (shipment) {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shipmentsTable)
      .where(sql`${shipmentsTable.currentStageId} = ${stageId} AND ${shipmentsTable.orgId} = ${orgId}`);
    const count = countRow?.count ?? 1;
    res.status(409).json({ error: `Cannot delete: ${count} shipment(s) are currently at this stage.` });
    return;
  }

  await db.delete(stagesTable)
    .where(sql`${stagesTable.id} = ${stageId} AND ${stagesTable.orgId} = ${orgId}`);
  res.status(204).end();
});

export default router;
