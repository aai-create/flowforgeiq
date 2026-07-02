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
 *   5. Probe the live API server (if running) — confirm key endpoints
 *      return 4xx auth errors, never 5xx server errors, after the wipe.
 *   6. Re-seed the database so the app is left in a usable state.
 *
 * Manual UI checklist (printed at the end):
 *   After the script passes, a human should sign in and confirm the three
 *   key pages (Inbox, Orders, RFQs) display their empty states without errors.
 *   The checklist below is the canonical record of those steps.
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
 * Authenticated endpoints to probe after the wipe.
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
  try {
    const res = await fetch(`${API_BASE_URL}/api/healthz`);
    if (res.status === 200) {
      console.log("  ✓  GET /api/healthz → 200 (server is up)");
    } else {
      failures.push({ check: "api:healthz", reason: `expected 200, got ${res.status}` });
      console.error(`  ✗  GET /api/healthz → ${res.status} (expected 200)`);
    }
  } catch (err) {
    console.warn(
      `  ⚠  Could not reach ${API_BASE_URL}/api/healthz (${err}) — skipping API probes.\n` +
      `     Start the API server and set API_BASE_URL if you want automated API checks.`,
    );
    console.log("  (API probe step skipped — server not reachable)");
    goto_step_6: { break goto_step_6; }
  }

  // 5b. Protected endpoints — must return 4xx (auth required), never 5xx (crash).
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
  console.log("and the API server returns healthy responses after the wipe.\n");
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

These steps verify that an authenticated user sees correct empty states —
not error screens — after a production wipe.  Run BEFORE re-seeding if you
want to test the true empty-data state (or wipe again after re-seeding).

  [ ] 1. Open the app in a browser.  If you just ran this script the DB has
         been re-seeded, so wipe again first:
           pnpm --filter @workspace/db run wipe

  [ ] 2. Sign in with an existing Clerk account (or create a new one).
         - Expected: sign-in succeeds; Clerk auth is unaffected by the wipe.

  [ ] 3. Navigate to the Inbox (/).
         - Expected: the inbox renders with an empty message list.
         - Must NOT show: any "Error" heading, React error boundary, or HTTP
           500 message.

  [ ] 4. Navigate to the Orders grid (/orders).
         - Expected: the orders grid renders with "0 of 0 POs" or equivalent
           empty state.
         - Must NOT show: crash screen or error boundary.

  [ ] 5. Navigate to the RFQs page (/rfqs).
         - Expected: the RFQ sidebar shows "No RFQs yet" empty state.
         - Must NOT show: crash screen or error boundary.

  [ ] 6. Open browser DevTools → Network.  Reload each page.
         - Confirm no XHR/fetch requests return 500.
         - 401/403 for auth-protected endpoints are expected and acceptable.

  [ ] 7. After manual checks, restore demo data:
           pnpm --filter @workspace/db run seed

━━━  End of checklist  ━━━
`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
