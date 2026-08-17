/**
 * Route-level tests for Signal Inbox endpoints.
 *
 * Strategy:
 *   - Spin up a minimal Express app with the signal-inbox router mounted.
 *   - Mock the DB layer entirely so no real database is touched.
 *   - Mock AI assessment (draftReplyWithAI) so tests run instantly.
 *   - Verify: schema convention, source discrimination, trigger-ref convention,
 *     AI-draft idempotency, tenant scoping, Copilot Queue separation, and
 *     that the workflow transition helper gates invalid operations.
 *
 * Coverage map:
 *   Step 1 (schema defaults)       — "schema and defaults" describe block
 *   Step 2 (copilot source)        — "copilot proposal source discrimination" block
 *   Step 3 (AI-draft linkage)      — "AI-draft linkage and idempotency" block
 *   Step 4 (workflow transitions)  — Covered fully by signal-inbox-workflow.test.ts
 *   Step 5 (approval invalidation) — "approval invalidation" block + workflow tests
 *   Step 6 (sent-state guard)      — Covered fully by signal-inbox-workflow.test.ts
 *   Step 7 (route regression)      — "route regression" block
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ─── Shared mock state ────────────────────────────────────────────────────────

/**
 * Per-test queue.  Each entry is the rows for the NEXT db.select() call.
 */
let selectQueue: unknown[][] = [];

/**
 * Arguments captured from each db.update().set() call (in order).
 */
let updateSetArgs: Record<string, unknown>[] = [];

/**
 * Captured args from db.insert().values().
 */
let lastInsertValues: Record<string, unknown> | null = null;

/** Returning mock for db.update chains. Configured per-test. */
const mockUpdateReturning = vi.fn();
/** Returning mock for db.insert chains. Configured per-test. */
const mockInsertReturning = vi.fn();

/**
 * Build a fully chainable thenable result.
 * Supports .limit(), .offset(), .orderBy() at any chain position, and .returning().
 */
function makeQueryChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const chain = Object.assign(p, {
    limit: (_n: number) => makeQueryChain(rows),
    offset: (_n: number) => makeQueryChain(rows),
    orderBy: (..._args: unknown[]) => makeQueryChain(rows),
    returning: () => Promise.resolve(rows),
  });
  return chain;
}

// ─── Module mocks (hoisted by Vitest before imports) ─────────────────────────

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          const rows = selectQueue.shift() ?? [];
          return makeQueryChain(rows);
        }),
      }),
    }),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((args: Record<string, unknown>) => {
        updateSetArgs.push(args);
        return {
          where: vi.fn().mockReturnValue({
            returning: mockUpdateReturning,
          }),
        };
      }),
    })),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
        lastInsertValues = vals;
        return { returning: mockInsertReturning };
      }),
    }),
  },
  messagesTable: { id: "id", orgId: "orgId", signalStatus: "signalStatus", direction: "direction" },
  copilotProposalsTable: {
    id: "id", orgId: "orgId", source: "source", triggerRef: "triggerRef", status: "status",
  },
  gmailCredentialsTable: { orgId: "orgId" },
  shipmentsTable: { id: "id", orgId: "orgId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _type: "eq", val })),
  and: vi.fn((...conds: unknown[]) => ({ _type: "and", conds })),
  ne: vi.fn((_col: unknown, val: unknown) => ({ _type: "ne", val })),
  desc: vi.fn(() => ({ _type: "desc" })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _type: "inArray", vals })),
  not: vi.fn((v: unknown) => ({ _type: "not", v })),
  isNull: vi.fn(() => ({ _type: "isNull" })),
  or: vi.fn((...conds: unknown[]) => ({ _type: "or", conds })),
}));

vi.mock("../../middlewares/requireAuth", () => ({
  resolveOrgId: vi.fn().mockResolvedValue(1),
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireClerkAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock("../webhooks", () => ({
  draftReplyWithAI: vi.fn().mockResolvedValue("AI draft body here"),
}));

vi.mock("../integrations", () => ({
  buildRawEmail: vi.fn().mockReturnValue("base64-raw-email"),
  getValidAccessToken: vi.fn().mockResolvedValue("access-token-abc"),
}));

vi.mock("@workspace/api-zod", () => ({
  ListMessagesResponseItem: {
    parse: vi.fn().mockImplementation((v: unknown) => v),
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    orgId: 1,
    signalStatus: "new",
    direction: "inbound",
    channel: "email",
    sender: "supplier@example.com",
    rawSenderEmail: "supplier@example.com",
    subject: "RE: Order update",
    snippet: "Please find attached",
    fullBody: "Please find attached the packing list.",
    shipmentId: null,
    supplierId: null,
    routingStatus: "routed",
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: 99,
    orgId: 1,
    source: "signal_inbox",
    triggerRef: "signal_inbox:message:42",
    triggerType: "signal_inbox",
    actionType: "reply",
    status: "pending",
    payload: { draftBody: "AI draft body here", channel: "email" },
    editedPayload: null,
    auditTrail: [],
    shipmentId: null,
    reasoning: "AI draft",
    confidence: 0.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── App factory ──────────────────────────────────────────────────────────────

async function buildTestApp() {
  const { default: signalInboxRouter } = await import("../signal-inbox.js");
  const app = express();
  app.use(express.json());
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    Object.assign(_req, {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    });
    next();
  });
  app.use(signalInboxRouter);
  return app;
}

// ─── Per-test reset ────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear call history for all mocks (including draftReplyWithAI accumulation)
  vi.clearAllMocks();

  // Reset local state
  selectQueue = [];
  updateSetArgs = [];
  lastInsertValues = null;

  // Re-establish default implementations after clearAllMocks
  mockUpdateReturning.mockResolvedValue([]);
  mockInsertReturning.mockResolvedValue([]);
});

// ─── Step 1: Schema and defaults ─────────────────────────────────────────────

describe("Step 1: schema and defaults — migration SQL verification", () => {
  const migrationPath = resolve(
    __dirname,
    "../../../../../lib/db/migrations/0020_fast_human_torch.sql",
  );

  it("migration SQL sets signal_status DEFAULT 'new' on the messages table", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    // The migration adds the column with a default of 'new'
    expect(sql).toContain("signal_status");
    expect(sql).toContain("DEFAULT 'new'");
  });

  it("migration SQL sets source DEFAULT 'copilot_trigger' on copilot_proposals", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("source");
    expect(sql).toContain("DEFAULT 'copilot_trigger'");
  });

  it("migration creates an index on (org_id, signal_status) for efficient filtering", () => {
    const sql = readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("messages_signal_status_org_idx");
  });

  it("GET /signal-inbox excludes 'skipped' messages from the default view (ne filter applied)", async () => {
    // Import the ne spy from the mocked drizzle-orm module
    const { ne } = await import("drizzle-orm");
    selectQueue = [[makeMessage({ signalStatus: "new" })], []]; // messages, proposals
    const app = await buildTestApp();
    await request(app).get("/signal-inbox");
    expect(ne).toHaveBeenCalledWith(expect.anything(), "skipped");
  });

  it("GET /signal-inbox applies a direction='inbound' filter to exclude outbound messages", async () => {
    const { eq } = await import("drizzle-orm");
    selectQueue = [[], []];
    const app = await buildTestApp();
    await request(app).get("/signal-inbox");
    expect(eq).toHaveBeenCalledWith(expect.anything(), "inbound");
  });

  it("GET /signal-inbox with explicit status=skipped uses eq (not ne) for the status filter", async () => {
    const { eq, ne } = await import("drizzle-orm");
    selectQueue = [[], []];
    const app = await buildTestApp();
    await request(app).get("/signal-inbox?status=skipped");
    // eq should be called with 'skipped' (the explicit filter)
    expect(eq).toHaveBeenCalledWith(expect.anything(), "skipped");
    // ne should NOT have been called with 'skipped' (that's the default no-filter path)
    const neCalls = (ne as ReturnType<typeof vi.fn>).mock.calls;
    const neCalledWithSkipped = neCalls.some(call => call[1] === "skipped");
    expect(neCalledWithSkipped).toBe(false);
  });
});

// ─── Step 2: Copilot proposal source discrimination ───────────────────────────

describe("Step 2: copilot proposal source discrimination", () => {
  it("Signal Inbox assess creates proposals with source='signal_inbox'", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg], [], []]; // msg, no existing proposal, no shipment
    mockUpdateReturning.mockResolvedValueOnce([{ id: 42 }]); // atomic claim
    mockInsertReturning.mockResolvedValueOnce([makeProposal()]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    await request(app).post("/signal-inbox/42/assess");

    expect(lastInsertValues?.source).toBe("signal_inbox");
  });

  it("Signal Inbox proposals use triggerType='signal_inbox'", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg], [], []];
    mockUpdateReturning.mockResolvedValueOnce([{ id: 42 }]);
    mockInsertReturning.mockResolvedValueOnce([makeProposal()]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    await request(app).post("/signal-inbox/42/assess");

    expect(lastInsertValues?.triggerType).toBe("signal_inbox");
  });

  it("Signal Inbox proposals use actionType='reply'", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg], [], []];
    mockUpdateReturning.mockResolvedValueOnce([{ id: 42 }]);
    mockInsertReturning.mockResolvedValueOnce([makeProposal()]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    await request(app).post("/signal-inbox/42/assess");

    expect(lastInsertValues?.actionType).toBe("reply");
  });

  it("GET /signal-inbox fetches proposals filtered to source='signal_inbox'", async () => {
    // The GET handler explicitly filters copilot_proposals by source='signal_inbox'.
    // We verify by checking that eq() is called with 'signal_inbox'.
    const { eq } = await import("drizzle-orm");
    selectQueue = [[makeMessage()], []]; // messages, proposals
    const app = await buildTestApp();
    await request(app).get("/signal-inbox");

    const eqCallValues = (eq as ReturnType<typeof vi.fn>).mock.calls.map(c => c[1]);
    expect(eqCallValues).toContain("signal_inbox");
  });

  it("copilot route (GET /copilot/proposals) uses or(isNull, eq) to exclude signal_inbox proposals", async () => {
    // The copilot route adds `or(isNull(source), eq(source, 'copilot_trigger'))` to exclude
    // Signal Inbox AI drafts from the Copilot Queue surface.
    // We verify by inspecting copilot.ts source directly.
    const copilotSrc = readFileSync(
      resolve(__dirname, "../copilot.ts"),
      "utf-8",
    );
    // The filter must use isNull and copilot_trigger together
    expect(copilotSrc).toContain("isNull");
    expect(copilotSrc).toContain("copilot_trigger");
    // The comment in copilot.ts explains the exclusion — "Signal Inbox" (with capitals)
    expect(copilotSrc).toContain("Signal Inbox");
  });

  it("Signal Inbox proposals have orgId scoped to the requesting org", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg], [], []];
    mockUpdateReturning.mockResolvedValueOnce([{ id: 42 }]);
    mockInsertReturning.mockResolvedValueOnce([makeProposal()]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    await request(app).post("/signal-inbox/42/assess");

    // resolveOrgId returns 1, so the insert should carry orgId: 1
    expect(lastInsertValues?.orgId).toBe(1);
  });
});

// ─── Step 3: AI-draft linkage and idempotency ─────────────────────────────────

describe("Step 3: AI-draft linkage and idempotency", () => {
  it("trigger-ref convention: assess creates proposal with triggerRef='signal_inbox:message:<id>'", async () => {
    const messageId = 17;
    const msg = makeMessage({ id: messageId, signalStatus: "new" });
    selectQueue = [[msg], [], []];
    mockUpdateReturning.mockResolvedValueOnce([{ id: messageId }]);
    mockInsertReturning.mockResolvedValueOnce([
      makeProposal({ triggerRef: `signal_inbox:message:${messageId}` }),
    ]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    await request(app).post(`/signal-inbox/${messageId}/assess`);

    expect(lastInsertValues?.triggerRef).toBe(`signal_inbox:message:${messageId}`);
  });

  it("assess is idempotent: returns existing draft without re-running AI when message is draft_ready", async () => {
    const { draftReplyWithAI } = await import("../webhooks.js");
    const msg = makeMessage({ signalStatus: "draft_ready" });
    const existingProposal = makeProposal({ id: 77 });
    selectQueue = [[msg], [existingProposal]]; // msg, then findActiveSignalDraft result

    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/42/assess");

    expect(res.status).toBe(200);
    expect(res.body.proposal.id).toBe(77);
    // AI was NOT called — we reused the existing draft
    expect(draftReplyWithAI).not.toHaveBeenCalled();
    // DB insert was NOT called
    expect(lastInsertValues).toBeNull();
  });

  it("assess creates a new proposal (DB insert) when message is 'new' with no existing draft", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg], [], []]; // msg, no proposal, no shipment
    mockUpdateReturning.mockResolvedValueOnce([{ id: 42 }]); // atomic claim
    mockInsertReturning.mockResolvedValueOnce([makeProposal()]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/42/assess");

    expect(res.status).toBe(200);
    expect(lastInsertValues).not.toBeNull();
  });

  it("repeated assess calls on draft_ready with an existing proposal always return the same proposal id", async () => {
    const existingProposal = makeProposal({ id: 55 });

    // First call
    const msg1 = makeMessage({ signalStatus: "draft_ready" });
    selectQueue = [[msg1], [existingProposal]];
    const app = await buildTestApp();
    const res1 = await request(app).post("/signal-inbox/42/assess");

    // Second call (simulate new request)
    vi.clearAllMocks();
    mockUpdateReturning.mockResolvedValue([]);
    selectQueue = [[msg1], [existingProposal]];
    const res2 = await request(app).post("/signal-inbox/42/assess");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.proposal.id).toBe(res2.body.proposal.id);
    expect(res1.body.proposal.id).toBe(55);
  });

  it("tenant scoping: assess returns 404 when the message is not found in the org", async () => {
    selectQueue = [[]]; // empty result → message not found
    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/42/assess");
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });
});

// ─── Workflow transition guard (route integration) ────────────────────────────

describe("Workflow transition guard — routes enforce the state machine", () => {
  it("assess returns 409 for 'approved' (invalid transition)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "approved" })], []];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/assess")).status).toBe(409);
  });

  it("assess returns 409 for 'sending'", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sending" })], []];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/assess")).status).toBe(409);
  });

  it("assess returns 409 for 'sent' (terminal)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sent" })], []];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/assess")).status).toBe(409);
  });

  it("assess returns 409 for 'send_uncertain' (terminal, non-retryable)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "send_uncertain" })], []];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/assess")).status).toBe(409);
  });

  it("assess returns 409 for 'skipped' (terminal)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "skipped" })], []];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/assess")).status).toBe(409);
  });

  it("assess returns 409 when atomic claim fails (race condition)", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg], []];
    mockUpdateReturning.mockResolvedValueOnce([]); // claim row count = 0
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/assess")).status).toBe(409);
  });

  it("approve returns 404 when no active AI draft exists", async () => {
    selectQueue = [[]]; // findActiveSignalDraft returns nothing
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/approve")).status).toBe(404);
  });

  it("approve returns 409 when message is not in draft_ready state (concurrent state change)", async () => {
    const proposal = makeProposal();
    selectQueue = [[proposal], [{ signalStatus: "approved" }]]; // proposal found, then status refetch
    mockUpdateReturning.mockResolvedValueOnce([]); // update returned no rows
    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/42/approve");
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/draft_ready/i);
  });

  it("send returns 400 for 'new' message (draft must be approved first)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "new" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/send")).status).toBe(400);
  });

  it("send returns 409 for 'sending' message (already in progress)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sending" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/send")).status).toBe(409);
  });

  it("send returns 409 for 'sent' message (already dispatched)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sent" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/send")).status).toBe(409);
  });
});

// ─── Step 5: Approval invalidation (route level) ──────────────────────────────

describe("Step 5: approval invalidation — PATCH /draft after approval", () => {
  it("editDraft on an 'approved' message returns signalStatus='draft_ready' in the response", async () => {
    const msg = makeMessage({ signalStatus: "approved" });
    const proposal = makeProposal({ status: "approved" });
    // selectQueue: msg lookup, then findActiveSignalDraft
    selectQueue = [[msg], [proposal]];
    // First update: proposal edit (editedPayload, status: "edited")
    mockUpdateReturning.mockResolvedValueOnce([{
      ...proposal, status: "edited", editedPayload: { draftBody: "edited body" },
    }]);
    // Second update: message status revert (approved → draft_ready)
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "draft_ready" }]);

    const app = await buildTestApp();
    const res = await request(app)
      .patch("/signal-inbox/42/draft")
      .send({ draftBody: "edited body" });

    expect(res.status).toBe(200);
    // The message status update set should contain draft_ready
    const statusUpdateArg = updateSetArgs.find(a => "signalStatus" in a);
    expect(statusUpdateArg?.signalStatus).toBe("draft_ready");
  });

  it("editDraft on a 'draft_ready' message does NOT change signalStatus (no status update needed)", async () => {
    const msg = makeMessage({ signalStatus: "draft_ready" });
    const proposal = makeProposal({ status: "pending" });
    selectQueue = [[msg], [proposal]];
    // Only one update call: proposal edit (no status revert since not approved)
    mockUpdateReturning.mockResolvedValueOnce([{
      ...proposal, status: "edited", editedPayload: { draftBody: "updated" },
    }]);

    const app = await buildTestApp();
    const res = await request(app)
      .patch("/signal-inbox/42/draft")
      .send({ draftBody: "updated" });

    expect(res.status).toBe(200);
    // signalStatus should NOT appear in any update set args
    const statusUpdateArg = updateSetArgs.find(a => "signalStatus" in a);
    expect(statusUpdateArg).toBeUndefined();
  });

  it("editDraft returns 409 for 'sending' message (EDIT_BLOCKED_STATUSES)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sending" })]];
    const app = await buildTestApp();
    const res = await request(app)
      .patch("/signal-inbox/42/draft")
      .send({ draftBody: "anything" });
    expect(res.status).toBe(409);
  });

  it("editDraft returns 409 for 'sent' message (terminal)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sent" })]];
    const app = await buildTestApp();
    const res = await request(app)
      .patch("/signal-inbox/42/draft")
      .send({ draftBody: "anything" });
    expect(res.status).toBe(409);
  });
});

// ─── Step 7: Route regression ─────────────────────────────────────────────────

describe("Step 7: existing route regression — message handling and skip", () => {
  it("assess returns 404 when message does not exist", async () => {
    selectQueue = [[]];
    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/999/assess");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("not found");
  });

  it("skip returns 404 when message does not exist", async () => {
    selectQueue = [[]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/999/skip")).status).toBe(404);
  });

  it("skip returns 409 for 'sent' (terminal, cannot skip)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sent" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/skip")).status).toBe(409);
  });

  it("skip returns 409 for 'send_uncertain' (terminal)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "send_uncertain" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/skip")).status).toBe(409);
  });

  it("skip returns 409 for an already-skipped message", async () => {
    selectQueue = [[makeMessage({ signalStatus: "skipped" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/skip")).status).toBe(409);
  });

  it("skip returns 409 for 'sending' (in-flight — cannot skip)", async () => {
    selectQueue = [[makeMessage({ signalStatus: "sending" })]];
    const app = await buildTestApp();
    expect((await request(app).post("/signal-inbox/42/skip")).status).toBe(409);
  });

  it("skip succeeds (200) for a 'new' message and returns the updated message", async () => {
    const msg = makeMessage({ signalStatus: "new" });
    selectQueue = [[msg]]; // message lookup
    // After update: skip handler calls findActiveSignalDraft → empty (no proposal)
    // (selectQueue empty → returns [])
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "skipped" }]);

    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/42/skip");

    expect(res.status).toBe(200);
    // Skip returns the message directly (flat, not wrapped in { message: ... })
    expect(res.body.signalStatus).toBe("skipped");
  });

  it("skip succeeds (200) for a 'draft_ready' message", async () => {
    const msg = makeMessage({ signalStatus: "draft_ready" });
    selectQueue = [[msg]];
    mockUpdateReturning.mockResolvedValueOnce([{ ...msg, signalStatus: "skipped" }]);

    const app = await buildTestApp();
    const res = await request(app).post("/signal-inbox/42/skip");
    expect(res.status).toBe(200);
    expect(res.body.signalStatus).toBe("skipped");
  });

  it("GET /signal-inbox returns empty array when no messages match", async () => {
    selectQueue = [[], []];
    const app = await buildTestApp();
    const res = await request(app).get("/signal-inbox");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /signal-inbox returns 200 with message+proposal pairs when messages exist", async () => {
    const msg = makeMessage({ signalStatus: "draft_ready" });
    const proposal = makeProposal();
    selectQueue = [[msg], [proposal]];
    const app = await buildTestApp();
    const res = await request(app).get("/signal-inbox");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].message).toBeDefined();
    expect(res.body[0].proposal).toBeDefined();
  });
});
