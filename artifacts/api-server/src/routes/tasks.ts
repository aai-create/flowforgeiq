import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { ListTasksResponseItem, UpdateTaskBody, UpdateTaskResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (_req, res) => {
  const rows = await db.select().from(tasksTable).orderBy(asc(tasksTable.id));
  res.json(rows.map(r => ListTasksResponseItem.parse(r)));
});

router.patch("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdateTaskBody.parse(req.body);
  const [updated] = await db.update(tasksTable).set(input).where(eq(tasksTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(updated));
});

export default router;
