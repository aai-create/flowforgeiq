---
name: Clerk duplicate-cookie 401s in dev
description: Why FlowForge web showed "Could not reach the server" — duplicate stale Clerk cookies, not a network/server fault.
---

# "Could not reach the server" == any query error, often a 401

`Home.tsx` renders one generic error screen whenever any of its core React Query queries errors (`isError`). It is NOT a network failure label — it fires on HTTP 401/403 too. When debugging it, check the actual HTTP status before assuming connectivity.

# Root cause: duplicate/stale Clerk cookies in the browser

A real browser can accumulate **duplicate** Clerk cookies — `__session`, `__client_uat`, `__clerk_db_jwt` and their `_<suffix>` variants each appearing TWICE in the `Cookie` header (same instance suffix, set at two domain/path scopes across many dev restarts). `clerkMiddleware` then can't resolve the right session → `getAuth()` returns `userId: null` → 401.

**How to confirm:** temporarily log `req.headers.cookie` cookie *names* (never values) in `orgContextMiddleware`. Duplicate names = the bug.

**Decisive contrast test:** a FRESH browser context (testing skill, `testClerkAuth: true`) with clean single cookies authenticates fine — it returns **403** (verified user, just not provisioned via `team_users`), NOT 401. So 403 = Clerk verified you; 401 = Clerk could not verify the session at all. If fresh browser works but the user's browser 401s, the backend wiring is fine — the user's cookie jar is polluted.

**Immediate fix for the user:** sign out fully / clear site cookies / use a fresh (incognito) session.

# Self-heal in code

`Home.tsx` distinguishes a **401** `ApiError` (status from `@workspace/api-client-react`'s `ApiError`) and shows a "session expired → sign out & sign in again" screen (`useClerk().signOut()` clears the stale cookies). Do NOT treat 403 the same — 403 is "not provisioned", and signing out won't provision the account; let 403 fall through to the generic/retry path.

**Why:** the only failure mode that signing out actually fixes is the unverifiable-session (401) case.
