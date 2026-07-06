import { pgTable, serial, integer, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { shipmentsTable } from "./shipments";
import { teamUsersTable } from "./team_users";

export const contactRoutingRulesTable = pgTable("contact_routing_rules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  fromEmail: text("from_email").notNull(),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  createdBy: text("created_by").references(() => teamUsersTable.clerkUserId, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("contact_routing_rules_org_id_idx").on(t.orgId),
  index("contact_routing_rules_from_email_idx").on(t.fromEmail, t.orgId),
  unique("contact_routing_rules_org_email_unique").on(t.orgId, t.fromEmail),
]);

export const insertContactRoutingRuleSchema = createInsertSchema(contactRoutingRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContactRoutingRule = z.infer<typeof insertContactRoutingRuleSchema>;
export type ContactRoutingRule = typeof contactRoutingRulesTable.$inferSelect;
