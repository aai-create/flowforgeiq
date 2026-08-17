/**
 * Unit tests for the Signal Inbox workflow state machine.
 *
 * These are pure tests — no DB, no mocks, no I/O.
 * Coverage:
 *   - Every permitted state transition succeeds.
 *   - Every invalid state transition throws SignalInboxTransitionError.
 *   - Approval invalidation: editDraft from 'approved' → 'draft_ready'.
 *   - Sent-state guard: no event from any non-'sending' status can produce 'sent'.
 *   - Correct error type and properties.
 */

import { describe, it, expect } from "vitest";
import {
  transitionSignalStatus,
  SignalInboxTransitionError,
  ASSESS_FROM_STATUSES,
  SEND_FROM_STATUSES,
  SKIP_BLOCKED_STATUSES,
  EDIT_BLOCKED_STATUSES,
  TERMINAL_STATUSES,
  type SignalStatus,
  type SignalEvent,
} from "../signal-inbox-workflow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All lifecycle statuses. */
const ALL_STATUSES: SignalStatus[] = [
  "new", "assessing", "draft_ready", "approved",
  "sending", "sent", "send_failed", "send_uncertain", "skipped",
];

function expectTransition(from: SignalStatus, event: SignalEvent, to: SignalStatus) {
  expect(transitionSignalStatus(from, event)).toBe(to);
}

function expectInvalid(from: SignalStatus, event: SignalEvent) {
  expect(() => transitionSignalStatus(from, event)).toThrowError(SignalInboxTransitionError);
}

// ─── Permitted transitions ────────────────────────────────────────────────────

describe("transitionSignalStatus — permitted transitions", () => {
  // startAssess ----------------------------------------------------------------
  it("startAssess: new → assessing", () => expectTransition("new", "startAssess", "assessing"));
  it("startAssess: draft_ready → assessing", () => expectTransition("draft_ready", "startAssess", "assessing"));
  it("startAssess: send_failed → assessing (retry path)", () => expectTransition("send_failed", "startAssess", "assessing"));

  // assessSucceeded / assessFailed --------------------------------------------
  it("assessSucceeded: assessing → draft_ready", () => expectTransition("assessing", "assessSucceeded", "draft_ready"));
  it("assessFailed: assessing → new (safe rollback)", () => expectTransition("assessing", "assessFailed", "new"));

  // approve -------------------------------------------------------------------
  it("approve: draft_ready → approved", () => expectTransition("draft_ready", "approve", "approved"));

  // startSend -----------------------------------------------------------------
  it("startSend: approved → sending", () => expectTransition("approved", "startSend", "sending"));
  it("startSend: send_failed → sending (retry path)", () => expectTransition("send_failed", "startSend", "sending"));

  // send outcomes -------------------------------------------------------------
  it("sendSucceeded: sending → sent", () => expectTransition("sending", "sendSucceeded", "sent"));
  it("sendFailed: sending → send_failed (Gmail 4xx — retryable)", () => expectTransition("sending", "sendFailed", "send_failed"));
  it("sendUncertain: sending → send_uncertain (ambiguous — NOT retryable)", () => expectTransition("sending", "sendUncertain", "send_uncertain"));
  it("revertSend: sending → approved (channel not wired / token expired)", () => expectTransition("sending", "revertSend", "approved"));

  // skip ----------------------------------------------------------------------
  it("skip: new → skipped", () => expectTransition("new", "skip", "skipped"));
  it("skip: assessing → skipped", () => expectTransition("assessing", "skip", "skipped"));
  it("skip: draft_ready → skipped", () => expectTransition("draft_ready", "skip", "skipped"));
  it("skip: approved → skipped", () => expectTransition("approved", "skip", "skipped"));
  it("skip: send_failed → skipped", () => expectTransition("send_failed", "skip", "skipped"));

  // editDraft -----------------------------------------------------------------
  it("editDraft: approved → draft_ready (approval invalidated)", () => expectTransition("approved", "editDraft", "draft_ready"));
  it("editDraft: new → new (no status change)", () => expectTransition("new", "editDraft", "new"));
  it("editDraft: draft_ready → draft_ready (no status change)", () => expectTransition("draft_ready", "editDraft", "draft_ready"));
  it("editDraft: assessing → assessing (no status change)", () => expectTransition("assessing", "editDraft", "assessing"));
  it("editDraft: send_failed → send_failed (no status change)", () => expectTransition("send_failed", "editDraft", "send_failed"));
});

// ─── Invalid transitions ──────────────────────────────────────────────────────

describe("transitionSignalStatus — invalid transitions throw SignalInboxTransitionError", () => {
  // startAssess from invalid sources
  it("startAssess from approved is invalid", () => expectInvalid("approved", "startAssess"));
  it("startAssess from assessing is invalid", () => expectInvalid("assessing", "startAssess"));
  it("startAssess from sending is invalid", () => expectInvalid("sending", "startAssess"));
  it("startAssess from sent is invalid", () => expectInvalid("sent", "startAssess"));
  it("startAssess from skipped is invalid", () => expectInvalid("skipped", "startAssess"));
  it("startAssess from send_uncertain is invalid", () => expectInvalid("send_uncertain", "startAssess"));

  // assessSucceeded / assessFailed from wrong source
  it("assessSucceeded from new is invalid", () => expectInvalid("new", "assessSucceeded"));
  it("assessSucceeded from draft_ready is invalid", () => expectInvalid("draft_ready", "assessSucceeded"));
  it("assessFailed from draft_ready is invalid", () => expectInvalid("draft_ready", "assessFailed"));
  it("assessFailed from new is invalid", () => expectInvalid("new", "assessFailed"));

  // approve from wrong source
  it("approve from new is invalid", () => expectInvalid("new", "approve"));
  it("approve from assessing is invalid", () => expectInvalid("assessing", "approve"));
  it("approve from approved is invalid", () => expectInvalid("approved", "approve"));
  it("approve from sending is invalid", () => expectInvalid("sending", "approve"));

  // startSend from wrong source
  it("startSend from new is invalid", () => expectInvalid("new", "startSend"));
  it("startSend from draft_ready is invalid", () => expectInvalid("draft_ready", "startSend"));
  it("startSend from assessing is invalid", () => expectInvalid("assessing", "startSend"));
  it("startSend from sending is invalid (already sending)", () => expectInvalid("sending", "startSend"));
  it("startSend from sent is invalid", () => expectInvalid("sent", "startSend"));

  // send outcomes from wrong source
  it("sendSucceeded from approved is invalid (must go through sending)", () => expectInvalid("approved", "sendSucceeded"));
  it("sendSucceeded from new is invalid", () => expectInvalid("new", "sendSucceeded"));
  it("sendFailed from approved is invalid", () => expectInvalid("approved", "sendFailed"));
  it("sendUncertain from new is invalid", () => expectInvalid("new", "sendUncertain"));
  it("revertSend from approved is invalid", () => expectInvalid("approved", "revertSend"));

  // skip from terminal statuses
  it("skip from sent is invalid", () => expectInvalid("sent", "skip"));
  it("skip from send_uncertain is invalid", () => expectInvalid("send_uncertain", "skip"));
  it("skip from skipped is invalid (already skipped)", () => expectInvalid("skipped", "skip"));
  it("skip from sending is invalid (in-flight)", () => expectInvalid("sending", "skip"));

  // editDraft from terminal/sending statuses
  it("editDraft from sent is invalid", () => expectInvalid("sent", "editDraft"));
  it("editDraft from send_uncertain is invalid", () => expectInvalid("send_uncertain", "editDraft"));
  it("editDraft from skipped is invalid", () => expectInvalid("skipped", "editDraft"));
  it("editDraft from sending is invalid", () => expectInvalid("sending", "editDraft"));
});

// ─── Approval invalidation ────────────────────────────────────────────────────

describe("approval invalidation — editDraft on an approved message", () => {
  it("editDraft from 'approved' returns 'draft_ready', not 'approved'", () => {
    expect(transitionSignalStatus("approved", "editDraft")).toBe("draft_ready");
    expect(transitionSignalStatus("approved", "editDraft")).not.toBe("approved");
  });

  it("editDraft from non-approved statuses does not change status", () => {
    const nonApprovedEditable: SignalStatus[] = ["new", "assessing", "draft_ready", "send_failed"];
    for (const s of nonApprovedEditable) {
      expect(transitionSignalStatus(s, "editDraft")).toBe(s);
    }
  });
});

// ─── Sent-state guard ─────────────────────────────────────────────────────────

describe("sent-state guard — only the allowed delivery-confirmation path reaches 'sent'", () => {
  it("sendSucceeded from 'sending' is the only path to 'sent'", () => {
    expect(transitionSignalStatus("sending", "sendSucceeded")).toBe("sent");
  });

  it("no other event from 'sending' can produce 'sent'", () => {
    const sendingEvents: SignalEvent[] = [
      "sendFailed", "sendUncertain", "revertSend", "skip",
      "startAssess", "assessSucceeded", "assessFailed", "approve", "startSend", "editDraft",
    ];
    for (const event of sendingEvents) {
      const result = (() => {
        try { return transitionSignalStatus("sending", event); }
        catch { return null; }
      })();
      expect(result).not.toBe("sent");
    }
  });

  it("no event from a non-'sending' status can directly produce 'sent'", () => {
    const nonSendingStatuses = ALL_STATUSES.filter(s => s !== "sending");
    const allEvents: SignalEvent[] = [
      "startAssess", "assessSucceeded", "assessFailed", "approve",
      "startSend", "sendSucceeded", "sendFailed", "sendUncertain",
      "revertSend", "skip", "editDraft",
    ];
    for (const status of nonSendingStatuses) {
      for (const event of allEvents) {
        const result = (() => {
          try { return transitionSignalStatus(status, event); }
          catch { return null; }
        })();
        expect(result).not.toBe("sent");
      }
    }
  });
});

// ─── Error type and properties ────────────────────────────────────────────────

describe("SignalInboxTransitionError", () => {
  it("has the correct error name", () => {
    const err = new SignalInboxTransitionError("new", "sendSucceeded");
    expect(err.name).toBe("SignalInboxTransitionError");
  });

  it("exposes currentStatus and event on the error", () => {
    const err = new SignalInboxTransitionError("approved", "startAssess");
    expect(err.currentStatus).toBe("approved");
    expect(err.event).toBe("startAssess");
  });

  it("is an instance of Error", () => {
    expect(new SignalInboxTransitionError("new", "sendSucceeded")).toBeInstanceOf(Error);
  });

  it("contains both status and event in the message", () => {
    const err = new SignalInboxTransitionError("skipped", "approve");
    expect(err.message).toContain("approve");
    expect(err.message).toContain("skipped");
  });

  it("transitionSignalStatus throws SignalInboxTransitionError (not a plain Error) for invalid transitions", () => {
    expect(() => transitionSignalStatus("sent", "startAssess")).toThrowError(SignalInboxTransitionError);
  });
});

// ─── Exported status sets ─────────────────────────────────────────────────────

describe("exported status sets are consistent with the transition table", () => {
  it("ASSESS_FROM_STATUSES are the only valid sources for startAssess", () => {
    for (const s of ASSESS_FROM_STATUSES) {
      expect(() => transitionSignalStatus(s, "startAssess")).not.toThrow();
    }
    const notAssessable = ALL_STATUSES.filter(s => !ASSESS_FROM_STATUSES.includes(s));
    for (const s of notAssessable) {
      expect(() => transitionSignalStatus(s, "startAssess")).toThrow();
    }
  });

  it("SEND_FROM_STATUSES are the only valid sources for startSend", () => {
    for (const s of SEND_FROM_STATUSES) {
      expect(() => transitionSignalStatus(s, "startSend")).not.toThrow();
    }
    const notSendable = ALL_STATUSES.filter(s => !SEND_FROM_STATUSES.includes(s));
    for (const s of notSendable) {
      expect(() => transitionSignalStatus(s, "startSend")).toThrow();
    }
  });

  it("SKIP_BLOCKED_STATUSES are the only sources where skip is invalid", () => {
    for (const s of SKIP_BLOCKED_STATUSES) {
      expect(() => transitionSignalStatus(s, "skip")).toThrow();
    }
    const skippable = ALL_STATUSES.filter(s => !SKIP_BLOCKED_STATUSES.includes(s));
    for (const s of skippable) {
      expect(transitionSignalStatus(s, "skip")).toBe("skipped");
    }
  });

  it("EDIT_BLOCKED_STATUSES are the only sources where editDraft throws", () => {
    for (const s of EDIT_BLOCKED_STATUSES) {
      expect(() => transitionSignalStatus(s, "editDraft")).toThrow();
    }
    const editable = ALL_STATUSES.filter(s => !EDIT_BLOCKED_STATUSES.includes(s));
    for (const s of editable) {
      expect(() => transitionSignalStatus(s, "editDraft")).not.toThrow();
    }
  });

  it("TERMINAL_STATUSES cannot be entered via startAssess", () => {
    for (const s of TERMINAL_STATUSES) {
      expect(() => transitionSignalStatus(s, "startAssess")).toThrow();
    }
  });

  it("send_uncertain is included in TERMINAL_STATUSES", () => {
    expect(TERMINAL_STATUSES).toContain("send_uncertain");
  });

  it("send_uncertain is included in EDIT_BLOCKED_STATUSES", () => {
    expect(EDIT_BLOCKED_STATUSES).toContain("send_uncertain");
  });

  it("send_uncertain is included in SKIP_BLOCKED_STATUSES", () => {
    expect(SKIP_BLOCKED_STATUSES).toContain("send_uncertain");
  });
});
