# Threat Model

## Project Overview

FlowForge is a public, autoscaled supply-chain communication hub with a React web app, an Express API, Clerk authentication, and a PostgreSQL database accessed through Drizzle. Buyers use it to manage shipments, supplier messages, documents, RFQs, payments, Gmail/Postmark integrations, and AI-assisted workflows. The primary production deployment is public on `flowforgeiq.com`.

Production scope for this scan is the Express API in `artifacts/api-server/src`, the authenticated web app in `artifacts/flowforge/src`, the shared database schema in `lib/db/src/schema`, and third-party integrations that can affect production data or outbound communications. The mockup sandbox, sales deck, video artifact, and local build scripts are dev-only unless separately proven production-reachable and should usually be ignored.

## Assets

- **Organization-scoped business records** — shipments, suppliers, buyers, RFQs, quotes, stage events, tasks, payments, and deals. Exposure or tampering would reveal sensitive commercial activity and disrupt operations.
- **Message and document content** — supplier emails, forwarded chats, attachments, extracted fields, transcripts, and AI drafts. These often contain pricing, schedules, and internal coordination details.
- **User and team membership state** — Clerk identities, `team_users`, invitations, roles, inbound email handles/tokens, and push tokens. Compromise can let attackers impersonate users or cross tenant boundaries.
- **Integration credentials and communication channels** — Gmail OAuth tokens, Postmark webhook secret, and per-user inbound email routes. Compromise can let attackers read, send, or reroute organization communications.
- **AI-derived operational actions** — routing guesses, extraction results, copilot proposals, and any workflow that can influence shipment state or outbound messaging. Tampering here can poison business decisions.

## Trust Boundaries

- **Browser/mobile client to API** — all client input is untrusted. Server-side authentication, authorization, and validation must be enforced on every route.
- **Authenticated user to organization data** — Clerk identity alone is not sufficient; the API must map each request to the correct organization and role before returning or mutating data.
- **Member to admin boundary** — org-wide configuration, team management, and integrations require stronger controls than ordinary message and shipment actions.
- **Public internet to webhook endpoint** — inbound email is an internet-facing ingestion surface. Webhook authenticity must be verified before any data is stored or processed.
- **API to database** — the database is trusted storage, but every query must remain org-scoped to prevent cross-tenant disclosure or tampering.
- **API to external services** — Gmail, Postmark, Expo push, and OpenAI calls cross a service boundary and can expose data or trigger outbound actions if mis-scoped.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, and route files under `artifacts/api-server/src/routes/`.
- Highest-risk code areas: `middlewares/requireAuth.ts`, `routes/team.ts`, `routes/webhooks.ts`, `routes/integrations.ts`, `routes/messages.ts`, `routes/documents.ts`.
- Public surfaces: `GET /api/healthz`, `POST /api/webhooks/email`, sign-in/sign-up UI, and invitation acceptance bootstrap.
- Authenticated member surfaces: shipment, message, document, copilot, RFQ, settings, and Gmail integration routes behind `protectedRouter`.
- Admin-sensitive surfaces to scrutinize for missing role checks: team management, org-wide settings, Gmail connect/disconnect, and any route that changes workspace-wide configuration.
- Dev-only areas normally out of scope: `artifacts/mockup-sandbox`, `artifacts/flowforge-sales-deck`, `artifacts/flowforge-video`, and local build/dev wrapper scripts.

## Threat Categories

### Spoofing

The application trusts Clerk for identity, but production safety depends on correctly translating that identity into a provisioned team member in exactly one organization. Invitation acceptance, self-provisioning, and inbound email routing must not let attackers impersonate a valid org member or claim access meant for someone else. Webhook requests must be accepted only when the Postmark signature is valid.

Required guarantees:
- Only explicitly authorized users may create a `team_users` membership for a production organization.
- Invitation redemption must bind access to the intended recipient and must not be claimable by arbitrary authenticated accounts.
- Public webhook traffic must be authenticated before storing messages or attachments.

### Tampering

Most business value in FlowForge comes from shipment state, RFQs, payments, documents, and message routing. Attackers who can modify org-wide settings, integrations, or shipment data without the right role can disrupt operations, falsify records, or poison downstream AI actions.

Required guarantees:
- Every mutation must enforce both org scoping and the appropriate role for workspace-wide actions.
- AI extraction and routing outputs must never update records outside the intended organization.
- Client input must not be trusted for identifiers, routing decisions, or business-critical state transitions without server-side checks.

### Information Disclosure

Messages, documents, extracted fields, and Gmail-connected workflows carry sensitive commercial information. A single org-scoping failure would expose another customer’s communications, pricing, or schedules.

Required guarantees:
- Every read path must filter by the resolved `orgId` before returning data.
- Integration credentials and message contents must never leak to another organization or unauthenticated user.
- Public/demo defaults must not accidentally expose production tenant data.

### Denial of Service

The webhook and document ingestion paths accept attacker-controlled content that can trigger database writes, AI extraction, push notifications, and attachment storage. Abuse here can consume processing budget, storage, or operator attention.

Required guarantees:
- Internet-facing ingestion paths must fail closed when secrets are missing or validation fails.
- Expensive asynchronous processing should stay scoped to authenticated or authenticated-webhook inputs only.
- Guessable routing identifiers must not let attackers cheaply target another organization’s inbox or workflows.

### Elevation of Privilege

FlowForge has a real member/admin distinction and org-wide integrations that affect all users in a workspace. Missing role enforcement on those routes can let ordinary members take over shared communication channels or administrative configuration.

Required guarantees:
- Org membership must not be self-assigned unless the product explicitly intends open enrollment.
- Admin-only capabilities must be enforced server-side on team, integration, and configuration routes.
- A user in one organization must never be able to redeem, consume, or interfere with another organization’s invite or integration state.
