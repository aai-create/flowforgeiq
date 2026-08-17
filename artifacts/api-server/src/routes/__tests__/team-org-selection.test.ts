/**
 * Tests for the multi-org selection flow:
 *   - parseOrgIdCookie unit tests (real implementation)
 *   - GET /team/my-orgs   → org list + selectedOrgId derived from the ff-org-id cookie
 *   - POST /team/select-org → membership validation + HttpOnly cookie
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelectWhere = vi.fn();          // select().from().where()
const mockSelectJoinWhere = vi.fn();      // select().from().innerJoin().where()

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: (...args: unknown[]) => mockSelectWhere(...args),
        innerJoin: vi.fn().mockReturnValue({
          where: (...args: unknown[]) => mockSelectJoinWhere(...args),
        }),
      }),
    })),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  teamUsersTable: { orgId: {}, clerkUserId: {}, name: {}, role: {} },
  teamInvitationsTable: {},
  organizationsTable: { id: {}, name: {} },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  clerkClient: { users: { getUser: vi.fn() } },
  getAuth: vi.fn(),
}));

vi.mock("postmark", () => ({ ServerClient: vi.fn() }));

// Stub the auth gates; the real cookie helpers live in ../lib/orgCookie and stay unmocked.
vi.mock("../../middlewares/requireAuth", () => ({
  requireClerkAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.userId = "user_123";
    next();
  },
  requireAuth: (_req: Request, res: Response) => res.status(401).end(),
  requireAdmin: (_req: Request, res: Response) => res.status(401).end(),
}));

import teamRouter from "../team";
import { parseOrgIdCookie } from "../../lib/orgCookie";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(teamRouter);
  return app;
}

beforeEach(() => {
  mockSelectWhere.mockReset();
  mockSelectJoinWhere.mockReset();
});

// ─── parseOrgIdCookie ────────────────────────────────────────────────────────

describe("parseOrgIdCookie", () => {
  it("returns null when header is absent", () => {
    expect(parseOrgIdCookie(undefined)).toBeNull();
  });
  it("parses a numeric ff-org-id", () => {
    expect(parseOrgIdCookie("foo=bar; ff-org-id=42; baz=1")).toBe(42);
  });
  it("returns null for a non-numeric value", () => {
    expect(parseOrgIdCookie("ff-org-id=abc")).toBeNull();
    expect(parseOrgIdCookie("ff-org-id=1; ff-org-id2=2".replace("ff-org-id=1; ", "ff-org-id=-1; "))).toBeNull();
  });
  it("ignores other cookies with similar names", () => {
    expect(parseOrgIdCookie("xff-org-id=7")).toBeNull();
  });
});

// ─── GET /team/my-orgs ───────────────────────────────────────────────────────

describe("GET /team/my-orgs", () => {
  const twoOrgs = [
    { orgId: 1, orgName: "Acme", role: "admin" },
    { orgId: 2, orgName: "Globex", role: "member" },
  ];

  it("returns the user's orgs with selectedOrgId=null when no cookie", async () => {
    mockSelectJoinWhere.mockResolvedValue(twoOrgs);
    const res = await request(makeApp()).get("/team/my-orgs");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orgs: twoOrgs, selectedOrgId: null });
  });

  it("reports selectedOrgId when the cookie matches a membership", async () => {
    mockSelectJoinWhere.mockResolvedValue(twoOrgs);
    const res = await request(makeApp())
      .get("/team/my-orgs")
      .set("Cookie", "ff-org-id=2");
    expect(res.body.selectedOrgId).toBe(2);
  });

  it("ignores a cookie pointing at an org the user doesn't belong to", async () => {
    mockSelectJoinWhere.mockResolvedValue(twoOrgs);
    const res = await request(makeApp())
      .get("/team/my-orgs")
      .set("Cookie", "ff-org-id=999");
    expect(res.body.selectedOrgId).toBeNull();
  });
});

// ─── POST /team/select-org ───────────────────────────────────────────────────

describe("POST /team/select-org", () => {
  it("rejects a non-numeric orgId", async () => {
    const res = await request(makeApp()).post("/team/select-org").send({ orgId: "2" });
    expect(res.status).toBe(400);
  });

  it("rejects an org the user doesn't belong to", async () => {
    mockSelectWhere.mockResolvedValue([]);
    const res = await request(makeApp()).post("/team/select-org").send({ orgId: 5 });
    expect(res.status).toBe(403);
  });

  it("sets an HttpOnly ff-org-id cookie for a valid membership", async () => {
    mockSelectWhere.mockResolvedValue([{ orgId: 2 }]);
    const res = await request(makeApp()).post("/team/select-org").send({ orgId: 2 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const setCookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("ff-org-id=2");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie.toLowerCase()).toContain("max-age=2592000");
  });
});
