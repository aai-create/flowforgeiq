import { pgTable, text, serial, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { dealsTable } from "./deals";
import { buyersTable } from "./buyers";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull(),
  product: text("product").notNull(),
  category: text("category").notNull(),
  supplierId: integer("supplier_id").notNull(),
  customerName: text("customer_name").notNull(),
  buyerId: integer("buyer_id").references(() => buyersTable.id, { onDelete: "set null" }),
  dealId: integer("deal_id").references(() => dealsTable.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  currentStageId: text("current_stage_id").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  exFactoryDate: timestamp("ex_factory_date", { withTimezone: true }).notNull(),
  destination: text("destination").notNull().default(""),
  via: text("via").notNull().default("OCEAN"),
  notes: text("notes"),
  quantity: integer("quantity"),
  unitCostUsd: integer("unit_cost_usd"),
  assigneeId: text("assignee_id"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("shipments_org_id_idx").on(t.orgId),
  unique("shipments_org_po_uniq").on(t.orgId, t.poNumber),
]);

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
