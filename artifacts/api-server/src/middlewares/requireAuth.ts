import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, teamUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      actorName?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  const [user] = await db.select().from(teamUsersTable).where(eq(teamUsersTable.clerkUserId, userId));
  if (user) {
    req.actorName = user.name;
  }

  next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  const [user] = await db.select().from(teamUsersTable).where(eq(teamUsersTable.clerkUserId, userId));
  if (!user) {
    res.status(403).json({ error: "Forbidden: not a team member" });
    return;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin required" });
    return;
  }
  req.actorName = user.name;
  next();
};
