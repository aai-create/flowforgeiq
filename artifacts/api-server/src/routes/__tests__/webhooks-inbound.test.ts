/**
 * Regression tests for inbound email persistence.
 *
 * A stable provider Message-ID is scoped to an organization and used only for
 * replay protection. Parent-thread headers (In-Reply-To) must never stand in
 * for that identity, because distinct replies can share the same parent.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let selectQueue: unknown[][] = [];
let lastInsertValues: Record<string, unknown> | null = null;
let warningCalls: unknown[][] = [];
const mockInsertReturning = vi.fn();

function makeQueryChain(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return Object.assign(promise, {
    limit: (_n: number) => makeQueryChain(rows),
    orderBy: (..._args: unknown[]) => makeQueryChain(rows),
  });
}

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => makeQueryChain(selectQueue.shift() ?? [])),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        lastInsertValues = values;
        return {
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: mockInsertReturning,
          }),
        };
      }),
    }),
  },
  documentsTable: {},
  extractionsTable: {},
  shipmentsTable: {},
  suppliersTable: {},
  extractionCorrectionsTable: {},
  messagesTable: { id: "id", orgId: "orgId", gmailMessageId: "gmailMessageId" },
  buyerEmailsTable: {},
  teamUsersTable: { inboundHandle: "inboundHandle", inboundToken: "inboundToken", clerkUserId: "clerkUserId", orgId: "orgId" },
  pushTokensTable: {},
  contactRoutingRulesTable: {},
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  asc: vi.fn(),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
  or: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

vi.mock("../../lib/extraction", () => ({
  runExtraction: vi.fn(),
  extractFromChatText: vi.fn(),
}));

vi.mock("../../lib/pushNotifications", () => ({
  sendExpoPushNotifications: vi.fn(),
}));

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    Object.assign(req, {
      log: {
        info: vi.fn(),
        warn: (...args: unknown[]) => warningCalls.push(args),
        error: vi.fn(),
        debug: vi.fn(),
      },
    });
    next();
  });
  return import("../webhooks.js").then(({ default: router }) => {
    app.use(router);
    return app;
  });
}

const VALID_BODY = {
  From: "supplier@example.com",
  To: "inbox@flowforge.test",
  Subject: "Packing list",
  TextBody: "Please find the packing list attached.",
};

beforeEach(() => {
  process.env.POSTMARK_WEBHOOK_TOKEN = "test-webhook-token";
  selectQueue = [];
  lastInsertValues = null;
  warningCalls = [];
  mockInsertReturning.mockReset();
  vi.clearAllMocks();
});

describe("POST /webhooks/email — persistence and replay safety", () => {
  it("acknowledges a replay without inserting another inbound record", async () => {
    selectQueue = [[{ id: 77 }]];
    const app = await buildTestApp();

    const response = await request(app)
      .post("/webhooks/email?token=test-webhook-token")
      .send({ ...VALID_BODY, MessageID: "<provider-message-77@example.com>" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accepted: true,
      duplicate: true,
      documentIds: [],
    });
    expect(lastInsertValues).toBeNull();
  });

  it("acknowledges an atomic duplicate when a concurrent delivery wins the insert", async () => {
    selectQueue = [[]];
    mockInsertReturning.mockResolvedValue([]);
    const app = await buildTestApp();

    const response = await request(app)
      .post("/webhooks/email?token=test-webhook-token")
      .send({ ...VALID_BODY, MessageID: "<concurrent-provider-message@example.com>" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accepted: true,
      duplicate: true,
      documentIds: [],
    });
    expect(lastInsertValues).toMatchObject({
      gmailMessageId: "concurrent-provider-message@example.com",
      inboundEventKey: "email:provider:concurrent-provider-message@example.com",
      orgId: 1,
    });
  });

  it("keeps a missing provider ID explicit and does not use In-Reply-To as a replay key", async () => {
    mockInsertReturning.mockResolvedValue([{ id: 88 }]);
    const app = await buildTestApp();

    const response = await request(app)
      .post("/webhooks/email?token=test-webhook-token")
      .send({
        ...VALID_BODY,
        Headers: [{ Name: "In-Reply-To", Value: "<parent-message@example.com>" }],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accepted: true,
      duplicate: false,
      documentIds: [],
    });
    expect(lastInsertValues).toMatchObject({
      gmailMessageId: null,
      normalizedBody: VALID_BODY.TextBody,
      orgId: 1,
      routingStatus: "needs-review",
    });
    expect(warningCalls.some((args) =>
      args.some((value) =>
        typeof value === "string" && value.includes("deterministic fallback replay key"),
      ),
    )).toBe(true);
  });
});

describe("Gmail threading repair migration", () => {
  it("repairs both threading columns and adds an organization-scoped replay guard", () => {
    const migrationPath = resolve(
      __dirname,
      "../../../../../lib/db/migrations/0025_repair_gmail_threading_and_replay_guard.sql",
    );
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "gmail_thread_id"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "gmail_message_id"');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "messages_org_gmail_message_id_unique"');
    expect(migration).toContain('("org_id", "gmail_message_id")');
  });
});