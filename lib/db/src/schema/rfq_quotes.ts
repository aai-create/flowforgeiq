import { pgTable, text, serial, integer, doublePrecision, index } from "drizzle-orm/pg-core";
import { rfqsTable } from "./rfqs";
import { suppliersTable } from "./suppliers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const rfqQuotesTable = pgTable("rfq_quotes", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull().references(() => rfqsTable.id, { onDelete: "cascade" }),
  supplierId: integer("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  factoryName: text("factory_name").notNull(),
  country: text("country").notNull().default("CN"),
  unitPriceUsd: doublePrecision("unit_price_usd").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  moq: integer("moq").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("received"),
  sortOrder: integer("sort_order").notNull().default(0),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [index("rfq_quotes_org_id_idx").on(t.orgId)]);

export const insertRfqQuoteSchema = createInsertSchema(rfqQuotesTable).omit({ id: true });
export type InsertRfqQuote = z.infer<typeof insertRfqQuoteSchema>;
export type RfqQuote = typeof rfqQuotesTable.$inferSelect;
