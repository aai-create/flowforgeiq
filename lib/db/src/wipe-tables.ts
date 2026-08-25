/**
 * Single source of truth for the wipe/preserve table lists.
 *
 * Both `seed.ts` (the `--wipe-only` path) and `scripts/src/verify-wipe.ts`
 * import from here.  When you add a new schema table, add it to exactly one
 * of these two arrays:
 *
 *   WIPE_TABLES          — business data that is cleared by `pnpm db wipe`
 *   WIPE_PRESERVED_TABLES — infrastructure / config that survives a wipe
 */

/** Tables truncated (with RESTART IDENTITY CASCADE) during a wipe. */
export const WIPE_TABLES = [
  "tasks", "messages", "factory_quotes", "payments", "deal_shipments",
  "shipments", "deal_adjustments", "deals", "suppliers", "buyers",
  "rfqs", "rfq_quotes", "copilot_proposals", "autonomy_policies",
  "shipment_predictions", "stage_events", "buyer_emails",
  "extraction_corrections", "extractions", "documents",
  "sample_requests", "contact_routing_rules", "device_tokens",
] as const;

/**
 * Tables intentionally left untouched by a wipe:
 *   organizations       — single-row tenant record; recreating it would orphan Clerk memberships
 *   stages              — lookup table seeded once; losing it breaks all shipment stage FKs
 *   team_users          — Clerk identity ↔ org mapping; a wipe must not log out the team
 *   team_invitations    — pending invites should survive a data reset
 *   push_tokens         — device push subscriptions; not business data
 *   gmail_credentials   — OAuth tokens are hard to re-obtain; preserve across resets
 *   po_numbering_config — org-wide counter; resetting it would reissue duplicate PO numbers
 *   copilot_settings   — org-wide copilot configuration
 */
export const WIPE_PRESERVED_TABLES = [
  "organizations", "stages", "team_users", "team_invitations",
  "push_tokens", "gmail_credentials", "po_numbering_config", "copilot_settings",
] as const;
