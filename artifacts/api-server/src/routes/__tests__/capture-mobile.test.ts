/**
 * Route-level tests for POST /capture/mobile — auth rejection and happy-path.
 *
 * Strategy:
 *   - Spin up a minimal Express app with the capture router mounted (no Clerk/pino-http stack).
 *   - Do NOT mock requireDeviceTokenAuth — we test it directly against mocked DB responses.
 *   - Mock the DB layer so no real database is touched.
 *   - Mock OpenAI so the async AI enrichment is a no-op.
 *   - Assert that missing / invalid tokens produce 401 with human-readable messages.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ─── DB mock helpers ──────────────────────────────────────────────────────────

/**
 * Builds a thenable object that also exposes a `.limit()` method.
 * This satisfies both:
 *   await db.select().from(t).where(...)           (direct await, no .limit)
 *   await db.select().from(t).where(...).limit(n)  (chained .limit)
 */
function makeQueryResult(rows: unknown[]) {
  const p = Promise.resolve(rows);
  return Object.assign(p, {
    limit: (_n: number) => Promise.resolve(rows),
  });
}

// Per-test queue: each select call pops the next result off the front.
let selectQueue: unknown[][] = [];

const mockInsertReturning = vi.fn();

vi.mock("@workspace/db", () => {
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const rows = selectQueue.shift() ?? [];
            return makeQueryResult(rows);
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    },
    deviceTokensTable: {},
    teamUsersTable: {},
    messagesTable: {},
    suppliersTable: {},
    buyersTable: {},
    shipmentsTable: {},
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  ilike: vi.fn(),
  or: vi.fn(),
}));

vi.mock("../../../middlewares/requireAuth", () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireClerkAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  orgContextMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    // Simulate: no Clerk session on the request (device-token path only)
    req.userId = undefined as unknown as string;
    req.isProvisioned = false;
    next();
  },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"intent":"other","extractedDates":[],"extractedAmounts":[],"shipmentId":null,"confidence":0,"reasoning":"test"}' } }],
        }),
      },
    },
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DEVICE_TOKEN_ROW = {
  id: 7,
  clerkUserId: "user_abc123",
  orgId: 1,
};

const TEAM_USER_ROW = {
  name: "Alice",
  orgId: 1,
};

const INSERTED_MESSAGE = {
  id: 42,
  sender: "Guangzhou Textiles",
  channel: "whatsapp",
  routingStatus: "needs-review",
  supplierId: null,
  snippet: "Order is on the way",
};

const VALID_PAYLOAD = {
  senderRaw: "Guangzhou Textiles",
  messageText: "Order is on the way, ETA next Tuesday.",
  channel: "whatsapp",
};

// ─── App factory ──────────────────────────────────────────────────────────────

async function buildTestApp() {
  const { default: captureRouter } = await import("../capture.js");
  const app = express();
  app.use(express.json());
  // Attach a no-op logger so req.log calls don't throw
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    Object.assign(_req, {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    });
    next();
  });
  app.use(captureRouter);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /capture/mobile — device token authentication", () => {
  beforeEach(() => {
    selectQueue = [];
    mockInsertReturning.mockReset();
  });

  // ── Missing token ───────────────────────────────────────────────────────────

  it("returns 401 with a descriptive message when no Authorization header is provided", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.toLowerCase()).toContain("unauthorized");
    // Message should guide the user — mention session or device token
    expect(res.body.error.toLowerCase()).toMatch(/clerk session|bearer|device token/);
  });

  it("returns 401 with a descriptive message when Authorization header is present but has no Bearer prefix", async () => {
    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Basic dXNlcjpwYXNz")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.toLowerCase()).toContain("unauthorized");
  });

  // ── Invalid / revoked token ─────────────────────────────────────────────────

  it("returns 401 with a descriptive message when the Bearer token is not found in the database (revoked or never issued)", async () => {
    // First DB call is the device_tokens lookup — return no match
    selectQueue = [[]];

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer expired-or-invalid-token-abc123xyz")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.toLowerCase()).toContain("unauthorized");
    // Message should mention the token is invalid or revoked
    expect(res.body.error.toLowerCase()).toMatch(/invalid|revoked/);
  });

  it("returns 401 (not a silent 500 or empty body) when a garbage token string is submitted", async () => {
    // Garbage token hashes to something not in DB
    selectQueue = [[]];

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer !!!garbage!!!")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBeTruthy();
  });

  it("returns 403 with a descriptive message when the token matches but the user is no longer an active team member", async () => {
    // First call: device_tokens lookup → hit
    // Second call: team_users lookup → no row (deprovisioned)
    selectQueue = [[DEVICE_TOKEN_ROW], []];

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-token-for-removed-user")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(403);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error.toLowerCase()).toMatch(/forbidden|team member/);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("returns 201 with capture details when a valid device token is provided", async () => {
    // DB call sequence (select calls in order):
    //  1. device_tokens lookup         → [DEVICE_TOKEN_ROW]
    //  2. team_users membership check  → [TEAM_USER_ROW]
    //  3. dedup check (messagesTable)  → [] (no duplicate)
    //  4. suppliers contact resolution → []
    //  5. buyers contact resolution    → []
    selectQueue = [
      [DEVICE_TOKEN_ROW],
      [TEAM_USER_ROW],
      [],
      [],
      [],
    ];
    mockInsertReturning.mockResolvedValue([INSERTED_MESSAGE]);

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("captured");
    expect(typeof res.body.messageId).toBe("number");
    expect(res.body).toHaveProperty("routingStatus");
    expect(res.body).toHaveProperty("resolvedContactId");
    expect(res.body).toHaveProperty("resolvedContactType");
  });

  it("returns 201 and suppresses duplicate message captured within 5 minutes", async () => {
    // DB call sequence:
    //  1. device_tokens lookup       → [DEVICE_TOKEN_ROW]
    //  2. team_users check           → [TEAM_USER_ROW]
    //  3. dedup check                → [row whose snippet starts with the payload prefix]
    const duplicateRow = { id: 99, snippet: VALID_PAYLOAD.messageText.slice(0, 60) + " extra" };
    selectQueue = [
      [DEVICE_TOKEN_ROW],
      [TEAM_USER_ROW],
      [duplicateRow],
    ];

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("duplicate");
    expect(res.body.messageId).toBe(99);
  });

  it("does NOT suppress a message whose text prefix differs from the recent row (no false positive)", async () => {
    // The recent row in DB has a snippet that does NOT start with the new payload's prefix.
    // Dedup should pass through and insert a fresh message.
    const differentRow = { id: 88, snippet: "Completely different text that shares no prefix" };
    selectQueue = [
      [DEVICE_TOKEN_ROW],
      [TEAM_USER_ROW],
      [differentRow], // dedup query returns a row, but its snippet doesn't match the prefix
      [],             // suppliers contact resolution
      [],             // buyers contact resolution
    ];
    mockInsertReturning.mockResolvedValue([INSERTED_MESSAGE]);

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("captured");
    expect(res.body.messageId).toBe(INSERTED_MESSAGE.id);
  });

  it("returns 400 when the payload is missing required fields (senderRaw)", async () => {
    // Must still pass auth first — provide a valid token path
    selectQueue = [[DEVICE_TOKEN_ROW], [TEAM_USER_ROW]];

    const app = await buildTestApp();

    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send({ messageText: "hello", channel: "whatsapp" }); // missing senderRaw

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

// ─── Dedup window boundary conditions ─────────────────────────────────────────
//
// CAPTURE_DEDUP_WINDOW_MS = 5 * 60 * 1000 (mirrored here; must stay in sync)
//
// Strategy:
//   - Pin Date.now() via vi.useFakeTimers() so boundary timestamps are exact.
//   - The DB is still fully mocked; what the dedup query "returns" is controlled
//     by selectQueue (simulating rows inside vs. outside the window).
//   - For the boundary timestamp tests we also spy on the mocked `gte` function
//     to verify that the route computed the cutoff correctly before querying.

describe("POST /capture/mobile — dedup window boundary conditions", () => {
  const WINDOW_MS = 5 * 60 * 1000; // mirrors CAPTURE_DEDUP_WINDOW_MS in capture.ts
  const PINNED_NOW = 1_750_000_000_000; // a fixed epoch ms; value is arbitrary

  beforeEach(() => {
    selectQueue = [];
    mockInsertReturning.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(PINNED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: auth rows that every capture request needs before hitting dedup
  function authQueue() {
    return [[DEVICE_TOKEN_ROW], [TEAM_USER_ROW]];
  }

  // ── Case 1: clearly inside the window ────────────────────────────────────────

  it("suppresses a duplicate sent well within the 5-minute window (status=duplicate, no DB insert)", async () => {
    const dupeRow = { id: 55, snippet: VALID_PAYLOAD.messageText.slice(0, 60) };

    selectQueue = [
      ...authQueue(),
      [dupeRow], // dedup query returns a matching row
    ];

    const app = await buildTestApp();
    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("duplicate");
    expect(res.body.messageId).toBe(55);

    // Ensure no insert was attempted
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  // ── Case 2: at exactly the boundary ──────────────────────────────────────────
  //
  // The SQL predicate is `receivedAt >= fiveMinutesAgo`, so a message stamped at
  // exactly (now - WINDOW_MS) is still within the window (≥, not >).

  it("treats a message sent at exactly CAPTURE_DEDUP_WINDOW_MS ago as a duplicate and passes the exact boundary timestamp to gte", async () => {
    // Simulate: the DB finds a row whose receivedAt == now - WINDOW_MS (boundary hit)
    const dupeRow = { id: 66, snippet: VALID_PAYLOAD.messageText.slice(0, 60) };

    selectQueue = [
      ...authQueue(),
      [dupeRow],
    ];

    // Get a handle on the mocked gte so we can inspect call args
    const { gte: mockGte } = await import("drizzle-orm");
    vi.mocked(mockGte).mockClear();

    const app = await buildTestApp();
    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send(VALID_PAYLOAD);

    // Route should treat it as a duplicate (DB returned a row)
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("duplicate");
    expect(res.body.messageId).toBe(66);
    expect(mockInsertReturning).not.toHaveBeenCalled();

    // Verify the route computed the cutoff as exactly (now - WINDOW_MS)
    const gteCall = vi.mocked(mockGte).mock.calls.find(
      (c): c is [unknown, Date] => c[1] instanceof Date,
    );
    expect(gteCall).toBeDefined();
    expect((gteCall![1] as Date).getTime()).toBe(PINNED_NOW - WINDOW_MS);
  });

  // ── Case 3: just outside the window ──────────────────────────────────────────
  //
  // A message whose receivedAt is (now - WINDOW_MS - 1ms) falls outside the `>=`
  // predicate — the DB query returns no row and a fresh insert must happen.

  it("treats a message sent at CAPTURE_DEDUP_WINDOW_MS + 1 ms ago as new and inserts a fresh row", async () => {
    // Simulate: dedup query finds nothing (the old message is 1 ms past the window)
    selectQueue = [
      ...authQueue(),
      [],  // dedup query → no rows in window
      [],  // suppliers resolution
      [],  // buyers resolution
    ];
    mockInsertReturning.mockResolvedValue([INSERTED_MESSAGE]);

    // Get a handle on the mocked gte so we can inspect call args
    const { gte: mockGte } = await import("drizzle-orm");
    vi.mocked(mockGte).mockClear();

    const app = await buildTestApp();
    const res = await request(app)
      .post("/capture/mobile")
      .set("Authorization", "Bearer valid-device-token-for-alice")
      .send(VALID_PAYLOAD);

    // Route should proceed to insert
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("captured");
    expect(res.body.messageId).toBe(INSERTED_MESSAGE.id);
    expect(mockInsertReturning).toHaveBeenCalledOnce();

    // Verify the cutoff timestamp is still exactly (now - WINDOW_MS) — confirming
    // the constant hasn't drifted and the 1 ms difference is on the data side, not
    // the predicate side.
    const gteCall = vi.mocked(mockGte).mock.calls.find(
      (c): c is [unknown, Date] => c[1] instanceof Date,
    );
    expect(gteCall).toBeDefined();
    expect((gteCall![1] as Date).getTime()).toBe(PINNED_NOW - WINDOW_MS);
  });
});
