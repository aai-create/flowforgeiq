import { pgTable, text, serial, integer, real, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const copilotProposalsTable = pgTable("copilot_proposals", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  triggerType: text("trigger_type").notNull(), // message_received | payment_overdue | stage_idle | port_delay | no_response_48h | doc_missing
  triggerRef: text("trigger_ref"), // e.g. "message:42" or "payment:7"
  actionType: text("action_type").notNull(), // reply | nudge | stage_advance | payment_reminder | doc_request | escalation
  payload: jsonb("payload").notNull().default({}), // e.g. { draftBody, channel, stageId, amount }
  reasoning: text("reasoning").notNull().default(""),
  confidence: real("confidence").notNull().default(0.8),
  status: text("status").notNull().default("pending"), // pending | approved | edited | rejected | snoozed | auto_executed
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  editedPayload: jsonb("edited_payload"), // user's modified version of payload
  userEditedContent: text("user_edited_content"), // extracted edited draftBody text for learning
  editDistance: real("edit_distance"), // normalized 0–1; 0 = identical to AI draft, 1 = completely rewritten
  auditTrail: jsonb("audit_trail").notNull().default([]), // array of { at, actor, action, note }
  sparseThreadWarning: boolean("sparse_thread_warning"),
  sparseMessageCount: integer("sparse_message_count"),
  sparseDaysInStage: integer("sparse_days_in_stage"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("copilot_proposals_org_id_idx").on(t.orgId)]);

export const autonomyPoliciesTable = pgTable("autonomy_policies", {
  id: serial("id").primaryKey(),
  supplierName: text("supplier_name"), // null = global
  actionType: text("action_type"), // null = all types
  policy: text("policy").notNull().default("always_ask"), // always_ask | auto_ack | full_auto
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("autonomy_policies_org_id_idx").on(t.orgId)]);

export const insertCopilotProposalSchema = createInsertSchema(copilotProposalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCopilotProposal = z.infer<typeof insertCopilotProposalSchema>;
export type CopilotProposal = typeof copilotProposalsTable.$inferSelect;

export const insertAutonomyPolicySchema = createInsertSchema(autonomyPoliciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutonomyPolicy = z.infer<typeof insertAutonomyPolicySchema>;
export type AutonomyPolicy = typeof autonomyPoliciesTable.$inferSelect;
