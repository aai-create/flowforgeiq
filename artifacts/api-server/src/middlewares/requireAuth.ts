import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, teamUsersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { verifyImpersonationToken } from "../lib/impersonation";
import { parseOrgIdCookie } from "../lib/orgCookie";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      actorName?: string;
      orgId: number;
      role?: string;
      isProvisioned?: boolean;
      superAdminEmail?: string;
      isImpersonating?: boolean;
      _impersonationDenied?: boolean;
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
    // ── Duplicate-cookie detection ──────────────────────────────────────────
    {
      const rawCookie = req.headers.cookie ?? "";
      const cookieNames = rawCookie
        .split(";")
        .map((c) => c.split("=")[0].trim())
        .filter(Boolean);
      const clerkCookieNames = cookieNames.filter((n) => n.startsWith("__"));
      const dup = Array.from(
        new Set(clerkCookieNames.filter((n, i) => clerkCookieNames.indexOf(n) !== i)),
      );
      if (dup.length > 0) {
        req.log.warn({ duplicateClerkCookies: dup, url: req.url }, "duplicate-clerk-cookies detected");
        // Stash duplicates so requireAuth can surface a hint header on 401
        (req as Request & { _dupClerkCookies?: string[] })._dupClerkCookies = dup;
      }
    }
    // ── End duplicate-cookie detection ─────────────────────────────────────

    // ── Impersonation header ────────────────────────────────────────────────
    const impersonateHeader = req.headers["x-forge-impersonate"];
    if (typeof impersonateHeader === "string" && impersonateHeader) {
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      if (superAdminEmail && userId) {
        const payload = verifyImpersonationToken(impersonateHeader);
        if (payload) {
          // Verify the requestor is actually the super admin
          try {
            const clerkUser = await clerkClient.users.getUser(userId);
            const emails = clerkUser.emailAddresses.map((e) => e.emailAddress.toLowerCase());
            if (emails.includes(superAdminEmail.toLowerCase())) {
              req.userId = userId;
              req.orgId = payload.orgId;
              req.isProvisioned = true;
              req.isImpersonating = true;
              req.actorName = "[Platform Admin]";
              next();
              return;
            }
            // Not a superadmin — flag for rejection
            req._impersonationDenied = true;
          } catch {
            req._impersonationDenied = true;
          }
        } else {
          // Token present but invalid/expired — flag for rejection
          req._impersonationDenied = true;
        }
      } else {
        // No SUPER_ADMIN_EMAIL configured or no userId — flag for rejection
        req._impersonationDenied = true;
      }
      next();
      return;
    }
    // ── End impersonation header ────────────────────────────────────────────

    if (userId) {
      req.userId = userId;
      // ── Org selection cookie ──────────────────────────────────────────────
      // Multi-org users pick an org via POST /team/select-org, which sets the
      // ff-org-id cookie. If present and valid, scope the lookup to that org;
      // a stale/spoofed cookie simply falls back to the first valid row.
      const selectedOrgId = parseOrgIdCookie(req.headers.cookie);
      let user:
        | { orgId: number; name: string; role: string }
        | undefined;
      if (selectedOrgId !== null) {
        [user] = await db
          .select({
            orgId: teamUsersTable.orgId,
            name: teamUsersTable.name,
            role: teamUsersTable.role,
          })
          .from(teamUsersTable)
          .where(
            and(
              eq(teamUsersTable.clerkUserId, userId),
              eq(teamUsersTable.orgId, selectedOrgId),
            ),
          );
      }
      if (!user) {
        [user] = await db
          .select({
            orgId: teamUsersTable.orgId,
            name: teamUsersTable.name,
            role: teamUsersTable.role,
          })
          .from(teamUsersTable)
          .where(eq(teamUsersTable.clerkUserId, userId));
      }
      if (user) {
        req.actorName = user.name;
        req.orgId = user.orgId;
        req.role = user.role;
        req.isProvisioned = true;
      }
      // unprovisioned: req.orgId stays 1, req.isProvisioned stays false
    }
  } catch {
    // If resolution fails, keep defaults (orgId=1, unauthenticated)
  }
  next();
};

/** Set X-Auth-Hint header when duplicate Clerk cookies are present on a 401 */
function setDupCookieHint(req: Request, res: Response): void {
  const dupCookies = (req as Request & { _dupClerkCookies?: string[] })._dupClerkCookies;
  if (dupCookies && dupCookies.length > 0) {
    res.set("X-Auth-Hint", "duplicate-clerk-cookies");
  }
}

// ─── requireClerkAuth ─────────────────────────────────────────────────────────
// Requires a valid Clerk JWT; does NOT require team membership.
// Use only for the provision-self bootstrap endpoint.
export const requireClerkAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.userId) {
    setDupCookieHint(req, res);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

// ─── requireAuth ─────────────────────────────────────────────────────────────
// Requires a valid Clerk JWT AND an existing team_users row (provisioned member).
// Returns 401 if no JWT; 403 if JWT present but user is not yet provisioned.
// Also rejects non-superadmin requests that present an X-Forge-Impersonate header.
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req._impersonationDenied) {
    res.status(401).json({ error: "Unauthorized: invalid or forbidden impersonation token" });
    return;
  }
  if (!req.userId) {
    setDupCookieHint(req, res);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.isProvisioned) {
    res.status(403).json({ error: "Forbidden: account not provisioned — call POST /team/provision-self first" });
    return;
  }
  next();
};

// ─── requireManager ───────────────────────────────────────────────────────────
// Requires a valid Clerk JWT AND manager or admin role in team_users.
export const requireManager = async (
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
  // Impersonation sessions already have orgId + role set by orgContextMiddleware.
  if (req.isImpersonating) {
    next();
    return;
  }
  // Scope to the org already resolved by orgContextMiddleware (cookie-aware),
  // so multi-org users keep their selected org and per-org role.
  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(and(eq(teamUsersTable.clerkUserId, req.userId), eq(teamUsersTable.orgId, req.orgId)));
  if (!user) {
    res.status(403).json({ error: "Forbidden: not a team member" });
    return;
  }
  if (user.role !== "manager" && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: manager or admin required" });
    return;
  }
  req.actorName = user.name;
  req.orgId = user.orgId;
  req.role = user.role;
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
  // Impersonation sessions already have orgId + role set by orgContextMiddleware.
  // Re-querying team_users would overwrite the impersonated orgId with the
  // superadmin's own orgId, so skip the DB round-trip in that case.
  if (req.isImpersonating) {
    next();
    return;
  }
  // Scope to the org already resolved by orgContextMiddleware (cookie-aware).
  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(and(eq(teamUsersTable.clerkUserId, req.userId), eq(teamUsersTable.orgId, req.orgId)));
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

// ─── requireSuperAdmin ────────────────────────────────────────────────────────
// Requires a valid Clerk JWT AND the authenticated user's primary email must
// match the SUPER_ADMIN_EMAIL environment variable. No team_users row required.
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    res.status(500).json({ error: "SUPER_ADMIN_EMAIL is not configured" });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const clerkUser = await clerkClient.users.getUser(req.userId);
    const emails = clerkUser.emailAddresses.map(e => e.emailAddress.toLowerCase());
    if (!emails.includes(superAdminEmail.toLowerCase())) {
      res.status(403).json({ error: "Forbidden: super admin access required" });
      return;
    }
    req.superAdminEmail = superAdminEmail;
  } catch {
    res.status(500).json({ error: "Could not verify identity" });
    return;
  }
  next();
};

// ─── resolveOrgId ─────────────────────────────────────────────────────────────
// Returns the org already resolved by orgContextMiddleware.
// Safe for routes that allow unauthenticated access (returns 1 for public/demo requests).
export async function resolveOrgId(req: Request): Promise<number> {
  return req.orgId ?? 1;
}
