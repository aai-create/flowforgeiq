import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestBuyerSessionValue,
  parseTestBuyerSessionValue,
  testBuyerSessionEnabled,
} from "../testBuyerWorkspace";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_DEPLOYMENT = process.env.REPLIT_DEPLOYMENT;
const ORIGINAL_SESSION_SECRET = process.env.SESSION_SECRET;

beforeEach(() => {
  process.env.NODE_ENV = "development";
  delete process.env.REPLIT_DEPLOYMENT;
  process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough";
});

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_DEPLOYMENT === undefined) delete process.env.REPLIT_DEPLOYMENT;
  else process.env.REPLIT_DEPLOYMENT = ORIGINAL_DEPLOYMENT;
  if (ORIGINAL_SESSION_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SESSION_SECRET;
});

describe("test buyer session cookie", () => {
  it("round-trips for the Clerk identity that created it", () => {
    const value = createTestBuyerSessionValue("user_test_buyer", 42);

    expect(value).toBeTruthy();
    expect(testBuyerSessionEnabled()).toBe(true);
    expect(parseTestBuyerSessionValue(value!, "user_test_buyer")).toBe(42);
  });

  it("rejects a cookie copied to a different Clerk identity", () => {
    const value = createTestBuyerSessionValue("user_test_buyer", 42)!;

    expect(parseTestBuyerSessionValue(value, "user_other")).toBeNull();
  });

  it("rejects tampered cookies", () => {
    const value = createTestBuyerSessionValue("user_test_buyer", 42)!;

    expect(parseTestBuyerSessionValue(`${value}tampered`, "user_test_buyer")).toBeNull();
  });

  it("is disabled when the server is running in production", () => {
    process.env.NODE_ENV = "production";
    const value = createTestBuyerSessionValue("user_test_buyer", 42);

    expect(testBuyerSessionEnabled()).toBe(false);
    // Parsing also refuses a cookie that was issued before a deployment switch.
    expect(parseTestBuyerSessionValue(value!, "user_test_buyer")).toBeNull();
  });
});