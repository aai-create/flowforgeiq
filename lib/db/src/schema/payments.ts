import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  label: text("label").notNull(),
  percent: integer("percent").notNull(),
  amountUsd: integer("amount_usd").notNull(),
  paid: boolean("paid").notNull().default(false),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  referenceNumber: text("reference_number"),
  method: text("method"),
  buyerSharePct: integer("buyer_share_pct"),
  intermediaryAdvanceUsd: integer("intermediary_advance_usd"),
  intermediaryRecoveredUsd: integer("intermediary_recovered_usd"),
  intermediaryRecoveredAt: timestamp("intermediary_recovered_at", { withTimezone: true }),
  invoiceNumber: text("invoice_number"),
  intermediarySupplierPaidUsd: integer("intermediary_supplier_paid_usd"),
  intermediarySupplierPaidAt: timestamp("intermediary_supplier_paid_at", { withTimezone: true }),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
