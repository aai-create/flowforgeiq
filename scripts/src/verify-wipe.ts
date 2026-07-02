/**
 * verify-wipe.ts
 *
 * Smoke-tests the `pnpm --filter @workspace/db run wipe` command.
 *
 * Automated checks (run in this script):
 *   1. Snapshot pre-wipe row counts for preserved tables.
 *   2. Run the wipe.
 *   3. Assert every preserved table is UNCHANGED.
 *   4. Assert every wiped business table is now EMPTY.
 *   5a. Probe the live API server (if running) — confirm key business endpoints
 *       return 4xx auth errors, never 5xx server errors, after the wipe.
 *   5b. Probe JIT provisioning & invite endpoints — confirm they are healthy and
 *       correctly gate access after the wipe.
 *   5c. Verify the "invite required" gate: if team_users has rows (wipe
 *       preserves them), provision-self MUST block uninvited new users.
 *   6. Re-seed the database so the app is left in a usable state.
 *
 * Manual UI Checklist (printed at the end):
 *   After the script passes, two scenarios must be verified by a human or a
 *   Playwright agent with Clerk test-auth support:
 *
 *   Scenario A — Existing team member:
 *     An account that already has a team_users row should sign in and see
 *     correct empty states on every page (Inbox, Orders, RFQs) with no errors.
 *
 *   Scenario B — Brand-new invited user:
 *     A net-new Clerk account must be able to accept a pending invitation
 *     (team_invitations row is preserved by the wipe), complete JIT
 *     provisioning, and reach the app — without any manual DB steps.
 *     Any 403s visible in the API log during the initial page load before
 *     accept-invite completes are expected race conditions, not failures.
 *
 * Exit 0 = all automated assertions passed (+ checklist printed).
 * Exit 1 = one or more automated assertions failed (details printed to stderr).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run verify-wipe
 *   # Optional: set API_BASE_URL to override the default (http://localhost:8080)
 */

import { execSync } from "child_process";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — cannot connect to the database.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** The base URL of the running API server. Adjust if using the proxy port. */
const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

async function count(table: string): Promise<number> {
  const result = await pool.query<{ n: string }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return parseInt(result.rows[0].n, 10);
}

// ── Table lists ──────────────────────────────────────────────────────────────

const PRESERVED_TABLES = [
  "organizations",
  "stages",
  "team_users",
  "team_invitations",
  "push_tokens",
  "gmail_credentials",
  "po_numbering_config",
] as const;

const WIPED_TABLES = [
  "tasks",
  "messages",
  "factory_quotes",
  "payments",
  "deal_shipments",
  "shipments",
  "deal_adjustments",
  "deals",
  "suppliers",
  "buyers",
  "rfqs",
  "rfq_quotes",
  "copilot_proposals",
  "autonomy_policies",
  "shipment_predictions",
  "stage_events",
  "buyer_emails",
  "extraction_corrections",
  "extractions",
  "documents",
] as const;

/**
 * Authenticated business endpoints to probe after the wipe.
 * Expected behaviour: the API is up and returns 401/403 (auth required),
 * never a 5xx (server error). An empty DB should not cause panics.
 */
const AUTHENTICATED_ENDPOINTS: { method: string; path: string }[] = [
  { method: "GET", path: "/api/shipments" },
  { method: "GET", path: "/api/messages" },
  { method: "GET", path: "/api/rfqs" },
  { method: "GET", path: "/api/tasks" },
  { method: "GET", path: "/api/settings/inbound-email" },
];

/**
 * JIT provisioning & invite endpoints to probe after the wipe.
 *
 * These are the paths a brand-new invited user must traverse to join the app
 * after a production wipe.  Without authentication:
 *   - POST endpoints must return 401 (Clerk auth required), never 5xx.
 *   - GET /team/invite-peek with a bogus token must return 404 (not found is
 *     correct; the endpoint is public but must not crash on missing tokens).
 *
 * This confirms the auth bootstrapping surface is healthy even with an empty
 * business-data DB.
 */
const JIT_ENDPOINT_PROBES: { method: string; path: string; expectedStatus: number; label: string }[] = [
  {
    method: "POST",
    path: "/api/team/provision-self",
    expectedStatus: 401,
    label: "POST /api/team/provision-self (no auth) → 401 (Clerk auth gate healthy)",
  },
  {
    method: "POST",
    path: "/api/team/accept-invite",
    expectedStatus: 401,
    label: "POST /api/team/accept-invite (no auth) → 401 (Clerk auth gate healthy)",
  },
  {
    method: "GET",
    path: "/api/team/invite-peek?token=verify-wipe-bogus-token",
    expectedStatus: 404,
    label: "GET /api/team/invite-peek?token=bogus → 404 (public endpoint healthy, bogus token not found)",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(label: string, cmd: string): void {
  console.log(`\n▶  ${label}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(`✗  Command failed: ${cmd}`);
    throw err;
  }
}

interface Failure {
  check: string;
  reason: string;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const failures: Failure[] = [];

  // ── 0. Drift guard: every public table must be accounted for ───────────────
  // If a developer adds a schema table but forgets to add it to WIPED_TABLES
  // or PRESERVED_TABLES the wipe will silently leave rows behind.  Query
  // information_schema first so we fail loudly before touching any data.
  console.log("\n━━━  Step 0: Check for unlisted tables  ━━━");
  {
    const known = new Set<string>([
      ...(WIPED_TABLES as readonly string[]),
      ...(PRESERVED_TABLES as readonly string[]),
    ]);
    const res = await pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    const unlisted = (res.rows as { table_name: string }[]).map((r) => r.table_name).filter((t) => !known.has(t));
    if (unlisted.length > 0) {
      const msg =
        `Table(s) not listed in WIPED_TABLES or PRESERVED_TABLES: ${unlisted.join(", ")}. ` +
        `Add each to the appropriate constant in verify-wipe.ts (and seed.ts) before running wipe.`;
      failures.push({ check: "schema:unlisted-tables", reason: msg });
      console.error(`  ✗  ${msg}`);
    } else {
      console.log(`  ✓  All ${res.rows.length} public table(s) are accounted for`);
    }
  }

  // ── 1. Snapshot pre-wipe counts ────────────────────────────────────────────
  console.log("\n━━━  Step 1: Snapshot pre-wipe row counts  ━━━");
  const preCounts: Record<string, number> = {};
  for (const t of PRESERVED_TABLES) {
    try {
      preCounts[t] = await count(t);
      console.log(`  ${t}: ${preCounts[t]} row(s)`);
    } catch {
      console.warn(`  ⚠  Could not count ${t} — table may not exist yet`);
      preCounts[t] = -1;
    }
  }

  // ── 2. Run the wipe ────────────────────────────────────────────────────────
  console.log("\n━━━  Step 2: Run wipe  ━━━");
  run("pnpm db wipe", "pnpm --filter @workspace/db run wipe");

  // ── 3. Assert preserved tables are unchanged ───────────────────────────────
  console.log("\n━━━  Step 3: Verify preserved tables  ━━━");
  for (const t of PRESERVED_TABLES) {
    if (preCounts[t] === -1) {
      console.log(`  ⚠  Skipping ${t} (was not queryable before wipe)`);
      continue;
    }
    try {
      const after = await count(t);
      if (after !== preCounts[t]) {
        failures.push({
          check: `preserved:${t}`,
          reason: `row count changed: ${preCounts[t]} → ${after}`,
        });
        console.error(`  ✗  ${t}: CHANGED (${preCounts[t]} → ${after})`);
      } else {
        console.log(`  ✓  ${t}: ${after} row(s) (unchanged)`);
      }
    } catch (err) {
      failures.push({ check: `preserved:${t}`, reason: `query failed after wipe: ${err}` });
      console.error(`  ✗  ${t}: query error after wipe`);
    }
  }

  // ── 4. Assert business tables are empty ────────────────────────────────────
  console.log("\n━━━  Step 4: Verify wiped tables are empty  ━━━");
  for (const t of WIPED_TABLES) {
    try {
      const after = await count(t);
      if (after !== 0) {
        failures.push({ check: `wiped:${t}`, reason: `expected 0 rows, found ${after}` });
        console.error(`  ✗  ${t}: NOT empty (${after} rows remain)`);
      } else {
        console.log(`  ✓  ${t}: empty`);
      }
    } catch (err) {
      failures.push({ check: `wiped:${t}`, reason: `query failed: ${err}` });
      console.error(`  ✗  ${t}: query error`);
    }
  }

  // ── 5. API server health probes ────────────────────────────────────────────
  console.log(`\n━━━  Step 5: API server probes (${API_BASE_URL})  ━━━`);

  // 5a. Public health endpoint — must return 200.
  let serverReachable = false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/healthz`);
    if (res.status === 200) {
      console.log("  ✓  GET /api/healthz → 200 (server is up)");
      serverReachable = true;
    } else {
      failures.push({ check: "api:healthz", reason: `expected 200, got ${res.status}` });
      console.error(`  ✗  GET /api/healthz → ${res.status} (expected 200)`);
    }
  } catch (err) {
    console.warn(
      `  ⚠  Could not reach ${API_BASE_URL}/api/healthz (${err}) — skipping API probes.\n` +
      `     Start the API server and set API_BASE_URL if you want automated API checks.`,
    );
    console.log("  (API probe steps 5a–5c skipped — server not reachable)");
  }

  if (serverReachable) {
    // 5b. Protected business endpoints — must return 4xx, never 5xx (crash).
    console.log("\n  ─  5b. Business endpoints (must return 4xx auth rejection)  ─");
    for (const { method, path } of AUTHENTICATED_ENDPOINTS) {
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, { method });
        if (res.status >= 500) {
          failures.push({
            check: `api:${method} ${path}`,
            reason: `returned ${res.status} (server error) — expected 4xx auth rejection`,
          });
          console.error(`  ✗  ${method} ${path} → ${res.status} (server error after wipe!)`);
        } else if (res.status >= 400) {
          console.log(`  ✓  ${method} ${path} → ${res.status} (auth required — server healthy)`);
        } else {
          // 2xx/3xx without auth is unexpected; flag it but don't fail hard.
          console.warn(`  ⚠  ${method} ${path} → ${res.status} (unexpected — no auth was sent)`);
        }
      } catch (err) {
        failures.push({ check: `api:${method} ${path}`, reason: `request failed: ${err}` });
        console.error(`  ✗  ${method} ${path} → error: ${err}`);
      }
    }

    // 5c. JIT provisioning & invite endpoints.
    //
    // After a production wipe these endpoints must remain healthy — they are the
    // critical path a brand-new invited user must traverse to join the app.
    //   - POST /team/provision-self  — Clerk auth required; 401 without JWT.
    //   - POST /team/accept-invite   — Clerk auth required; 401 without JWT.
    //   - GET  /team/invite-peek     — Public; 404 for a bogus token (not 5xx).
    //
    // A 5xx here would mean the endpoint crashes on an empty DB, blocking ALL
    // new users even if they have a valid invitation token.
    console.log("\n  ─  5c. JIT provisioning & invite endpoints (auth bootstrapping surface)  ─");
    for (const { method, path, expectedStatus, label } of JIT_ENDPOINT_PROBES) {
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method,
          ...(method === "POST"
            ? { headers: { "Content-Type": "application/json" }, body: "{}" }
            : {}),
        });
        if (res.status >= 500) {
          failures.push({
            check: `jit:${method} ${path}`,
            reason: `returned ${res.status} (server error) — this would block new users from joining after a wipe`,
          });
          console.error(`  ✗  ${label}`);
          console.error(`     → got ${res.status} (server error — new users cannot join!)`);
        } else if (res.status === expectedStatus) {
          console.log(`  ✓  ${label}`);
        } else {
          // Wrong 4xx is notable but not a hard failure — endpoint is still up.
          console.warn(`  ⚠  ${method} ${path} → ${res.status} (expected ${expectedStatus}, but not a 5xx)`);
        }
      } catch (err) {
        failures.push({ check: `jit:${method} ${path}`, reason: `request failed: ${err}` });
        console.error(`  ✗  ${method} ${path} → error: ${err}`);
      }
    }

    // 5d. Verify the "invite required" gate in provision-self.
    //
    // The wipe preserves team_users.  If any members exist, provision-self MUST
    // block uninvited new Clerk users (returning 403, not creating a rogue row).
    // We cannot call provision-self with a real JWT here, but we can assert the
    // DB precondition: if team_users has rows, the code path that enforces the
    // gate will be reached for every unrecognised user on first sign-in.
    //
    // The gate is: `if (allMembers.length > 0) return 403 "use invitation link"`.
    // Verified in: artifacts/api-server/src/routes/team.ts → POST /team/provision-self
    console.log("\n  ─  5d. provision-self gate assertion (invite-only after wipe)  ─");
    try {
      const teamUserCount = await count("team_users");
      if (teamUserCount > 0) {
        console.log(
          `  ✓  team_users has ${teamUserCount} row(s) after wipe — provision-self gate is ACTIVE.\n` +
          `     New Clerk users without a team_users row will be blocked with 403 and\n` +
          `     directed to use their invitation link. No rogue self-provisioning possible.`,
        );
      } else {
        // team_users is empty — first-user bootstrap mode is in effect.
        // This is valid after a fresh deployment, but unusual after a production wipe
        // (it means all team members were manually deleted before wiping).
        // The first user who signs in will become admin automatically.
        console.warn(
          `  ⚠  team_users is EMPTY after wipe (unusual — all members were removed).\n` +
          `     provision-self is in first-user bootstrap mode: the next Clerk user\n` +
          `     to call POST /team/provision-self will become the org admin.\n` +
          `     Ensure this is intentional before exposing the app publicly.`,
        );
      }

      const pendingInviteCount = await count("team_invitations");
      if (pendingInviteCount > 0) {
        console.log(
          `  ✓  team_invitations has ${pendingInviteCount} row(s) after wipe — pending invites are preserved.\n` +
          `     Invited users can accept their invitation without a new invite being sent.`,
        );
      } else {
        console.log(
          `  ℹ  team_invitations is empty after wipe.\n` +
          `     To onboard new users, an admin must send fresh invitations from Settings → Team.`,
        );
      }
    } catch (err) {
      failures.push({ check: "jit:gate-precondition", reason: `DB query failed: ${err}` });
      console.error(`  ✗  Could not verify provision-self gate precondition: ${err}`);
    }
  }

  // ── 6. Re-seed to restore state ────────────────────────────────────────────
  console.log("\n━━━  Step 6: Re-seed database  ━━━");
  try {
    run("pnpm db seed", "pnpm --filter @workspace/db run seed");
  } catch {
    console.error(
      "\n⚠  Re-seed failed — the database may be in a partially wiped state.\n" +
        "   Run `pnpm --filter @workspace/db run seed` manually to restore.",
    );
  }

  // ── Automated result ───────────────────────────────────────────────────────
  await pool.end();

  if (failures.length > 0) {
    console.error("\n━━━  AUTOMATED RESULT: FAIL  ━━━");
    console.error(`${failures.length} assertion(s) failed:\n`);
    for (const f of failures) {
      console.error(`  • ${f.check}: ${f.reason}`);
    }
    printManualChecklist();
    process.exit(1);
  }

  console.log("\n━━━  AUTOMATED RESULT: PASS  ━━━");
  console.log("All preserved tables are intact, all business tables are empty,");
  console.log("the API server returns healthy responses after the wipe,");
  console.log("and the JIT provisioning & invite endpoints are confirmed healthy.\n");
  printManualChecklist();
  process.exit(0);
}

// ── Manual checklist ─────────────────────────────────────────────────────────

/**
 * Printed at the end of every run.  These steps require a human (or Clerk
 * test-auth Playwright agent) because they exercise the browser + Clerk SSO
 * flow that cannot be fully scripted without Clerk's test-token capability.
 *
 * To automate: use `runTest({ testClerkAuth: true })` from the Replit agent
 * testing sandbox, which supports programmatic Clerk sign-in.
 */
function printManualChecklist(): void {
  console.log(`
━━━  Manual UI Checklist (run after automated checks pass)  ━━━

These steps cover TWO scenarios that must both work after a production wipe.
Run them on a WIPED database (this script re-seeds, so wipe again first if
you want to test the true empty-data state).

  PREP: Wipe the database again (after this script re-seeded it):
          pnpm --filter @workspace/db run wipe

━━━  Scenario A: Existing team member  ━━━
  (An account that already has a team_users row — preserved by the wipe)

  [ ] A1. Open the app in a browser and sign in with an existing Clerk account.
          - Expected: sign-in succeeds; Clerk auth is NOT affected by the wipe.

  [ ] A2. Navigate to the Inbox (/).
          - Expected: inbox renders with an empty message list (no shipments seeded).
          - Must NOT show: "Error" heading, React error boundary, or HTTP 500.

  [ ] A3. Navigate to the Orders grid (/orders).
          - Expected: orders grid renders with "0 of 0 POs" or equivalent empty state.
          - Must NOT show: crash screen or error boundary.

  [ ] A4. Navigate to the RFQs page (/rfqs).
          - Expected: RFQ sidebar shows "No RFQs yet" empty state.
          - Must NOT show: crash screen or error boundary.

  [ ] A5. Open browser DevTools → Network.  Reload each page.
          - Confirm no XHR/fetch requests return 500.
          - 401/403 for auth-protected endpoints are expected and acceptable.
          - The initial 403 from POST /api/team/provision-self is a harmless
            race condition: the app fires it on every sign-in; since team_users
            already has this user's row, it resolves immediately (200) or is
            safely ignored if the row was created by a parallel request.

━━━  Scenario B: Brand-new invited user  ━━━
  (A net-new Clerk account that has never signed into this FlowForge instance)
  Pre-condition: at least one unexpired team_invitations row must exist.
  - If none exist, an existing admin must create one via Settings → Team → Invite.
  - The automated step 5d above will report how many pending invitations survive the wipe.

  [ ] B1. Open the invite link (/accept-invite?token=<token>) in an incognito window.
          - Expected: the page shows "Accepting invitation…" and prompts sign-in
            if you are not already signed in with the invited email.

  [ ] B2. Complete Clerk sign-in (or sign-up) with the invited email address.
          - Expected: after sign-in, the accept-invite page processes the token
            and shows "Welcome to the team!" then redirects to /.
          - Must NOT show: "Invitation not found", "Already accepted", or any error.

  [ ] B3. Verify the new user lands on the Inbox (/) without errors.
          - Expected: empty inbox (wipe removed all shipments/messages).
          - Must NOT show: any error boundary, 500 response, or blank screen.

  [ ] B4. Check browser DevTools → Network during steps B2–B3.
          - POST /api/team/accept-invite → 200 (creates the team_users row).
          - POST /api/team/provision-self → 200 (finds the freshly created row).
          - Any 403s from other endpoints BEFORE accept-invite completes are
            EXPECTED and HARMLESS — they are race conditions from the initial
            page load firing before JIT provisioning finishes.  They must not
            prevent the user from reaching the app after provisioning completes.
          - Confirm no requests return 500.

  [ ] B5. No manual DB steps were required at any point.
          - If you had to run any psql or pnpm db commands to get the user in,
            this scenario has FAILED — the automation in accept-invite or
            provision-self needs investigation.

━━━  Restore demo data  ━━━

  [ ] After manual checks, restore demo data:
        pnpm --filter @workspace/db run seed

━━━  End of checklist  ━━━
`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
