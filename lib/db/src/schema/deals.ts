import { pgTable, text, serial, integer, doublePrecision, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  buyerPoNumber: text("buyer_po_number").notNull(),
  customerName: text("customer_name").notNull(),
  buyerTotalUsd: doublePrecision("buyer_total_usd").notNull(),
  buyerUnitPrice: doublePrecision("buyer_unit_price").notNull(),
  buyerQuantity: integer("buyer_quantity").notNull(),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  targetSpreadPct: doublePrecision("target_spread_pct"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("deals_org_id_idx").on(t.orgId),
  unique("deals_org_buyer_po_uniq").on(t.orgId, t.buyerPoNumber),
]);

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
