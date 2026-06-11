---
name: Postmark inbound setup
description: How Postmark inbound email connects to the FlowForge webhook — no custom domain needed
---

Postmark provides a free `@inbound.postmarkapp.com` address with no custom domain required. The current address is stored in `INBOUND_EMAIL_ADDRESS` (shared env var) and surfaced by `GET /settings/inbound-email`.

**Why:** Users can forward WhatsApp/WeChat/iMessage chat exports to the Postmark address and have them auto-ingested via `POST /api/webhooks/email` → `detectChatForward()` → `normaliseChat()` → DB insert.

**How to apply:**
- The webhook URL in Postmark must point to the **deployed** app: `https://flow-forge-sourcing.replit.app/api/webhooks/email` — not localhost (Postmark can't reach dev servers).
- The correct deployed domain is `flow-forge-sourcing.replit.app` (not `flow-forge-souricing` — note the typo in the original setup).
- `INBOUND_EMAIL_ADDRESS` is display-only; changing it does not affect which emails Postmark delivers — that is controlled by the Postmark inbound server address itself.
- The webhook has no Postmark signature verification — acceptable for prototype, worth adding before production hardening.
