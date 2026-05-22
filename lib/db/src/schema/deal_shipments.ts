import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { dealsTable } from "./deals";
import { shipmentsTable } from "./shipments";

export const dealShipmentsTable = pgTable("deal_shipments", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => dealsTable.id, { onDelete: "cascade" }),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DealShipment = typeof dealShipmentsTable.$inferSelect;
