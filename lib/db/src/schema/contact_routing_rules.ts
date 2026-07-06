import { pgTable, serial, integer, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { shipmentsTable } from "./shipments";
import { teamUsersTable } from "./team_users";

export const contactRoutingRulesTable = pgTable("contact_routing_rules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  /** The messaging channel this rule applies to (e.g. "email", "whatsapp", "sms", "wechat", "imessage"). */
  channel: text("channel").notNull().default("email"),
  /** Universal sender identifier: an email address for email rules, or a phone number / display name / handle for chat/SMS rules. */
  senderId: text("sender_id").notNull(),
  /** Kept for backwards compatibility — populated for email rules only; null for chat/SMS rules. */
  fromEmail: text("from_email"),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  createdBy: text("created_by").references(() => teamUsersTable.clerkUserId, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("contact_routing_rules_org_id_idx").on(t.orgId),
  index("contact_routing_rules_sender_idx").on(t.senderId, t.channel, t.orgId),
  unique("contact_routing_rules_org_channel_sender_unique").on(t.orgId, t.channel, t.senderId),
]);

export const insertContactRoutingRuleSchema = createInsertSchema(contactRoutingRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContactRoutingRule = z.infer<typeof insertContactRoutingRuleSchema>;
export type ContactRoutingRule = typeof contactRoutingRulesTable.$inferSelect;
