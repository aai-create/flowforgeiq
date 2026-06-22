import { pgTable, text, serial, integer, boolean, doublePrecision, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

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
  validityDate: text("validity_date"),
  notes: text("notes"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [index("factory_quotes_org_id_idx").on(t.orgId)]);

export const insertFactoryQuoteSchema = createInsertSchema(factoryQuotesTable).omit({ id: true });
export type InsertFactoryQuote = z.infer<typeof insertFactoryQuoteSchema>;
export type FactoryQuote = typeof factoryQuotesTable.$inferSelect;
