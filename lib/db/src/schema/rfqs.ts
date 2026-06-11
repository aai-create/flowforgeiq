import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
