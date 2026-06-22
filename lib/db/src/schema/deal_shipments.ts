import { pgTable, serial, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { dealsTable } from "./deals";
import { shipmentsTable } from "./shipments";
import { organizationsTable } from "./organizations";

export const dealShipmentsTable = pgTable("deal_shipments", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealsTable.id, { onDelete: "cascade" }),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("deal_shipments_deal_shipment_uniq").on(t.dealId, t.shipmentId),
  index("deal_shipments_org_id_idx").on(t.orgId),
]);

export type DealShipment = typeof dealShipmentsTable.$inferSelect;
