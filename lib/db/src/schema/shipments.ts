import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { dealsTable } from "./deals";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  product: text("product").notNull(),
  category: text("category").notNull(),
  supplierId: integer("supplier_id").notNull(),
  customerName: text("customer_name").notNull(),
  dealId: integer("deal_id").references(() => dealsTable.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  currentStageId: text("current_stage_id").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  exFactoryDate: timestamp("ex_factory_date", { withTimezone: true }).notNull(),
  destination: text("destination").notNull().default(""),
  via: text("via").notNull().default("OCEAN"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
