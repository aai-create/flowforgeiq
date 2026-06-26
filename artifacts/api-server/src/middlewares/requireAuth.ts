import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, teamUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      actorName?: string;
      orgId: number;
      isProvisioned?: boolean;
    }
  }
}

// ─── Global org-context middleware ────────────────────────────────────────────
// Mount on the /api router so every request has req.orgId set before handlers run.
//   - No Clerk JWT → req.orgId = 1 (unauthenticated / public demo access)
//   - JWT present + user in team_users → req.userId/orgId/actorName from DB row; req.isProvisioned = true
//   - JWT present + user NOT in team_users → req.userId set, req.orgId = 1, req.isProvisioned = false
//     (caller must hit POST /team/provision-self before write routes will accept them)
export const orgContextMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  req.orgId = 1;
  req.isProvisioned = false;
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    // ── TEMP DEBUG (auth troubleshooting) ──────────────────────────────────
    if (req.url.startsWith("/messages") || req.url.startsWith("/shipments") || req.url.startsWith("/stages")) {
      const rawCookie = req.headers.cookie ?? "";
      const cookieNames = rawCookie
        .split(";")
        .map((c) => c.split("=")[0].trim())
        .filter(Boolean);
      const clerkCookieNames = cookieNames.filter((n) => n.startsWith("__"));
      const dup = clerkCookieNames.filter((n, i) => clerkCookieNames.indexOf(n) !== i);
      req.log.warn(
        {
          authDebug: {
            url: req.url,
            userId: auth?.userId ?? null,
            sessionId: (auth as { sessionId?: string })?.sessionId ?? null,
            tokenType: (auth as { tokenType?: string })?.tokenType ?? null,
            hasCookieHeader: rawCookie.length > 0,
            hasAuthHeader: Boolean(req.headers.authorization),
            clerkCookieNames,
            duplicateClerkCookies: Array.from(new Set(dup)),
          },
        },
        "AUTH_DEBUG",
      );
    }
    // ── END TEMP DEBUG ─────────────────────────────────────────────────────
    if (userId) {
      req.userId = userId;
      const [user] = await db
        .select({
          orgId: teamUsersTable.orgId,
          name: teamUsersTable.name,
        })
        .from(teamUsersTable)
        .where(eq(teamUsersTable.clerkUserId, userId));
      if (user) {
        req.actorName = user.name;
        req.orgId = user.orgId;
        req.isProvisioned = true;
      }
      // unprovisioned: req.orgId stays 1, req.isProvisioned stays false
    }
  } catch {
    // If resolution fails, keep defaults (orgId=1, unauthenticated)
  }
  next();
};

// ─── requireClerkAuth ─────────────────────────────────────────────────────────
// Requires a valid Clerk JWT; does NOT require team membership.
// Use only for the provision-self bootstrap endpoint.
export const requireClerkAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

// ─── requireAuth ─────────────────────────────────────────────────────────────
// Requires a valid Clerk JWT AND an existing team_users row (provisioned member).
// Returns 401 if no JWT; 403 if JWT present but user is not yet provisioned.
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.isProvisioned) {
    res.status(403).json({ error: "Forbidden: account not provisioned — call POST /team/provision-self first" });
    return;
  }
  next();
};

// ─── requireAdmin ─────────────────────────────────────────────────────────────
// Requires a valid Clerk JWT AND admin role in team_users.
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.isProvisioned) {
    res.status(403).json({ error: "Forbidden: account not provisioned" });
    return;
  }
  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(eq(teamUsersTable.clerkUserId, req.userId));
  if (!user) {
    res.status(403).json({ error: "Forbidden: not a team member" });
    return;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin required" });
    return;
  }
  req.actorName = user.name;
  req.orgId = user.orgId;
  next();
};

// ─── resolveOrgId ─────────────────────────────────────────────────────────────
// Returns the org already resolved by orgContextMiddleware.
// Safe for routes that allow unauthenticated access (returns 1 for public/demo requests).
export async function resolveOrgId(req: Request): Promise<number> {
  return req.orgId ?? 1;
}
