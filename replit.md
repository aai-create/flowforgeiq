# FlowForge

Supply-chain communication hub: unified inbox for buyer↔supplier conversations across email, WhatsApp, WeChat, iMessage, and SMS, with stage-by-stage shipment tracking (factory quote → production → ex-factory), payments, spread/margin tracking, RFQ management, and AI-drafted replies. Seeded from a real F21 retail shipping schedule (2015–2020), with dates shifted forward so shipments look "in progress / recently done" relative to today (2026-05-18).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate a new migration file after editing the schema
- `pnpm --filter @workspace/db run migrate` — apply pending migrations to the database (non-interactive)
- `pnpm --filter @workspace/db run stamp` — mark all existing migrations as applied without running SQL (one-time use when switching an already-synced DB from push to migrate)
- `pnpm --filter @workspace/db run push` — push DB schema changes directly (dev only, requires interactive TTY)
- `pnpm --filter @workspace/db run seed` — reseed all tables from seed-data.json (wipes first)
- `pnpm --filter @workspace/db run seed -- --preserve-events` — reseed but skip truncating/re-seeding `stage_events`; use in shared demo or staging environments to keep manually-recorded stage progressions intact
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `INBOUND_EMAIL_BASE` — base inbound address for Postmark webhook (production value: `iq@inbound.flowforgeiq.com`; per-user addresses are assembled as `iq+{token}@inbound.flowforgeiq.com` and surfaced via `GET /settings/inbound-email`). This is the **only app-side knob** for switching inbound domains — no code changes required. Two external steps are needed to go live: (1) add an MX record in your DNS provider: `inbound.flowforgeiq.com MX 10 inbound.postmarkapp.com`; (2) update the Postmark inbound server in the Postmark dashboard to use `inbound.flowforgeiq.com`.
- Optional env: `CHAT_ROUTING_THRESHOLD` — confidence threshold (0.0–1.0) for auto-routing chat-forward messages; defaults to `0.65`
- Required secret: `POSTMARK_WEBHOOK_TOKEN` — `POST /webhooks/email` verifies the `X-Postmark-Signature` header (HMAC-SHA256 of the raw request body, base64-encoded) against this token; requests with a missing or invalid signature return `401`; if the token is not set the endpoint returns `500` and rejects all payloads (fail-closed); set via Replit Secrets to the token value configured in Postmark → Servers → your server → Webhooks
- Required secret: `POSTMARK_SERVER_TOKEN` — used by `POST /api/team/invite` to send transactional invite emails; if unset the invite is still created and `inviteUrl` is returned but no email is sent (warning logged)
- Optional env: `POSTMARK_FROM_EMAIL` — outbound sender address for transactional emails (e.g. `noreply@flowforgeiq.com`); must match a verified Postmark sender signature; defaults to `noreply@flowforgeiq.com`; do **not** use the inbound address here
- Optional env: `APP_URL` — canonical base URL used when constructing invite links in emails (e.g. `https://flowforgeiq.com`); takes priority over `REPLIT_DOMAINS` and `REPLIT_DEV_DOMAIN`; set this in production so invite emails link to the deployed domain instead of the Replit dev URL; trailing slash is stripped automatically

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (ClerkProvider in frontend; `clerkMiddleware` + `requireAuth`/`requireAdmin` in API)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/` — stages, suppliers, shipments, payments, factory_quotes, messages, tasks, rfqs, rfq_quotes, team_users, team_invitations
- API contract: `lib/api-spec/openapi.yaml` (run codegen after edits)
- API routes: `artifacts/api-server/src/routes/` — messages, shipments, webhooks, rfqs, team, settings, stage-events, …
- Auth middleware: `artifacts/api-server/src/middlewares/requireAuth.ts`
- Generated client types/hooks: `lib/api-client-react/src/generated/`
- Seed pipeline: `scripts/src/build-seed-data.ts` (parses `attached_assets/F21_shipping_schedule_*.xls` → `scripts/src/seed-data.json`) → `lib/db/src/seed.ts`
- UI ↔ API adapter: `artifacts/flowforge/src/lib/adapters.ts` (maps API types to `UiShipment` etc.; preserves DB ids as `shipmentId`/`paymentId`/`quoteId`/`messageId`/`taskId`)
- Pages: `Home.tsx` (inbox, default `/`), `Atelier.tsx` (orders grid, `/orders`), `RFQs.tsx` (`/rfqs`), `Landing.tsx` (public, unauthenticated), `AcceptInvite.tsx` (`/accept-invite`)

## Architecture decisions

- **Real Postgres + Drizzle**, not in-memory mocks. Schemas are source of truth; OpenAPI hand-written to match.
- **Adapter layer** in the frontend keeps legacy UI types stable while the API uses cleaner DB-aligned shapes. UI types extend API types with extra ids (`shipmentId` etc.) used only for mutations.
- **Date shifting**: seed shifts the historical 2015–2020 dataset so the median shipment is near 2026-05-18; `relativeAge` in the adapter formats labels relative to that "today".
- **Mutations are fire-and-forget** with optimistic local updates; no invalidation is needed since local state already reflects the change.
- **Clerk auth**: `ClerkProvider` wraps the app with Replit proxy URL; `requireAuth` middleware gates all write routes; JIT `provision-self` creates a `team_users` row on first sign-in.
- **Chat ingest**: `POST /messages/ingest-chat` is preview-only (no DB write); confirmed chats are persisted via `POST /messages` with `routingStatus`/`rawChatText`/routing metadata.
- **Spread/margin**: computed server-side as `buyerTotalUsd − sum(payment amounts)`; returned as `spreadUsd`/`spreadPct` on the Shipment response.

## Product

- **Inbox** (default home): filter messages by channel/supplier/shipment/PO; reply advances shipment stage; paste-to-process modal for WhatsApp/WeChat/iMessage/SMS chat exports with AI extraction.
- **Orders grid** (`/orders`): shipments with supplier PO + buyer PO side-by-side, PO search with highlight, spread badge per shipment, task checklist.
- **RFQs** (`/rfqs`): collect factory quotes, compare spread vs target price, convert winner to PO, generate proforma PDF.
- **Settings**: team management (invite colleagues, admin/member roles), Chat Channels (Postmark inbound address, Beeper), Gmail integration.
- **Mobile PWA** (`artifacts/flowforge-mobile-web`, path `/mobile/`): Progressive Web App companion — Home (shipments list), Capture (chat paste + AI routing), Documents, Shipment Detail, and Settings screens. Clerk auth, bottom nav bar, installable via "Add to Home Screen". The legacy Expo app (`artifacts/flowforge-mobile`) is superseded and inactive.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before relying on new types/hooks.
- After editing `lib/db/src/schema/*`, run `pnpm --filter @workspace/db run generate` to create a migration file, then `pnpm --filter @workspace/db run migrate` to apply it, then `pnpm --filter @workspace/db run seed` to reseed. Prefer `generate`+`migrate` over `push` — `push` requires an interactive TTY and cannot run non-interactively in agent/CI contexts.
- `lib/db/migrations/` holds the migration SQL and snapshot files. `drizzle.config.ts` sets `out: "./migrations"`. The `drizzle` Postgres schema tracks applied migrations in `drizzle.__drizzle_migrations`. To bootstrap a fresh DB, run `migrate` (not `stamp`). Use `stamp` only once when switching an already-in-sync DB from `push` to `migrate` — it inserts migration records without executing SQL.
- The seed script wipes all tables and re-inserts from `scripts/src/seed-data.json`. To regenerate from the spreadsheet: `pnpm --filter @workspace/scripts run build-seed-data`.
- "Today" is hardcoded as 2026-05-18 in both `scripts/src/build-seed-data.ts` and `artifacts/flowforge/src/lib/adapters.ts` (`relativeAge`). Update both if shifting.
- `aiRoutingGuess.buyerName` and `aiRoutingGuess.shipmentId` are nullable — the OpenAPI spec and Zod schema must declare them `["type", "null"]` or the `GET /messages/needs-review` endpoint returns 500.
- Inbox is now the default route (`/`); Orders/Atelier is at `/orders` (also aliased `/command`). Do not restore the old `/` → Atelier routing.
- Clerk requires `VITE_CLERK_PUBLISHABLE_KEY` (frontend) and the AI Integrations proxy for backend JWT verification. Check the clerk-auth skill before modifying auth flows.
- **Branded inbound email domain**: production inbound addresses use `inbound.flowforgeiq.com` (e.g. `iq+{token}@inbound.flowforgeiq.com`). Before emails arrive, an operator must: (1) add DNS MX record — `inbound.flowforgeiq.com MX 10 inbound.postmarkapp.com` — in the DNS provider (Cloudflare, Route 53, etc.); (2) configure the Postmark inbound server to `inbound.flowforgeiq.com` in the Postmark dashboard. No code change is needed — only `INBOUND_EMAIL_BASE=iq@inbound.flowforgeiq.com` (already set).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill before touching authentication, team management, or protected routes
