/**
 * Component tests for ShortcutsGuide.tsx — iOS guard behaviour.
 *
 * The `isIOS` constant in ShortcutsGuide.tsx is evaluated at module-load time,
 * so each user-agent scenario requires a fresh module evaluation.  We achieve
 * this with vi.resetModules() + dynamic import() inside each test.
 *
 * What is tested:
 *   - Non-iOS UA → amber "iPhone only / iPhone required" notices are visible;
 *     "Open in Shortcuts" and download links are absent.
 *   - iOS UA → "Open in Shortcuts" buttons visible; amber notices absent; download
 *     fallback link present.
 *   - QR code renders in both cases and encodes the correct shortcut destination.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ─── Stable mocks (hoisted before any import) ─────────────────────────────────

vi.mock("wouter", () => ({
  useLocation: () => ["/shortcuts", vi.fn()],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("@clerk/react", () => ({
  useUser: () => ({ isSignedIn: true, user: { fullName: "Test User" } }),
  useClerk: () => ({ signOut: vi.fn() }),
  useOrganization: () => ({ organization: null }),
}));

vi.mock("@/components/NavSidebar", () => ({
  NavSidebar: () => React.createElement("nav", { "data-testid": "nav-sidebar" }),
}));

vi.mock("@/components/GlobalHeader", () => ({
  GlobalHeader: ({ breadcrumb }: { breadcrumb?: string }) =>
    React.createElement("header", { "data-testid": "global-header" }, breadcrumb),
}));

// Stub QRCodeSVG — capture the encoded `value` so tests can inspect it
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) =>
    React.createElement("svg", { "data-testid": "qr-code", "data-value": value }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
    writable: true,
  });
}

async function importShortcutsGuide() {
  const mod = await import("../ShortcutsGuide");
  return mod.ShortcutsGuide ?? mod.default;
}

// ─── Non-iOS user-agent ────────────────────────────────────────────────────────

describe("ShortcutsGuide — non-iOS user-agent (desktop Chrome)", () => {
  const DESKTOP_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  beforeEach(() => {
    vi.resetModules();
    setUserAgent(DESKTOP_UA);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("shows the amber 'iPhone only' notice in Step 2", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const notices = screen.getAllByText(/iphone only/i);
    expect(notices.length).toBeGreaterThan(0);
  });

  it("shows the amber 'iPhone required' notice in the CTA panel", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const notices = screen.getAllByText(/iphone required/i);
    expect(notices.length).toBeGreaterThan(0);
  });

  it("does not show an 'Open in Shortcuts' button", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const btn = screen.queryByText(/open in shortcuts/i);
    expect(btn).toBeNull();
  });

  it("does not show a 'Download file instead' link", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const link = screen.queryByText(/download file instead/i);
    expect(link).toBeNull();
  });

  it("renders the QR code regardless of user-agent", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const qr = screen.getByTestId("qr-code");
    expect(qr).toBeTruthy();
  });

  it("QR code encodes a shortcuts:// URL that contains the capture.shortcut path", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const qr = screen.getByTestId("qr-code");
    const rawValue = qr.getAttribute("data-value") ?? "";

    // The QR encodes a shortcuts://import-shortcut?url=<encoded-target> URL.
    // Decode the inner `url` parameter and check it contains the shortcut endpoint.
    expect(rawValue).toContain("shortcuts://import-shortcut");
    const innerUrl = new URL(rawValue).searchParams.get("url") ?? "";
    expect(innerUrl).toContain("/api/shortcuts/capture.shortcut");
  });
});

// ─── iOS user-agent ────────────────────────────────────────────────────────────

describe("ShortcutsGuide — iOS user-agent (iPhone Safari)", () => {
  const IPHONE_UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  beforeEach(() => {
    vi.resetModules();
    setUserAgent(IPHONE_UA);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("shows 'Open in Shortcuts' links (step card + CTA panel)", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const links = screen.getAllByText(/open in shortcuts/i);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("'Open in Shortcuts' href uses the shortcuts:// scheme with the encoded shortcut URL", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const link = screen.getAllByText(/open in shortcuts/i)[0];
    const anchor = link.closest("a");
    expect(anchor).not.toBeNull();
    const href = anchor!.getAttribute("href") ?? "";
    expect(href).toContain("shortcuts://import-shortcut");
    const innerUrl = new URL(href).searchParams.get("url") ?? "";
    expect(innerUrl).toContain("/api/shortcuts/capture.shortcut");
  });

  it("shows a fallback download link pointing to the shortcut file", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    // Two download links render on iOS (step card + CTA panel); both point to
    // the .shortcut file.  Use getAllByRole to handle SVG-child links gracefully.
    const downloadLinks = screen
      .getAllByRole("link")
      .filter(
        (el) =>
          /download/i.test(el.textContent ?? "") &&
          (el.getAttribute("href") ?? "").includes("/api/shortcuts/capture.shortcut"),
      );
    expect(downloadLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT show the amber 'iPhone only' notice", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const notice = screen.queryByText(/iphone only/i);
    expect(notice).toBeNull();
  });

  it("does NOT show the amber 'iPhone required' notice", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const notice = screen.queryByText(/iphone required/i);
    expect(notice).toBeNull();
  });

  it("renders the QR code regardless of user-agent", async () => {
    const ShortcutsGuide = await importShortcutsGuide();
    render(React.createElement(ShortcutsGuide));

    const qr = screen.getByTestId("qr-code");
    expect(qr).toBeTruthy();
  });
});
