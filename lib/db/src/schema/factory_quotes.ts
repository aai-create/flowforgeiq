import { pgTable, text, serial, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const factoryQuotesTable = pgTable("factory_quotes", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  factory: text("factory").notNull(),
  country: text("country").notNull().default("CN"),
  unitPrice: doublePrecision("unit_price").notNull(),
  leadDays: integer("lead_days").notNull(),
  moq: integer("moq").notNull(),
  selected: boolean("selected").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertFactoryQuoteSchema = createInsertSchema(factoryQuotesTable).omit({ id: true });
export type InsertFactoryQuote = z.infer<typeof insertFactoryQuoteSchema>;
export type FactoryQuote = typeof factoryQuotesTable.$inferSelect;
