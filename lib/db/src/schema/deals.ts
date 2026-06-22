import { pgTable, text, serial, integer, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  buyerPoNumber: text("buyer_po_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  buyerTotalUsd: doublePrecision("buyer_total_usd").notNull(),
  buyerUnitPrice: doublePrecision("buyer_unit_price").notNull(),
  buyerQuantity: integer("buyer_quantity").notNull(),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("deals_org_id_idx").on(t.orgId)]);

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
