# FlowForge

Supply-chain communication hub: unified inbox for buyer↔supplier conversations across email, WhatsApp, WeChat, iMessage, and SMS, with stage-by-stage shipment tracking (factory quote → production → ex-factory), payments, spread/margin tracking, RFQ management, and AI-drafted replies. Seeded from a real F21 retail shipping schedule (2015–2020), with dates shifted forward so shipments look "in progress / recently done" relative to today (2026-05-18).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — reseed all tables from seed-data.json (wipes first)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `INBOUND_EMAIL_ADDRESS` — inbound email address for Postmark webhook and chat-forward detection (defaults to `ai@flowforge.com`; surfaced via `GET /settings/inbound-email`)
- Optional env: `CHAT_ROUTING_THRESHOLD` — confidence threshold (0.0–1.0) for auto-routing chat-forward messages; defaults to `0.65`

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
- **Mobile companion** (`artifacts/flowforge-mobile`): Expo app for pasting and previewing chat exports on-device.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before relying on new types/hooks.
- After editing `lib/db/src/schema/*`, run `pnpm --filter @workspace/db run push`, then `pnpm --filter @workspace/db run seed` to reseed.
- The seed script wipes all tables and re-inserts from `scripts/src/seed-data.json`. To regenerate from the spreadsheet: `pnpm --filter @workspace/scripts run build-seed-data`.
- "Today" is hardcoded as 2026-05-18 in both `scripts/src/build-seed-data.ts` and `artifacts/flowforge/src/lib/adapters.ts` (`relativeAge`). Update both if shifting.
- `aiRoutingGuess.buyerName` and `aiRoutingGuess.shipmentId` are nullable — the OpenAPI spec and Zod schema must declare them `["type", "null"]` or the `GET /messages/needs-review` endpoint returns 500.
- Inbox is now the default route (`/`); Orders/Atelier is at `/orders` (also aliased `/command`). Do not restore the old `/` → Atelier routing.
- Clerk requires `VITE_CLERK_PUBLISHABLE_KEY` (frontend) and the AI Integrations proxy for backend JWT verification. Check the clerk-auth skill before modifying auth flows.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill before touching authentication, team management, or protected routes
