import { describe, expect, it } from "vitest";
import { getGmailProfileAddress } from "../gmailProfile";

describe("getGmailProfileAddress", () => {
  it("returns the authenticated Gmail mailbox address", () => {
    expect(getGmailProfileAddress({ emailAddress: "buyer@example.com" })).toBe("buyer@example.com");
  });

  it("trims the mailbox address returned by Gmail", () => {
    expect(getGmailProfileAddress({ emailAddress: "  buyer@example.com  " })).toBe("buyer@example.com");
  });

  it("rejects empty or missing profile addresses instead of inventing an address", () => {
    expect(getGmailProfileAddress({})).toBeNull();
    expect(getGmailProfileAddress({ emailAddress: "   " })).toBeNull();
  });
});