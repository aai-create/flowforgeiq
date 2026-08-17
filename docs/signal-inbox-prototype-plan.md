# Signal Inbox Prototype — Architecture Plan

**Task #777** | Status: IN_PROGRESS → COMPLETE

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
  signal_status = 'new'  (set on ingest)
       │
       ▼  [POST /signal-inbox/:id/assess]
  signal_status = 'assessing'
       │
       ├─ success ─▶  signal_status = 'draft_ready'   ← AI draft created in copilot_proposals
       └─ failure ─▶  signal_status = 'new'            ← safe rollback, message not lost
       │
       ▼  [POST /signal-inbox/:id/approve]
  signal_status = 'approved'
       │
       ▼  [POST /signal-inbox/:id/send]
  signal_status = 'sending'
       │
       ├─ success ─▶  signal_status = 'sent'
       └─ failure ─▶  signal_status = 'send_failed'   ← draft preserved, retry available
       │
  [POST /signal-inbox/:id/skip]
  signal_status = 'skipped'  (hidden from default view, preserved in history)
```

Approve and send are **separate** steps — operators can approve a draft and defer the actual send, or edit after approval before sending.

---

## Database Changes

### `messages` table
| Column | Type | Notes |
|--------|------|-------|
| `signal_status` | `TEXT NOT NULL DEFAULT 'new'` | Signal Inbox lifecycle state (see enum above) |

Index: `(org_id, signal_status)` for efficient filtering.

### `copilot_proposals` table
| Column | Type | Notes |
|--------|------|-------|
| `shipment_id` | `INTEGER` (was `NOT NULL`) | Now nullable — Signal Inbox drafts may not have a shipment |
| `source` | `TEXT NOT NULL DEFAULT 'copilot_trigger'` | `'copilot_trigger'` = old trigger engine; `'signal_inbox'` = Signal Inbox |

The Copilot Queue list endpoint filters to `source IS NULL OR source = 'copilot_trigger'` to keep the two surfaces cleanly separated.

Migration: `lib/db/migrations/0020_fast_human_torch.sql`

---

## API Routes

All routes are protected (require Clerk auth) and are mounted under `protectedRouter`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/signal-inbox` | List inbound signals with linked AI drafts |
| `POST` | `/signal-inbox/:id/assess` | Run AI assessment, create draft in `copilot_proposals` |
| `POST` | `/signal-inbox/:id/approve` | Mark draft approved (does **not** send) |
| `POST` | `/signal-inbox/:id/send` | Dispatch approved reply through originating channel |
| `POST` | `/signal-inbox/:id/skip` | Hide signal from default view |
| `PATCH` | `/signal-inbox/:id/draft` | Edit the AI draft body |

### AI draft linkage conventions
- `trigger_ref` = `'signal_inbox:message:<messageId>'` (disambiguates from Copilot Queue's `'message:42'`)
- `source` = `'signal_inbox'`
- `trigger_type` = `'signal_inbox'`
- `action_type` = `'reply'`

### Outbound channels
| Channel | Status |
|---------|--------|
| Gmail (email) | ✅ Live — uses existing Gmail OAuth credentials |
| WhatsApp, WeChat, SMS | 🔮 Not yet wired — approval is saved, send returns `channelNotWired: true` |

---

## Frontend

Signal Inbox lives inside `Home.tsx` as a new `ActiveView = "signal-inbox"` — not a new Wouter route. Nav entry added with a badge showing `draft_ready + send_failed` count.

### New files
- `artifacts/flowforge/src/pages/SignalInbox.tsx` — three-panel UI:
  - Left: signal list with status filter tabs and per-item status chips
  - Right: full message detail + draft editor + action bar (Assess / Approve / Send / Skip / Edit / Retry)

### AI draft hook
`draftReplyWithAI()` from `webhooks.ts` is now `export`-ed and imported by `signal-inbox.ts` for the assess endpoint.

---

## Design Constraints

- **No background job infrastructure** — `POST /assess` runs synchronously inside the request. A 10-second timeout is configurable via `SIGNAL_INBOX_ASSESS_TIMEOUT_MS` env var. Failure rolls back to `'new'` so the message is never lost.
- **Idempotent assess** — if the message is already `draft_ready` with an active proposal, the endpoint returns the existing draft without re-assessing.
- **Draft editing resets approval** — editing a draft after it was approved reverts `signal_status` to `draft_ready`, requiring a fresh approve + send.
- **Audit trail** — every state transition appends an entry to `copilot_proposals.audit_trail`.
- **Send is idempotent-guarded** — concurrent `/send` calls are rejected with HTTP 409 while a send is in progress.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/db/src/schema/messages.ts` | Add `signalStatus` column + index |
| `lib/db/src/schema/copilot.ts` | Make `shipmentId` nullable; add `source` column |
| `lib/db/migrations/0020_fast_human_torch.sql` | Generated migration |
| `lib/api-spec/openapi.yaml` | Add `SignalInboxItem`, `SignalInboxAssessResult`, `SignalInboxSendResult` schemas; 6 new paths; update `Message` and `CopilotProposal` |
| `lib/api-zod/src/generated/` | Re-generated from OpenAPI |
| `lib/api-client-react/src/generated/` | Re-generated from OpenAPI |
| `artifacts/api-server/src/routes/signal-inbox.ts` | New route file (6 handlers) |
| `artifacts/api-server/src/routes/copilot.ts` | Add `source` filter to `GET /copilot/proposals` |
| `artifacts/api-server/src/routes/webhooks.ts` | Export `draftReplyWithAI` |
| `artifacts/api-server/src/routes/index.ts` | Mount `signalInboxRouter` |
| `artifacts/flowforge/src/pages/SignalInbox.tsx` | New UI page |
| `artifacts/flowforge/src/pages/Home.tsx` | Add `'signal-inbox'` ActiveView, nav entry, render `<SignalInbox />` |
