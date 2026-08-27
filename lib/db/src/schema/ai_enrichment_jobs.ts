import { pgTable, text, serial, integer, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { messagesTable } from "./messages";

export const aiEnrichmentJobsTable = pgTable("ai_enrichment_jobs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  messageId: integer("message_id").notNull().references(() => messagesTable.id),
  jobType: text("job_type").notNull().default("message_enrichment"),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(4),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastError: text("last_error"),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("ai_enrichment_jobs_org_idempotency_unique").on(t.orgId, t.idempotencyKey),
  index("ai_enrichment_jobs_claim_idx").on(t.status, t.runAt),
]);