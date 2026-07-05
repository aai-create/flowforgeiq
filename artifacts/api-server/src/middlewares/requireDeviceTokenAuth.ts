import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, deviceTokensTable, teamUsersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

/**
 * Resolves auth from either a Clerk session (already set by orgContextMiddleware)
 * or an Authorization: Bearer <token> header matched against device_tokens.
 *
 * On success: req.userId, req.orgId, req.isProvisioned are set.
 * On failure: 401.
 *
 * Must be mounted AFTER orgContextMiddleware.
 */
export const requireDeviceTokenAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // If Clerk session already resolved a provisioned user, pass through.
  if (req.userId && req.isProvisioned) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: provide a Clerk session or Bearer device token" });
    return;
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    res.status(401).json({ error: "Unauthorized: empty Bearer token" });
    return;
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const [row] = await db
    .select({
      id: deviceTokensTable.id,
      clerkUserId: deviceTokensTable.clerkUserId,
      orgId: deviceTokensTable.orgId,
    })
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    res.status(401).json({ error: "Unauthorized: invalid or revoked device token" });
    return;
  }

  // Require an active team_users membership — deprovisioned users must not be re-admitted via stale tokens
  const [teamUser] = await db
    .select({ name: teamUsersTable.name, orgId: teamUsersTable.orgId })
    .from(teamUsersTable)
    .where(
      and(
        eq(teamUsersTable.clerkUserId, row.clerkUserId),
        eq(teamUsersTable.orgId, row.orgId),
      ),
    )
    .limit(1);

  if (!teamUser) {
    res.status(403).json({ error: "Forbidden: device token owner is no longer an active team member" });
    return;
  }

  // Update last_used_at fire-and-forget (only after membership confirmed)
  setImmediate(async () => {
    await db
      .update(deviceTokensTable)
      .set({ lastUsedAt: new Date() })
      .where(eq(deviceTokensTable.id, row.id));
  });

  req.userId = row.clerkUserId;
  req.orgId = teamUser.orgId;
  req.isProvisioned = true;
  req.actorName = teamUser.name;

  next();
};
