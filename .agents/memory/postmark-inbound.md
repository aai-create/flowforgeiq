---
name: Postmark inbound setup
description: How Postmark inbound email webhooks work and why HMAC auth doesn't apply.
---

Postmark inbound webhooks do NOT sign the request body. Only outbound-event webhooks (bounces, opens, etc.) support HMAC signing. For inbound mail, the recommended auth mechanism is embedding a secret token in the webhook URL as a query parameter:

  POST https://flowforgeiq.com/api/webhooks/email?token=POSTMARK_WEBHOOK_TOKEN

The server uses `timingSafeEqual` to compare the query token against the env var. The old HMAC path (`X-Postmark-Signature`) is kept as a first-pass check so outbound-event webhooks still work if ever wired up.

**Why:** Postmark inbound sends no signature header — every request was hitting `reason: "missing-signature"` → 401 → all emails silently dropped. Confirmed in production logs.

**How to apply:**
- Postmark dashboard → Servers → your server → Inbound → Webhook URL must be set to `https://flowforgeiq.com/api/webhooks/email?token=POSTMARK_WEBHOOK_TOKEN` (replace with actual secret value).
- The Settings page (Email Integrations → Inbound Email Routing) shows this instruction with an amber callout box.
- The webhook URL must point to the **deployed** domain (`flowforgeiq.com`), not a dev localhost — Postmark cannot reach dev servers.
- Inbound messages are now stored with `channel: "email"` (previously "gmail"). The adapter normalizes legacy "gmail" DB records to "email" for backward compat.
