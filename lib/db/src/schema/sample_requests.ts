import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { suppliersTable } from "./suppliers";
import { buyersTable } from "./buyers";
import { shipmentsTable } from "./shipments";

export const SAMPLE_MILESTONES = [
  "sample_requested",
  "sample_shipped",
  "sample_received",
  "approved",
  "rejected",
] as const;

export type SampleMilestone = typeof SAMPLE_MILESTONES[number];

export const sampleRequestsTable = pgTable("sample_requests", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  supplierId: integer("supplier_id").references(() => suppliersTable.id, { onDelete: "set null" }),
  buyerId: integer("buyer_id").references(() => buyersTable.id, { onDelete: "set null" }),
  product: text("product").notNull(),
  quantity: integer("quantity"),
  notes: text("notes"),
  milestone: text("milestone").notNull().default("sample_requested"),
  trackingCode: text("tracking_code"),
  carrierName: text("carrier_name"),
  convertedShipmentId: integer("converted_shipment_id").references(() => shipmentsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("sample_requests_org_id_idx").on(t.orgId)]);

export const insertSampleRequestSchema = createInsertSchema(sampleRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSampleRequest = z.infer<typeof insertSampleRequestSchema>;
export type SampleRequest = typeof sampleRequestsTable.$inferSelect;
