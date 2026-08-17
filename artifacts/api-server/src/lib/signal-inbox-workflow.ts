/**
 * Signal Inbox workflow state machine.
 *
 * Centralises all permitted state transitions so route handlers
 * cannot invent ad-hoc transitions or silently ignore invalid ones.
 *
 * Lifecycle:
 *
 *   new ──────────────────────────────────────────────────────────────┐
 *     │                                                               │
 *     │ startAssess (also from draft_ready, send_failed)              │ assessFailed
 *     ▼                                                               │
 *   assessing ──────────────────────────────────────────────────────▶ new
 *     │
 *     │ assessSucceeded
 *     ▼
 *   draft_ready ◀─────────────────────── editDraft (from approved)
 *     │
 *     │ approve
 *     ▼
 *   approved ─────────────────────────── revertSend (from sending, channel not wired / token expired)
 *     │
 *     │ startSend (also from send_failed)
 *     ▼
 *   sending
 *     │
 *     ├─ sendSucceeded  ──▶  sent           (terminal — email delivered, DB finalised)
 *     ├─ sendFailed     ──▶  send_failed    (Gmail 4xx — retryable via startAssess or startSend)
 *     └─ sendUncertain  ──▶  send_uncertain (network error or DB finalisation failure —
 *                                            NOT retryable; email may already be in Gmail)
 *
 *   [any non-terminal] ── skip ──▶  skipped  (terminal — hidden from default view)
 *
 * NOTE: This is a pure state-machine validator. Route handlers are still responsible
 * for the atomic conditional DB update (WHERE signal_status = <current>) that guards
 * against concurrent-request race conditions.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SignalStatus =
  | "new"
  | "assessing"
  | "draft_ready"
  | "approved"
  | "sending"
  | "sent"
  | "send_failed"
  /** Email was sent (or may have been sent) but DB finalisation failed, or delivery is
   *  ambiguous due to a network error. Do NOT retry — retrying may duplicate the email.
   *  Operators should verify in Gmail using the dispatchKey / Gmail Message-ID in the audit trail. */
  | "send_uncertain"
  | "skipped";

export type SignalEvent =
  | "startAssess"     // new | draft_ready | send_failed → assessing
  | "assessSucceeded" // assessing → draft_ready
  | "assessFailed"    // assessing → new
  | "approve"         // draft_ready → approved
  | "startSend"       // approved | send_failed → sending
  | "sendSucceeded"   // sending → sent
  | "sendFailed"      // sending → send_failed  (Gmail 4xx — retryable)
  | "sendUncertain"   // sending → send_uncertain  (network error / DB failure — NOT retryable)
  | "revertSend"      // sending → approved  (channel not wired / token expired)
  | "skip"            // non-terminal → skipped
  | "editDraft";      // approved → draft_ready; non-terminal others → current (no status change); terminal → error

// ─── Error ───────────────────────────────────────────────────────────────────

export class SignalInboxTransitionError extends Error {
  readonly currentStatus: SignalStatus;
  readonly event: SignalEvent;

  constructor(current: SignalStatus, event: SignalEvent) {
    super(
      `Signal Inbox: invalid transition — cannot apply event '${event}' in status '${current}'`,
    );
    this.name = "SignalInboxTransitionError";
    this.currentStatus = current;
    this.event = event;
  }
}

// ─── Status sets (exported for use in route WHERE clauses) ───────────────────

/** Source statuses that the 'assess' atomic DB claim must match. */
export const ASSESS_FROM_STATUSES: SignalStatus[] = ["new", "draft_ready", "send_failed"];

/** Source statuses that the 'send' atomic DB claim must match. */
export const SEND_FROM_STATUSES: SignalStatus[] = ["approved", "send_failed"];

/** Statuses from which `skip` is rejected. */
export const SKIP_BLOCKED_STATUSES: SignalStatus[] = ["sending", "sent", "send_uncertain", "skipped"];

/** Statuses from which draft editing is rejected. */
export const EDIT_BLOCKED_STATUSES: SignalStatus[] = ["sending", "sent", "send_uncertain", "skipped"];

/** All terminal statuses — once reached, no further user-initiated transitions are permitted. */
export const TERMINAL_STATUSES: SignalStatus[] = ["sent", "send_uncertain", "skipped"];

// ─── Transition function ─────────────────────────────────────────────────────

/**
 * Apply a Signal Inbox workflow event to the current status.
 *
 * Returns the new status if the transition is valid.
 * Throws `SignalInboxTransitionError` for any invalid transition.
 *
 * For `editDraft`:
 *   - Throws if `current` is in `EDIT_BLOCKED_STATUSES`.
 *   - Returns `"draft_ready"` if `current === "approved"` (invalidates the approval).
 *   - Returns `current` unchanged for any other non-terminal status (edit does not change status).
 *
 * For `skip`:
 *   - Throws if `current` is in `SKIP_BLOCKED_STATUSES`.
 *   - Returns `"skipped"` otherwise.
 */
export function transitionSignalStatus(current: SignalStatus, event: SignalEvent): SignalStatus {
  switch (event) {
    case "startAssess":
      if (ASSESS_FROM_STATUSES.includes(current)) return "assessing";
      break;

    case "assessSucceeded":
      if (current === "assessing") return "draft_ready";
      break;

    case "assessFailed":
      if (current === "assessing") return "new";
      break;

    case "approve":
      if (current === "draft_ready") return "approved";
      break;

    case "startSend":
      if (SEND_FROM_STATUSES.includes(current)) return "sending";
      break;

    case "sendSucceeded":
      if (current === "sending") return "sent";
      break;

    case "sendFailed":
      if (current === "sending") return "send_failed";
      break;

    case "sendUncertain":
      if (current === "sending") return "send_uncertain";
      break;

    case "revertSend":
      if (current === "sending") return "approved";
      break;

    case "skip":
      if (!SKIP_BLOCKED_STATUSES.includes(current)) return "skipped";
      break;

    case "editDraft":
      if (EDIT_BLOCKED_STATUSES.includes(current)) {
        throw new SignalInboxTransitionError(current, event);
      }
      // approved → draft_ready (approval invalidated); all other non-terminal → unchanged
      return current === "approved" ? "draft_ready" : current;
  }

  throw new SignalInboxTransitionError(current, event);
}
