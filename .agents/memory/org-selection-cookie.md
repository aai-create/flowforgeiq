---
name: Org selection cookie (multi-org)
description: How multi-org workspace selection works and pitfalls when touching team_users queries
---

Multi-org selection uses an HttpOnly `ff-org-id` cookie (helpers in `artifacts/api-server/src/lib/orgCookie.ts`).

**Rule:** any read/write on `team_users` that represents the *active* workspace must be scoped `AND org_id = req.orgId` — a user can have one row per org (composite PK since migration 0017), with per-org role and per-org unique inbound handle. A bare `.where(eq(clerkUserId))` returns an arbitrary org's row and, for updates, hits the global `inbound_handle` unique constraint.

**Why:** completion review rejected the feature twice for unscoped queries in `/team/me`, settings inbound-email handlers, and requireManager/requireAdmin.

**How to apply:** when adding endpoints touching `team_users`, always pair clerkUserId with `req.orgId` (already cookie-aware via orgContextMiddleware). The client can't read the HttpOnly cookie — `GET /team/my-orgs` returns `selectedOrgId` for the frontend gate.

Also: route modules must not import constants from `middlewares/requireAuth` — old tests `vi.mock` that module wholesale, so such imports become `undefined` at runtime in tests (caused silent 500s). Put shared constants in `lib/`.
