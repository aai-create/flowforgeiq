import { describe, it, expect } from "vitest";
import { resolveBaseUrl } from "../resolveBaseUrl";

describe("resolveBaseUrl", () => {
  it("returns APP_URL stripped of trailing slash when APP_URL is set", () => {
    expect(resolveBaseUrl({ APP_URL: "https://flowforgeiq.com/" })).toBe("https://flowforgeiq.com");
    expect(resolveBaseUrl({ APP_URL: "https://flowforgeiq.com" })).toBe("https://flowforgeiq.com");
  });

  it("ignores REPLIT_DOMAINS and REPLIT_DEV_DOMAIN when APP_URL is set", () => {
    expect(
      resolveBaseUrl({
        APP_URL: "https://flowforgeiq.com/",
        REPLIT_DOMAINS: "other.replit.app",
        REPLIT_DEV_DOMAIN: "dev.replit.dev",
      })
    ).toBe("https://flowforgeiq.com");
  });

  it("uses the first REPLIT_DOMAINS entry when APP_URL is not set", () => {
    expect(resolveBaseUrl({ REPLIT_DOMAINS: "abc.replit.app,xyz.replit.app" })).toBe(
      "https://abc.replit.app"
    );
  });

  it("trims whitespace around REPLIT_DOMAINS entries", () => {
    expect(resolveBaseUrl({ REPLIT_DOMAINS: "  abc.replit.app , xyz.replit.app" })).toBe(
      "https://abc.replit.app"
    );
  });

  it("ignores REPLIT_DEV_DOMAIN when REPLIT_DOMAINS is set", () => {
    expect(
      resolveBaseUrl({ REPLIT_DOMAINS: "abc.replit.app", REPLIT_DEV_DOMAIN: "dev.replit.dev" })
    ).toBe("https://abc.replit.app");
  });

  it("uses REPLIT_DEV_DOMAIN when neither APP_URL nor REPLIT_DOMAINS is set", () => {
    expect(resolveBaseUrl({ REPLIT_DEV_DOMAIN: "dev.replit.dev" })).toBe(
      "https://dev.replit.dev"
    );
  });

  it("returns empty string when no env vars are set", () => {
    expect(resolveBaseUrl({})).toBe("");
  });

  it("builds a correct invite URL for each code path", () => {
    const token = "abc123";

    const fromAppUrl = `${resolveBaseUrl({ APP_URL: "https://flowforgeiq.com" })}/accept-invite?token=${token}`;
    expect(fromAppUrl).toBe("https://flowforgeiq.com/accept-invite?token=abc123");

    const fromDomains = `${resolveBaseUrl({ REPLIT_DOMAINS: "abc.replit.app" })}/accept-invite?token=${token}`;
    expect(fromDomains).toBe("https://abc.replit.app/accept-invite?token=abc123");

    const fromDevDomain = `${resolveBaseUrl({ REPLIT_DEV_DOMAIN: "dev.replit.dev" })}/accept-invite?token=${token}`;
    expect(fromDevDomain).toBe("https://dev.replit.dev/accept-invite?token=abc123");

    const fromNone = `${resolveBaseUrl({})}/accept-invite?token=${token}`;
    expect(fromNone).toBe("/accept-invite?token=abc123");
  });
});
