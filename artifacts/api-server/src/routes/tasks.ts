import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { ListTasksResponseItem, UpdateTaskBody, UpdateTaskResponse } from "@workspace/api-zod";
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/tasks", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.orgId, orgId)).orderBy(asc(tasksTable.id));
  res.json(rows.map(r => ListTasksResponseItem.parse(r)));
});

router.patch("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const input = UpdateTaskBody.parse(req.body);
  const [updated] = await db.update(tasksTable).set(input).where(and(eq(tasksTable.id, id), eq(tasksTable.orgId, orgId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(updated));
});

export default router;
