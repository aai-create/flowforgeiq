import { Router, type IRouter } from "express";
import { db, stagesTable } from "@workspace/db";
import { asc, sql } from "drizzle-orm";
import { ListStagesResponseItem, ReorderStagesBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stages", async (_req, res) => {
  const rows = await db.select().from(stagesTable).orderBy(asc(stagesTable.sortOrder));
  res.json(rows.map(r => ListStagesResponseItem.parse(r)));
});

router.post("/stages/reorder", async (req, res) => {
  const input = ReorderStagesBody.parse(req.body);
  await db.transaction(async (tx) => {
    for (let i = 0; i < input.stageIds.length; i++) {
      await tx
        .update(stagesTable)
        .set({ sortOrder: i })
        .where(sql`${stagesTable.id} = ${input.stageIds[i]}`);
    }
  });
  const rows = await db.select().from(stagesTable).orderBy(asc(stagesTable.sortOrder));
  res.json(rows.map(r => ListStagesResponseItem.parse(r)));
});

export default router;
