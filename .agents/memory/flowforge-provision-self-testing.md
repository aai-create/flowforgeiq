---
name: FlowForge provision-self testing limitation
description: Why testClerkAuth e2e tests can't exercise auth-gated flows for a second manager/admin test user in FlowForge
---

`POST /api/team/provision-self` only allows self-provisioning when the org has zero existing `team_users` rows (first-ever user becomes admin). Any subsequent freshly-signed-in Clerk test user gets a persistent 403 "account not provisioned" on every API call, since they must be invited via `POST /api/team/invite` + accept-invite instead.

Workaround attempted: insert a `team_users` row directly via SQL, matched by `clerk_user_id`, to bypass provision-self. This fails in the testing subagent because the signed-in Clerk user id is not retrievable from the browser session (`window.__clerk` is null in the test harness, cookies don't expose it, and `/api/me`-style endpoints are themselves gated behind provisioning — chicken-and-egg).

**Why:** the app's invite-only bootstrap model (see threat model: "Spoofing" — only explicitly authorized users may create a `team_users` membership) is working as intended; it just isn't compatible with the current e2e test harness for multi-role scenarios.

**How to apply:** for any feature gated behind manager/admin role or requiring a second+ team member, expect e2e (`runTest` with `testClerkAuth`) to be blocked at the provisioning step. Fall back to `pnpm run typecheck`, manual code review against existing role-gated routes (e.g. `routes/team.ts`), and/or ask the user to manually verify in their own already-provisioned account. If the test harness gains a way to surface the signed-in Clerk user id, this workaround (direct SQL insert into `team_users`) would unblock it.
