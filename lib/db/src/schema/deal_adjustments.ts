import { pgTable, text, serial, integer, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { dealsTable } from "./deals";

export const dealAdjustmentsTable = pgTable("deal_adjustments", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").notNull().default("flat"),
  value: doublePrecision("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("deal_adjustments_deal_id_idx").on(t.dealId),
  index("deal_adjustments_org_id_idx").on(t.orgId),
]);

export const insertDealAdjustmentSchema = createInsertSchema(dealAdjustmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDealAdjustment = z.infer<typeof insertDealAdjustmentSchema>;
export type DealAdjustment = typeof dealAdjustmentsTable.$inferSelect;
