/**
 * Component tests for AcceptInvite.tsx
 *
 * These tests verify the complete user journey from clicking an invite link through
 * account creation. They cover:
 *   - Unauthenticated users are redirected to sign-in
 *   - Missing token → "Invitation error" shown immediately
 *   - Valid token + successful API response → "Welcome to the team!" success state
 *   - Expired token (410) → expired state
 *   - Already-accepted token (409) → already_accepted state
 *   - Wrong Clerk account (403) → wrong_account state with "Switch account" button
 *   - Network error → "Network error" message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockSignOut = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/accept-invite", mockNavigate],
}));

vi.mock("@clerk/react", () => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { AcceptInvite } from "../AcceptInvite";
import { useUser, useClerk } from "@clerk/react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function makeOkResponse(body: unknown): FetchResponse {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function makeErrResponse(status: number, body: unknown): FetchResponse {
  return { ok: false, status, json: () => Promise.resolve(body) };
}

/**
 * Install a global fetch mock that returns `responses` in order.
 * The component issues two concurrent fetches per render:
 *   call 0 → invite-peek  (result used for maskedEmail display)
 *   call 1 → accept-invite (result drives the status state)
 */
function stubFetch(...responses: FetchResponse[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const resp = responses[call] ?? responses[responses.length - 1]!;
      call++;
      return Promise.resolve(resp);
    }),
  );
}

function setWindowSearch(search: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, search },
  });
}

function setupSignedInUser() {
  vi.mocked(useUser).mockReturnValue({
    user: { id: "clerk-test-user" } as ReturnType<typeof useUser>["user"],
    isLoaded: true,
  } as ReturnType<typeof useUser>);
  vi.mocked(useClerk).mockReturnValue({
    signOut: mockSignOut,
  } as unknown as ReturnType<typeof useClerk>);
}

function setupUnauthenticated() {
  vi.mocked(useUser).mockReturnValue({
    user: null,
    isLoaded: true,
  } as ReturnType<typeof useUser>);
  vi.mocked(useClerk).mockReturnValue({
    signOut: mockSignOut,
  } as unknown as ReturnType<typeof useClerk>);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AcceptInvite page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Real timers for every test — prevents fake-timer leaks between tests
    vi.useRealTimers();
    setWindowSearch("?token=test-invite-token");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Unauthenticated ────────────────────────────────────────────────────────

  describe("unauthenticated user", () => {
    it("redirects to /sign-in when no Clerk user is present", async () => {
      setupUnauthenticated();
      render(<AcceptInvite />);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining("/sign-in"),
        );
      });
    });

    it("includes the invite token in the sign-in redirect URL so the user returns to the right page", async () => {
      setupUnauthenticated();
      render(<AcceptInvite />);
      await waitFor(() => {
        const redirectArg = mockNavigate.mock.calls[0]?.[0] as string;
        expect(redirectArg).toContain("sign-in");
        expect(redirectArg).toContain("accept-invite");
        expect(redirectArg).toContain("test-invite-token");
      });
    });
  });

  // ── Missing token ──────────────────────────────────────────────────────────

  describe("missing token", () => {
    it("shows Invitation error when no token is present in the URL", async () => {
      setWindowSearch("");
      setupSignedInUser();
      render(<AcceptInvite />);
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /invitation error/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/no invitation token found/i),
        ).toBeInTheDocument();
      });
    });
  });

  // ── Success path ───────────────────────────────────────────────────────────

  describe("account creation success path", () => {
    it("shows Welcome to the team after the API accepts the invite", async () => {
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }), // invite-peek
        makeOkResponse({ user: { email: "invited@example.com", role: "member" } }), // accept-invite
      );

      render(<AcceptInvite />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /welcome to the team/i }),
        ).toBeInTheDocument();
      });
    });

    it("navigates to / after the success countdown expires", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }),
        makeOkResponse({ user: { email: "invited@example.com", role: "member" } }),
      );

      render(<AcceptInvite />);

      // Wait for async state updates driven by Promise microtasks
      await vi.waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /welcome to the team/i }),
        ).toBeInTheDocument();
      });

      // Now advance the redirect timer
      vi.advanceTimersByTime(3000);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // ── Error states ───────────────────────────────────────────────────────────

  describe("error states", () => {
    it("shows This invite has expired on a 410 response", async () => {
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }),
        makeErrResponse(410, { error: "EXPIRED" }),
      );

      render(<AcceptInvite />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /this invite has expired/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows already been accepted on a 409 response", async () => {
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }),
        makeErrResponse(409, { error: "ALREADY_ACCEPTED" }),
      );

      render(<AcceptInvite />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /already been accepted/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows Wrong account on 403 and renders a Switch account button", async () => {
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }),
        makeErrResponse(403, { error: "Wrong account" }),
      );

      render(<AcceptInvite />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /wrong account/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /switch account/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows Invitation error heading on a generic non-200 response", async () => {
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }),
        makeErrResponse(500, { error: "Internal server error" }),
      );

      render(<AcceptInvite />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /invitation error/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows Network error when fetch rejects entirely", async () => {
      setupSignedInUser();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(makeOkResponse({ maskedEmail: "i***@example.com" }))
          .mockRejectedValueOnce(new Error("Network failure")),
      );

      render(<AcceptInvite />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  // ── Switch account ─────────────────────────────────────────────────────────

  describe("Switch account flow", () => {
    it("calls clerk.signOut with a redirect back to the invite page when the user clicks Switch account", async () => {
      setupSignedInUser();
      stubFetch(
        makeOkResponse({ maskedEmail: "i***@example.com" }),
        makeErrResponse(403, { error: "Wrong account" }),
      );

      render(<AcceptInvite />);

      const switchBtn = await screen.findByRole("button", { name: /switch account/i });
      switchBtn.click();

      expect(mockSignOut).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: expect.stringContaining("accept-invite"),
        }),
      );
    });
  });
});
