# Signal Inbox Prototype — Architecture Plan

**Tasks #777, #781** | Status: COMPLETE (Phase 1)

---

## Overview

Signal Inbox is a new product surface within FlowForgeIQ that captures **inbound communications across all channels** (email, WhatsApp, WeChat, etc.), normalises them into "signals", runs an AI assessment to draft a reply, and lets the operator **explicitly approve and dispatch** the reply through the originating channel.

Unlike the Copilot Queue (which is triggered by shipment-lifecycle events and surfaced as proposals against specific shipments), Signal Inbox is a **zero-friction triage queue**: every inbound message that arrives is a signal; the operator decides whether to act.

---

## Lifecycle

```
inbound message arrives (Postmark webhook)
       │
       ▼
  signal_status = 'new'  (set on ingest via DB default)
       │
       ▼  [POST /signal-inbox/:id/assess]
  signal_status = 'assessing'  ◀── atomic claim (WHERE status IN ('new','draft_ready','send_failed'))
       │
       ├─ success ─▶  signal_status = 'draft_ready'   ← AI draft created/updated in copilot_proposals
       │              (conditional — only if status is STILL 'assessing'; skip wins over late assess)
       │
       └─ failure ─▶  signal_status = 'new'            ← conditional rollback; skip wins
       │
       ▼  [POST /signal-inbox/:id/approve]
  signal_status = 'approved'  (conditional — only from 'draft_ready')
       │
       ▼  [POST /signal-inbox/:id/send]
  signal_status = 'sending'  ◀── atomic claim (WHERE status IN ('approved','send_failed'))
       │
       │  [pre-dispatch] proposal → dispatch_pending + dispatchKey UUID recorded
       │
       ├─ Gmail 4xx/5xx ──▶  signal_status = 'send_failed'    ← retryable via /assess or /send
       │
       ├─ network error ──▶  signal_status = 'send_uncertain'  ← TERMINAL, NOT retryable
       │                      (email may have been sent; check Gmail via audit trail dispatchKey)
       │
       ├─ DB finalisation failure after Gmail 200
       │              ──▶  signal_status = 'send_uncertain'  ← TERMINAL, NOT retryable
       │
       └─ success ────▶  signal_status = 'sent'              ← TERMINAL
       │                  (outbound message row inserted; proposal → auto_executed)
       │
  [POST /signal-inbox/:id/skip]  (blocked while 'sending', 'sent', 'send_uncertain', or already 'skipped')
  signal_status = 'skipped'  (hidden from default view, preserved in history)
```

### Status enum (9 values)

| Status | Terminal? | Notes |
|--------|-----------|-------|
| `new` | No | Default on ingest |
| `assessing` | No | AI assessment in progress |
| `draft_ready` | No | AI draft ready for review |
| `approved` | No | Draft approved, not yet sent |
| `sending` | No | Gmail send in progress |
| `sent` | **Yes** | Email delivered; DB finalised |
| `send_failed` | No | Gmail returned 4xx/5xx — retryable |
| `send_uncertain` | **Yes** | Delivery ambiguous — do NOT retry; check Gmail |
| `skipped` | **Yes** | Hidden from default view |

> **`send_uncertain` detail:** Triggered by (a) a network/transport error during the Gmail call (delivery status unknown) or (b) Gmail returning 200 but a subsequent DB finalisation write failing. In both cases the email may or may not have been delivered. The `dispatchKey` UUID and Gmail Message-ID are always written to `copilot_proposals.auditTrail` before any outbound call so operators can verify in Gmail.

Approve and send are **separate** steps — operators can approve a draft and defer the actual send, or edit after approval before sending.

---

## State Machine Module

The transition logic is extracted into a standalone pure module:

**`artifacts/api-server/src/lib/signal-inbox-workflow.ts`**

- `transitionSignalStatus(current, event) → newStatus` — throws `SignalInboxTransitionError` for invalid transitions
- `SignalInboxTransitionError` — includes `currentStatus` and `event` properties
- Exported status-set constants used in route WHERE clauses:
  - `ASSESS_FROM_STATUSES` = `['new', 'draft_ready', 'send_failed']`
  - `SEND_FROM_STATUSES` = `['approved', 'send_failed']`
  - `SKIP_BLOCKED_STATUSES` = `['sending', 'sent', 'send_uncertain', 'skipped']`
  - `EDIT_BLOCKED_STATUSES` = `['sending', 'sent', 'send_uncertain', 'skipped']`
  - `TERMINAL_STATUSES` = `['sent', 'send_uncertain', 'skipped']`

Route handlers call `transitionSignalStatus` for pre-validation (returning 409 before touching the DB) **and** use the returned `newStatus` value directly in all `UPDATE SET` calls. No raw status string literals appear in route handlers.

---

## Database Changes

### `messages` table

| Column | Type | Notes |
|--------|------|-------|
| `signal_status` | `TEXT NOT NULL DEFAULT 'new'` | Signal Inbox lifecycle state (9-value enum — see above) |

Index: `messages_signal_status_org_idx` on `(org_id, signal_status)` for efficient per-org status filtering.

### `copilot_proposals` table

| Column | Type | Notes |
|--------|------|-------|
| `shipment_id` | `INTEGER` (was `NOT NULL`) | Now nullable — Signal Inbox AI drafts may not have a shipment |
| `source` | `TEXT NOT NULL DEFAULT 'copilot_trigger'` | `'copilot_trigger'` = trigger engine; `'signal_inbox'` = Signal Inbox |

The Copilot Queue list endpoint filters to `source IS NULL OR source = 'copilot_trigger'` to keep the two surfaces cleanly separated.

### Migration

**File:** `lib/db/migrations/0020_fast_human_torch.sql`

```sql
ALTER TABLE "copilot_proposals" ALTER COLUMN "shipment_id" DROP NOT NULL;
ALTER TABLE "messages" ADD COLUMN "signal_status" text DEFAULT 'new' NOT NULL;
ALTER TABLE "copilot_proposals" ADD COLUMN "source" text DEFAULT 'copilot_trigger' NOT NULL;
CREATE INDEX "messages_signal_status_org_idx" ON "messages" USING btree ("org_id","signal_status");
```

### Legacy message backfill decision

All messages that existed before this migration receive `signal_status = 'new'` automatically via the `DEFAULT` clause — they will appear in the Signal Inbox list. They will **not** be auto-assessed; an operator must explicitly click Assess to generate a draft. This was an intentional product decision: surfacing all historical messages is acceptable given that operators can skip or assess as needed.

---

## API Routes

All routes are protected (require Clerk auth) and are mounted under `protectedRouter`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/signal-inbox` | List inbound signals with linked AI drafts. Supports `?status=`, `?channel=`, `?limit=`, `?offset=`. Default view excludes `skipped`. |
| `POST` | `/signal-inbox/:id/assess` | Run AI assessment, create/update draft in `copilot_proposals` |
| `POST` | `/signal-inbox/:id/approve` | Mark draft approved (does **not** send) |
| `POST` | `/signal-inbox/:id/send` | Dispatch approved reply through originating channel |
| `POST` | `/signal-inbox/:id/skip` | Hide signal from default view |
| `PATCH` | `/signal-inbox/:id/draft` | Edit the AI draft body |

### AI draft linkage conventions

| Field | Value |
|-------|-------|
| `trigger_ref` | `signal_inbox:message:<messageId>` |
| `source` | `signal_inbox` |
| `trigger_type` | `signal_inbox` |
| `action_type` | `reply` |

> The `trigger_ref` prefix `signal_inbox:message:` disambiguates Signal Inbox drafts from Copilot Queue entries that use `message:42` or `payment:7`.

`findActiveSignalDraft(messageId, orgId)` looks up the active proposal by matching on all four fields above and excluding `status IN ('rejected', 'snoozed')`. There is at most one active draft per message at a time.

### Outbound channels

| Channel | Status |
|---------|--------|
| Gmail (email) | ✅ Live — uses existing Gmail OAuth credentials |
| WhatsApp, WeChat, SMS | 🔮 Not yet wired — atomic claim + approval is saved, send returns `{ dispatched: false, channelNotWired: true }` and reverts to `approved` |

---

## Design Constraints and Safety Contracts

### AI assessment timeout

`POST /assess` runs synchronously. A configurable timeout guards against slow AI responses:

```
SIGNAL_INBOX_ASSESS_TIMEOUT_MS  (default: 10000 ms)
```

If the AI call exceeds the timeout, the catch block fires and the message is conditionally reverted to `new` (see concurrent-claim strategy below). HTTP 500 "Assessment failed. Try again." is returned.

### Concurrent-claim strategy

Every state-mutating endpoint uses **two levels** of protection:

1. **Pre-validation** — `transitionSignalStatus(current, event)` is called before any DB write. Invalid source states return HTTP 409 immediately without touching the database.

2. **Atomic DB claim** — The `UPDATE` uses a `WHERE signal_status IN (...)` guard that matches only the expected source states. If zero rows are updated, another request already changed the state and HTTP 409 is returned.

For `/assess`, the **finalise** write (`draft_ready`) also uses a conditional WHERE (`signal_status = 'assessing'`):

> If a concurrent `/skip` fires while AI assessment is in flight, the skip changes the status to `skipped`. The assess finalisation UPDATE then finds zero rows and returns HTTP 409 — the skip is **not** silently overwritten.

The same conditional pattern applies to the `assessFailed` revert: only reverts to `new` if the message is still `assessing`.

### Send pre-dispatch proof of intent

Before any outbound Gmail call, the proposal is updated to `dispatch_pending` with a `dispatchKey` (a random UUID). This write happens **before** the network call so that the dispatch intent is always durable, regardless of whether the Gmail call or subsequent DB writes succeed.

### Audit trail mechanism

Every state transition appends a structured entry to `copilot_proposals.audit_trail` (a `JSONB` column defaulting to `[]`):

```json
{ "at": "<ISO8601>", "actor": "system" | "user", "action": "<string>", "note": "<optional string>" }
```

Entries are appended (never mutated) so the full history is preserved. The `dispatchKey` and Gmail Message-ID are written in the `send_success` and `send_uncertain` audit entries, enabling operators to verify delivery in Gmail even if DB writes partially failed.

### Draft editing resets approval

Editing a draft (`PATCH /draft`) after it was approved (`approved` state) reverts `signal_status` to `draft_ready` — approval is invalidated. The operator must re-approve before sending. The `editDistance` (word-level normalised Levenshtein, 0–1) is computed and stored in `copilot_proposals` for future draft-quality analytics.

### Idempotent assess

If the message is already `draft_ready` with an active proposal, `POST /assess` returns the existing draft without re-running the AI. The AI is only re-triggered if: (a) the message is `new`, (b) the previous assessment failed (`send_failed`), or (c) `draft_ready` with no active proposal.

### Send idempotency guard

Concurrent `/send` calls race on the atomic claim (`WHERE signal_status IN ('approved','send_failed')`). At most one caller transitions to `sending`; the other gets HTTP 409 immediately. The `dispatchKey` ensures that even a duplicate caller (who somehow proceeds) produces a detectable duplicate in the audit trail.

---

## Deferred Constraints and Known Limitations

- **No DB-level status enum** — `signal_status` is an unconstrained `TEXT` column. Application-level validation via `transitionSignalStatus` is the only enforcement. Phase 2 may add a CHECK constraint.

- **`send_uncertain` race** — In the DB finalisation failure path (`send_uncertain`), the best-effort revert update is in a `.catch()` that swallows errors. If that update also fails, the message remains `sending` indefinitely. Operators can identify these via the audit trail.

- **Historical messages in inbox** — All pre-migration messages receive `signal_status = 'new'` and appear in the inbox. There is no automatic backfill or suppression; operators must manually skip or assess them.

- **Supplier quotes** — Supplier quotes are optional for deals and are **not** part of Signal Inbox Phase 1. The `signal_inbox` source convention and the `copilot_proposals.source` discriminator do not interact with the quote workflow. Deals can exist without supplier quotes; Signal Inbox does not create or modify deal records.

---

## Frontend

Signal Inbox lives inside `Home.tsx` as a new `ActiveView = "signal-inbox"` — not a new Wouter route. Nav entry added with a badge showing `draft_ready + send_failed` count.

### New files

- `artifacts/flowforge/src/pages/SignalInbox.tsx` — three-panel UI:
  - Left: signal list with status filter tabs and per-item status chips
  - Right: full message detail + draft editor + action bar (Assess / Approve / Send / Skip / Edit / Retry)

### AI draft hook

`draftReplyWithAI()` from `webhooks.ts` is `export`-ed and imported by `signal-inbox.ts` for the assess endpoint.

---

## Files Changed (Phase 1)

| File | Change |
|------|--------|
| `lib/db/src/schema/messages.ts` | Add `signalStatus` column + composite index |
| `lib/db/src/schema/copilot.ts` | Make `shipmentId` nullable; add `source` column |
| `lib/db/migrations/0020_fast_human_torch.sql` | Generated migration (see SQL above) |
| `lib/api-spec/openapi.yaml` | Add `SignalInboxItem`, `SignalInboxAssessResult`, `SignalInboxSendResult` schemas; 6 new paths; update `Message` and `CopilotProposal` with `send_uncertain` |
| `lib/api-zod/src/generated/` | Re-generated from OpenAPI (includes `send_uncertain` in status descriptions) |
| `lib/api-client-react/src/generated/` | Re-generated from OpenAPI |
| `artifacts/api-server/src/lib/signal-inbox-workflow.ts` | **New** — pure state machine: `transitionSignalStatus`, `SignalInboxTransitionError`, exported status-set constants |
| `artifacts/api-server/src/routes/signal-inbox.ts` | New route file (6 handlers); all status writes go through workflow helper |
| `artifacts/api-server/src/routes/copilot.ts` | Add `source` filter to `GET /copilot/proposals` |
| `artifacts/api-server/src/routes/webhooks.ts` | Export `draftReplyWithAI` |
| `artifacts/api-server/src/routes/index.ts` | Mount `signalInboxRouter` |
| `artifacts/flowforge/src/pages/SignalInbox.tsx` | New UI page |
| `artifacts/flowforge/src/pages/Home.tsx` | Add `'signal-inbox'` ActiveView, nav entry, render `<SignalInbox />` |
| `artifacts/api-server/src/lib/__tests__/signal-inbox-workflow.test.ts` | **New** — 72 pure unit tests for the state machine |
| `artifacts/api-server/src/routes/__tests__/signal-inbox.test.ts` | **New** — 42 route-level integration tests |
