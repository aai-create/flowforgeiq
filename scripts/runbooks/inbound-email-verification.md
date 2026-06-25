# Inbound Email Verification Runbook

Use this runbook after completing the two external DNS + Postmark setup steps to confirm that inbound emails are actually arriving end-to-end.

---

## Prerequisites

Before running these checks, ensure both external steps are done:

1. **DNS MX record** — in your DNS provider (Cloudflare, Route 53, etc.) add:
   ```
   inbound.flowforgeiq.com   MX   10   inbound.postmarkapp.com
   ```
   Propagation typically takes 5–60 minutes. Verify with:
   ```bash
   dig MX inbound.flowforgeiq.com
   # Expected: 10 inbound.postmarkapp.com.
   ```

2. **Postmark inbound server domain** — in the Postmark dashboard → Servers → your server → Settings → Inbound, set the inbound domain to `inbound.flowforgeiq.com`.

3. **Postmark webhook URL** — in Postmark → Servers → your server → Webhooks, the inbound webhook must point to:
   ```
   https://<your-deployed-domain>/api/webhooks/email
   ```
   The `X-Postmark-Signature` header is verified against the `POSTMARK_WEBHOOK_TOKEN` secret. Make sure that secret is set in Replit Secrets.

---

## Step 1 — Confirm the inbound address uses the live domain

Call the settings endpoint and verify the domain is `inbound.flowforgeiq.com` (not the fallback `flowforgeiq.com`):

```bash
# Replace <TOKEN> with a valid Clerk JWT for your user
curl -s -H "Authorization: Bearer <TOKEN>" \
  https://<your-deployed-domain>/api/settings/inbound-email | jq .
```

Expected response:
```json
{
  "inboundEmailAddress": "iq+<handle>@inbound.flowforgeiq.com"
}
```

If the domain shows `flowforgeiq.com` (no `inbound.` prefix), the `INBOUND_EMAIL_BASE` environment variable is not set. Add it to Replit Secrets:
```
INBOUND_EMAIL_BASE=iq@inbound.flowforgeiq.com
```

---

## Step 2 — Check the pipeline health endpoint

```bash
curl -s -H "Authorization: Bearer <TOKEN>" \
  https://<your-deployed-domain>/api/settings/inbound-health | jq .
```

| `status`    | Meaning                                                                                     |
|-------------|--------------------------------------------------------------------------------------------|
| `healthy`   | An inbound email was received within the last 7 days — pipeline is live.                   |
| `stale`     | Emails were received at some point but not in the last 7 days — check Postmark webhook logs.|
| `unknown`   | No inbound emails ever recorded — complete Step 3 to run the smoke test.                   |

The `configured` field must be `true` for the pipeline to be active.

---

## Step 3 — Send a smoke-test email

1. Copy the `inboundEmailAddress` value from Step 1 (e.g. `iq+alice@inbound.flowforgeiq.com`).
2. From any external email client (Gmail, Outlook, etc.), send a test email to that address:
   - **Subject:** `FlowForge inbound test — <your name>`
   - **Body:** `This is a delivery verification test.`
3. Wait 30–60 seconds for Postmark to deliver the webhook.
4. Re-run the health check from Step 2. `status` should now be `healthy` and `lastReceivedAt` should be within the last few minutes.
5. In the FlowForge app → Inbox, the test email should appear as a new message.

---

## Troubleshooting

### Email sent but `status` stays `unknown`

- **Check Postmark activity** — in the Postmark dashboard → Activity, confirm the message was received and the webhook fired successfully (green tick, not 4xx/5xx).
- **Check webhook signature** — if Postmark shows `401`, the `POSTMARK_WEBHOOK_TOKEN` secret does not match what Postmark was configured with. Re-copy the token from Postmark → Webhooks → your webhook.
- **Check webhook URL** — the URL must be the *deployed* production URL, not a `localhost` or Replit dev domain. Postmark cannot reach `localhost`.

### `configured: false` in the health response

The `INBOUND_EMAIL_BASE` env var is unset or missing the `inbound.` subdomain. Set it in Replit Secrets:
```
INBOUND_EMAIL_BASE=iq@inbound.flowforgeiq.com
```

### DNS not propagated yet

Run:
```bash
dig MX inbound.flowforgeiq.com +short
```
If the output is empty, wait for propagation (up to 48 h for slow resolvers) before re-testing.

### Email arrives but isn't routed to a shipment

Check the Inbox → "Needs Review" tab. The message is there if the routing engine could not confidently match the sender to a known supplier or buyer. Use the manual assignment UI to route it, which also teaches the system for future messages from that sender.
