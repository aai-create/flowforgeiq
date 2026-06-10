# FlowForge

Supply-chain communication hub: unified inbox for buyer↔supplier conversations across email, WhatsApp, sheets, and PDFs, with stage-by-stage shipment tracking (factory quote → production → ex-factory), payments, and AI-drafted replies. Seeded from a real F21 retail shipping schedule (2015–2020), with dates shifted forward so shipments look "in progress / recently done" relative to today (2026-05-18).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `INBOUND_EMAIL_ADDRESS` — inbound email address for Postmark webhook and chat-forward detection (defaults to `ai@flowforge.com`; surfaced via `GET /settings/inbound-email` and displayed in Settings → Chat Channels)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/` (stages, suppliers, shipments, payments, factory_quotes, messages, tasks)
- API contract: `lib/api-spec/openapi.yaml` (run codegen after edits)
- API routes: `artifacts/api-server/src/routes/`
- Generated client types/hooks: `lib/api-client-react/src/generated/`
- Seed pipeline: `scripts/src/build-seed-data.ts` (parses `attached_assets/F21_shipping_schedule_*.xls` → `scripts/src/seed-data.json`) → `lib/db/src/seed.ts` (writes to Postgres)
- UI ↔ API adapter: `artifacts/flowforge/src/lib/adapters.ts` (maps `Shipment`/`Message`/`Task`/`Stage` API types to legacy `UiShipment` etc. shapes the pages expect, preserving DB ids as `shipmentId`/`paymentId`/`quoteId`/`messageId`/`taskId` for mutations)
- Pages: `artifacts/flowforge/src/pages/Home.tsx` (inbox view), `Atelier.tsx` (command view)

## Architecture decisions

- **Real Postgres + Drizzle**, not in-memory mocks. Schemas are source of truth; OpenAPI hand-written to match.
- **Adapter layer** in the frontend keeps legacy UI types stable while the API uses cleaner DB-aligned shapes. UI types extend API types with extra ids (`shipmentId` etc.) used only for mutations.
- **Date shifting**: seed shifts the historical 2015–2020 dataset so the median shipment is near 2026-05-18; `relativeAge` in the adapter formats labels relative to that "today".
- **Mutations are fire-and-forget** with optimistic local updates; no invalidation is needed since local state already reflects the change.
- **Loading guard**: `Home.tsx` early-returns a loading state until `activeMessage` and `activeShipment` are hydrated.

## Product

- Inbox view: filter messages by channel/supplier/shipment; reply advances the shipment's stage and clears related tasks.
- Stage tracker per shipment with payments (deposit/balance) and factory quote comparison.
- Atelier (command) view: shipments grid with status/customer filters and task checklist.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before relying on new types/hooks.
- After editing `lib/db/src/schema/*`, run `pnpm --filter @workspace/db run push`, then `pnpm --filter @workspace/db run seed` to reseed.
- The seed script wipes all 7 tables and re-inserts from `scripts/src/seed-data.json`. To regenerate the JSON from the spreadsheet: `pnpm --filter @workspace/scripts run build-seed-data`.
- "Today" is hardcoded as 2026-05-18 in both `scripts/src/build-seed-data.ts` and `artifacts/flowforge/src/lib/adapters.ts` (`relativeAge`). Update both if shifting.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
