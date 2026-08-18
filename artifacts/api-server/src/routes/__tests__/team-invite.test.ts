/**
 * Route-level integration tests for invite-link URL domain selection.
 *
 * Strategy:
 *   - Spin up a minimal Express app with the team router mounted (bypassing the full
 *     Clerk / pino-http stack that lives in app.ts).
 *   - Mock the auth middlewares so every request arrives as a provisioned admin.
 *   - Mock the DB layer so we never touch a real database.
 *   - Set / clear environment variables per-test to exercise each resolveBaseUrl branch.
 *   - Assert that `inviteUrl` in the response contains the expected domain.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ─── Top-level mocks (hoisted by vitest) ─────────────────────────────────────

const mockDbInsertReturning = vi.fn();
const mockDbSelectFromWhere = vi.fn();
const mockDbUpdateSetWhere = vi.fn();
const mockDbUpdateSetWhereReturning = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockDbInsertReturning,
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockDbSelectFromWhere,
        then: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: mockDbUpdateSetWhereReturning,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
  teamUsersTable: {},
  teamInvitationsTable: {},
  organizationsTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock("../../middlewares/requireAuth", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.userId = "admin-clerk-id";
    req.orgId = 1;
    req.isProvisioned = true;
    next();
  },
  requireAdmin: (req: Request, _res: Response, next: NextFunction) => {
    req.userId = "admin-clerk-id";
    req.orgId = 1;
    req.isProvisioned = true;
    next();
  },
  requireClerkAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.userId = "admin-clerk-id";
    next();
  },
  orgContextMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.orgId = 1;
    req.isProvisioned = true;
    next();
  },
}));

vi.mock("@clerk/express", () => ({
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: "invited@example.com" }],
      }),
    },
  },
}));

vi.mock("postmark", () => ({
  ServerClient: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue({}),
  })),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

const FIXTURE_TOKEN = "tok-fixture-abc123";

const FIXTURE_INVITATION = {
  id: 1,
  email: "invited@example.com",
  role: "member" as const,
  token: FIXTURE_TOKEN,
  invitedBy: "admin-clerk-id",
  orgId: 1,
  acceptedAt: null,
  createdAt: new Date(),
};

const RESENT_INVITATION = { ...FIXTURE_INVITATION, token: "tok-resent-xyz456" };

/** Save then restore process.env keys around each test */
function envGuard(keys: string[]) {
  let snapshot: Record<string, string | undefined> = {};
  beforeEach(() => {
    snapshot = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    keys.forEach(k => delete process.env[k]);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(snapshot)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

/**
 * Build a minimal Express app mounting the (mocked-dep) team router.
 * A tiny middleware attaches a no-op logger so req.log calls in route handlers
 * don't throw.
 */
async function buildTestApp() {
  const { default: teamRouter } = await import("../team.js");
  const app = express();
  app.use(express.json());
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    Object.assign(_req, {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    });
    next();
  });
  app.use(teamRouter);
  return app;
}

// ─── POST /team/invite ────────────────────────────────────────────────────────

describe("POST /team/invite — inviteUrl domain selection", () => {
  envGuard(["APP_URL", "REPLIT_DOMAINS", "REPLIT_DEV_DOMAIN", "POSTMARK_SERVER_TOKEN"]);

  beforeEach(() => {
    mockDbInsertReturning.mockResolvedValue([FIXTURE_INVITATION]);
    // teamUsersTable select (handle uniqueness check) returns nothing taken
    mockDbSelectFromWhere.mockResolvedValue([]);
  });

  // NOTE: the route generates its own crypto token — we assert on domain+path,
  // not the exact token value (which is intentionally random and opaque).
  const INVITE_URL_PATH_RE = /\/accept-invite\?token=[0-9a-f]{48}$/;

  it("uses APP_URL (trailing slash stripped)", async () => {
    process.env.APP_URL = "https://flowforgeiq.com/";
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "invited@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/flowforgeiq\.com/);
    expect(res.body.inviteUrl).toMatch(INVITE_URL_PATH_RE);
    // ensure trailing slash was stripped (no double slash before path)
    expect(res.body.inviteUrl).not.toContain("com//accept");
  });

  it("uses APP_URL and ignores REPLIT_DOMAINS when both are set", async () => {
    process.env.APP_URL = "https://flowforgeiq.com";
    process.env.REPLIT_DOMAINS = "other.replit.app";
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "invited@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/flowforgeiq\.com\//);
    expect(res.body.inviteUrl).not.toContain("replit.app");
  });

  it("uses the first REPLIT_DOMAINS entry when APP_URL is absent", async () => {
    process.env.REPLIT_DOMAINS = "abc.replit.app,xyz.replit.app";
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "invited@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/abc\.replit\.app\//);
    expect(res.body.inviteUrl).not.toContain("xyz.replit.app");
    expect(res.body.inviteUrl).toMatch(INVITE_URL_PATH_RE);
  });

  it("uses REPLIT_DEV_DOMAIN when APP_URL and REPLIT_DOMAINS are absent", async () => {
    process.env.REPLIT_DEV_DOMAIN = "dev.replit.dev";
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "invited@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/dev\.replit\.dev\//);
    expect(res.body.inviteUrl).toMatch(INVITE_URL_PATH_RE);
  });

  it("falls back to a relative path when no domain env var is set", async () => {
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "invited@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.inviteUrl).toMatch(/^\/accept-invite\?token=/);
    expect(res.body.inviteUrl).toMatch(INVITE_URL_PATH_RE);
    // must not be an absolute URL
    expect(res.body.inviteUrl).not.toMatch(/^https?:\/\//);
  });

  it("returns 400 when email is missing", async () => {
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when email has no @ sign", async () => {
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "notanemail" });
    expect(res.status).toBe(400);
  });

  it("includes emailSent=false when POSTMARK_SERVER_TOKEN is absent", async () => {
    const app = await buildTestApp();
    const res = await request(app).post("/team/invite").send({ email: "invited@example.com" });
    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(false);
  });
});

// ─── GET /team ────────────────────────────────────────────────────────────────

describe("GET /team — inviteUrl domain appears in pendingInvitations", () => {
  envGuard(["APP_URL", "REPLIT_DOMAINS", "REPLIT_DEV_DOMAIN"]);

  function mockTeamQuery(pendingInvitations: typeof FIXTURE_INVITATION[]) {
    let call = 0;
    mockDbSelectFromWhere.mockImplementation(() => {
      call++;
      // First call = members list (returns empty array)
      // Second call = pending invitations (returned as-is; the route does .then(rows => rows.filter(…)))
      return Promise.resolve(call === 1 ? [] : pendingInvitations);
    });
  }

  it("includes the APP_URL domain in each pending invitation URL", async () => {
    process.env.APP_URL = "https://flowforgeiq.com";
    mockTeamQuery([FIXTURE_INVITATION]);
    const app = await buildTestApp();

    const res = await request(app).get("/team");

    expect(res.status).toBe(200);
    const invitations = res.body.pendingInvitations as Array<{ inviteUrl: string }>;
    expect(invitations).toHaveLength(1);
    expect(invitations[0]!.inviteUrl).toBe(
      `https://flowforgeiq.com/accept-invite?token=${FIXTURE_TOKEN}`,
    );
  });

  it("includes the REPLIT_DOMAINS domain in each pending invitation URL", async () => {
    process.env.REPLIT_DOMAINS = "abc.replit.app";
    mockTeamQuery([FIXTURE_INVITATION]);
    const app = await buildTestApp();

    const res = await request(app).get("/team");

    expect(res.status).toBe(200);
    const invitations = res.body.pendingInvitations as Array<{ inviteUrl: string }>;
    expect(invitations[0]!.inviteUrl).toMatch(/^https:\/\/abc\.replit\.app\//);
  });

  it("returns relative inviteUrl when no domain env vars are set", async () => {
    mockTeamQuery([FIXTURE_INVITATION]);
    const app = await buildTestApp();

    const res = await request(app).get("/team");

    expect(res.status).toBe(200);
    const invitations = res.body.pendingInvitations as Array<{ inviteUrl: string }>;
    expect(invitations[0]!.inviteUrl).toBe(`/accept-invite?token=${FIXTURE_TOKEN}`);
  });
});

// ─── POST /team/invitations/:id/resend ───────────────────────────────────────

describe("POST /team/invitations/:id/resend — inviteUrl domain selection", () => {
  envGuard(["APP_URL", "REPLIT_DOMAINS", "REPLIT_DEV_DOMAIN", "POSTMARK_SERVER_TOKEN"]);

  function mockResendHappy() {
    mockDbSelectFromWhere.mockResolvedValue([FIXTURE_INVITATION]);
    mockDbUpdateSetWhereReturning.mockResolvedValue([RESENT_INVITATION]);
  }

  // The resend route generates a fresh crypto token — assert on domain+path structure,
  // not the exact token value.
  const RESENT_URL_PATH_RE = /\/accept-invite\?token=[0-9a-f]{48}$/;

  it("uses APP_URL in the resent inviteUrl", async () => {
    process.env.APP_URL = "https://flowforgeiq.com";
    mockResendHappy();
    const app = await buildTestApp();

    const res = await request(app).post("/team/invitations/1/resend");

    expect(res.status).toBe(200);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/flowforgeiq\.com\//);
    expect(res.body.inviteUrl).toMatch(RESENT_URL_PATH_RE);
  });

  it("uses REPLIT_DOMAINS in the resent inviteUrl", async () => {
    process.env.REPLIT_DOMAINS = "abc.replit.app";
    mockResendHappy();
    const app = await buildTestApp();

    const res = await request(app).post("/team/invitations/1/resend");

    expect(res.status).toBe(200);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/abc\.replit\.app\//);
    expect(res.body.inviteUrl).toMatch(RESENT_URL_PATH_RE);
  });

  it("uses REPLIT_DEV_DOMAIN in the resent inviteUrl", async () => {
    process.env.REPLIT_DEV_DOMAIN = "dev.replit.dev";
    mockResendHappy();
    const app = await buildTestApp();

    const res = await request(app).post("/team/invitations/1/resend");

    expect(res.status).toBe(200);
    expect(res.body.inviteUrl).toMatch(/^https:\/\/dev\.replit\.dev\//);
    expect(res.body.inviteUrl).toMatch(RESENT_URL_PATH_RE);
  });

  it("returns 404 when the invitation does not exist", async () => {
    mockDbSelectFromWhere.mockResolvedValue([]);
    const app = await buildTestApp();
    const res = await request(app).post("/team/invitations/999/resend");
    expect(res.status).toBe(404);
  });

  it("returns 409 when the invitation is already accepted", async () => {
    mockDbSelectFromWhere.mockResolvedValue([
      { ...FIXTURE_INVITATION, acceptedAt: new Date() },
    ]);
    const app = await buildTestApp();
    const res = await request(app).post("/team/invitations/1/resend");
    expect(res.status).toBe(409);
  });
});

// ─── POST /team/accept-invite — the acceptance + account-creation path ────────

describe("POST /team/accept-invite — invitation acceptance and account provisioning", () => {
  const INVITED_EMAIL = "invited@example.com";
  const CLERK_USER_ID = "admin-clerk-id"; // injected by the requireClerkAuth mock

  const VALID_INVITATION = {
    ...FIXTURE_INVITATION,
    email: INVITED_EMAIL,
    // createdAt set to now so TTL check passes
    createdAt: new Date(),
    acceptedAt: null,
  };

  const PROVISIONED_USER = {
    clerkUserId: CLERK_USER_ID,
    email: INVITED_EMAIL,
    name: "invited",
    role: "member",
    inboundToken: "tok1234",
    inboundHandle: "invited",
    orgId: 1,
    createdAt: new Date(),
  };

  it("success path: valid token + matching email → 200 + user row created", async () => {
    // DB call sequence (in order):
    //  1. find invitation by token             → [VALID_INVITATION]
    //  2. existing membership in invited org   → [] (new membership)
    //  3. any existing row (name reuse)        → [] (brand-new user)
    //  4. generateUniqueHandle uniqueness      → [] (handle not taken)
    //  5. post-insert confirmation select      → [PROVISIONED_USER]
    //  6. final select after acceptedAt update → [PROVISIONED_USER]
    mockDbSelectFromWhere
      .mockResolvedValueOnce([VALID_INVITATION])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([PROVISIONED_USER])
      .mockResolvedValueOnce([PROVISIONED_USER]);

    // The Clerk mock already returns emailAddresses containing INVITED_EMAIL
    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: FIXTURE_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(INVITED_EMAIL);
    expect(res.body.user.role).toBe("member");
  });

  it("missing token → 400", async () => {
    const app = await buildTestApp();
    const res = await request(app).post("/team/accept-invite").send({});
    expect(res.status).toBe(400);
  });

  it("unknown token → 404", async () => {
    mockDbSelectFromWhere.mockResolvedValueOnce([]); // no invitation found
    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: "no-such-token" });
    expect(res.status).toBe(404);
  });

  it("already accepted token → 409 ALREADY_ACCEPTED", async () => {
    mockDbSelectFromWhere.mockResolvedValueOnce([
      { ...VALID_INVITATION, acceptedAt: new Date(Date.now() - 1000) },
    ]);
    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: FIXTURE_TOKEN });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("ALREADY_ACCEPTED");
  });

  it("expired token (> 7 days old) → 410 EXPIRED", async () => {
    const EIGHT_DAYS_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    mockDbSelectFromWhere.mockResolvedValueOnce([
      { ...VALID_INVITATION, createdAt: EIGHT_DAYS_AGO },
    ]);
    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: FIXTURE_TOKEN });
    expect(res.status).toBe(410);
    expect(res.body.error).toBe("EXPIRED");
  });

  it("signed-in Clerk email does not match invitation → 403", async () => {
    // The Clerk mock returns "invited@example.com" but the invitation is for a different address
    mockDbSelectFromWhere.mockResolvedValueOnce([
      { ...VALID_INVITATION, email: "different@example.com" },
    ]);
    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: FIXTURE_TOKEN });
    expect(res.status).toBe(403);
  });

  it("existing team member with inboundHandle accepts → 200 (no duplicate insert)", async () => {
    // DB sequence:
    //  1. find invitation → [VALID_INVITATION]
    //  2. existing team_users check → [PROVISIONED_USER] (user already exists with handle)
    //  3. final select → [PROVISIONED_USER]
    mockDbSelectFromWhere
      .mockResolvedValueOnce([VALID_INVITATION])
      .mockResolvedValueOnce([PROVISIONED_USER])
      .mockResolvedValueOnce([PROVISIONED_USER]);

    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: FIXTURE_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.user.clerkUserId).toBe(CLERK_USER_ID);
  });

  it("user already in org 1 accepts an invite to org 2 → new membership row created for org 2", async () => {
    const ORG2_INVITATION = { ...VALID_INVITATION, orgId: 2, role: "manager" };
    const ORG2_USER = { ...PROVISIONED_USER, orgId: 2, role: "manager", inboundHandle: "invited2" };
    // DB call sequence (in order):
    //  1. find invitation by token             → [ORG2_INVITATION]
    //  2. existing membership in org 2         → [] (not a member there yet)
    //  3. any existing row (name reuse)        → [PROVISIONED_USER] (org 1 row)
    //  4. generateUniqueHandle uniqueness      → [] (handle free)
    //  5. post-insert confirmation select      → [ORG2_USER]
    //  6. final select (org 2 row)             → [ORG2_USER]
    mockDbSelectFromWhere
      .mockResolvedValueOnce([ORG2_INVITATION])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([PROVISIONED_USER])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([ORG2_USER])
      .mockResolvedValueOnce([ORG2_USER]);

    const app = await buildTestApp();
    const res = await request(app)
      .post("/team/accept-invite")
      .send({ token: FIXTURE_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.user.orgId).toBe(2);
    expect(res.body.user.role).toBe("manager");
    // The org-selection cookie should point at the newly joined org
    const setCookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("ff-org-id=2");
    expect(setCookie).toContain("HttpOnly");
  });
});
