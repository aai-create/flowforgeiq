/**
 * Regression tests for cookie-aware org resolution in orgContextMiddleware for
 * a user with two memberships (different roles/names per org).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { createTestBuyerSessionValue } from "../../lib/testBuyerWorkspace";

const mockSelectWhere = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: (...args: unknown[]) => mockSelectWhere(...args),
      }),
    })),
  },
  teamUsersTable: { orgId: {}, clerkUserId: {}, name: {}, role: {} },
}));

const mockGetAuth = vi.fn();
vi.mock("@clerk/express", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  clerkClient: { users: { getUser: vi.fn() } },
}));

vi.mock("../../lib/impersonation", () => ({ verifyImpersonationToken: vi.fn() }));

import { orgContextMiddleware } from "../requireAuth";

const ORG1_ROW = { orgId: 1, name: "Alice (Acme)", role: "admin" };
const ORG2_ROW = { orgId: 2, name: "Alice (Globex)", role: "member" };
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_SESSION_SECRET = process.env.SESSION_SECRET;

function makeReq(cookie?: string): Request {
  return {
    headers: cookie ? { cookie } : {},
    url: "/x",
    log: { warn: vi.fn() },
  } as unknown as Request;
}

beforeEach(() => {
  mockSelectWhere.mockReset();
  mockGetAuth.mockReset().mockReturnValue({ userId: "user_multi" });
  process.env.NODE_ENV = "development";
  process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough";
});

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_SESSION_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SESSION_SECRET;
});

describe("orgContextMiddleware ff-org-id cookie", () => {
  it("no cookie → falls back to first membership row", async () => {
    mockSelectWhere.mockResolvedValueOnce([ORG1_ROW]);
    const req = makeReq();
    await orgContextMiddleware(req, {} as Response, () => {});
    expect(req.orgId).toBe(1);
    expect(req.role).toBe("admin");
    expect(req.actorName).toBe("Alice (Acme)");
  });

  it("cookie selects org 2 → uses that membership's role/name", async () => {
    // First query is org-scoped (cookie present) and returns the org-2 row.
    mockSelectWhere.mockResolvedValueOnce([ORG2_ROW]);
    const req = makeReq("ff-org-id=2");
    await orgContextMiddleware(req, {} as Response, () => {});
    expect(req.orgId).toBe(2);
    expect(req.role).toBe("member");
    expect(req.actorName).toBe("Alice (Globex)");
    expect(req.isProvisioned).toBe(true);
  });

  it("stale/spoofed cookie → org-scoped query empty, falls back to first valid row", async () => {
    mockSelectWhere
      .mockResolvedValueOnce([]) // org-scoped lookup for orgId=99 finds nothing
      .mockResolvedValueOnce([ORG1_ROW]); // fallback unscoped lookup
    const req = makeReq("ff-org-id=99");
    await orgContextMiddleware(req, {} as Response, () => {});
    expect(req.orgId).toBe(1);
    expect(req.role).toBe("admin");
  });

  it("malformed cookie value → treated as absent (single query)", async () => {
    mockSelectWhere.mockResolvedValueOnce([ORG1_ROW]);
    const req = makeReq("ff-org-id=%E0%A4%A");
    await orgContextMiddleware(req, {} as Response, () => {});
    expect(mockSelectWhere).toHaveBeenCalledTimes(1);
    expect(req.orgId).toBe(1);
  });

  it("unauthenticated → orgId stays 1, unprovisioned", async () => {
    mockGetAuth.mockReturnValue(null);
    const req = makeReq("ff-org-id=2");
    await orgContextMiddleware(req, {} as Response, () => {});
    expect(req.orgId).toBe(1);
    expect(req.isProvisioned).toBe(false);
    expect(mockSelectWhere).not.toHaveBeenCalled();
  });

  it("valid test buyer cookie → selects the isolated org without membership lookup", async () => {
    const cookie = createTestBuyerSessionValue("user_multi", 42);
    const req = makeReq(`ff-test-buyer=${cookie}`);

    await orgContextMiddleware(req, {} as Response, () => {});

    expect(req.orgId).toBe(42);
    expect(req.role).toBe("member");
    expect(req.actorName).toBe("Test Buyer");
    expect(req.isProvisioned).toBe(true);
    expect(req.isTestBuyerSession).toBe(true);
    expect(mockSelectWhere).not.toHaveBeenCalled();
  });
});
