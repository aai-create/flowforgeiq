import { Router, type IRouter } from "express";
import { db, pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import { z } from "zod/v4";

const router: IRouter = Router();

const RegisterBody = z.object({
  expoPushToken: z.string().min(1),
});

router.post("/push-tokens", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const clerkUserId = req.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { expoPushToken } = RegisterBody.parse(req.body);

  await db
    .insert(pushTokensTable)
    .values({ clerkUserId, orgId, expoPushToken })
    .onConflictDoUpdate({
      target: [pushTokensTable.expoPushToken],
      set: { clerkUserId, orgId, updatedAt: new Date() },
    });

  res.status(201).json({ registered: true });
});

router.delete("/push-tokens", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const clerkUserId = req.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { expoPushToken } = RegisterBody.parse(req.body);

  await db
    .delete(pushTokensTable)
    .where(
      and(
        eq(pushTokensTable.expoPushToken, expoPushToken),
        eq(pushTokensTable.orgId, orgId),
      ),
    );

  res.status(204).end();
});

export default router;
