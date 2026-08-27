import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

/**
 * Append-only operational telemetry for AI requests.
 *
 * This table intentionally excludes prompts, completions, source documents,
 * message bodies, attachment data, provider request IDs, and raw errors.
 */
export const aiUsageTable = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  workflow: text("workflow").notNull(),
  event: text("event").notNull(),
  conversationId: text("conversation_id"),
  correlationId: text("correlation_id"),
  outcome: text("outcome").notNull(),
  errorCategory: text("error_category"),
  latencyMs: integer("latency_ms"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  estimatedCostMicrousd: integer("estimated_cost_microusd"),
  costEstimateStatus: text("cost_estimate_status").notNull().default("unavailable"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ai_usage_org_created_idx").on(t.orgId, t.createdAt),
  index("ai_usage_workflow_created_idx").on(t.workflow, t.createdAt),
]);