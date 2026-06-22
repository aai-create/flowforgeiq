import { pgTable, text, serial, integer, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  product: text("product").notNull(),
  category: text("category").notNull().default(""),
  buyerName: text("buyer_name").notNull(),
  targetPriceUsd: doublePrecision("target_price_usd").notNull(),
  quantity: integer("quantity").notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  convertedShipmentId: integer("converted_shipment_id"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("rfqs_org_id_idx").on(t.orgId)]);

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
