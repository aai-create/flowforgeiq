import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shipmentsTable } from "./shipments";
import { organizationsTable } from "./organizations";

export const stageEventsTable = pgTable("stage_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  fromStageId: text("from_stage_id").notNull(),
  toStageId: text("to_stage_id").notNull(),
  note: text("note"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [index("stage_events_org_id_idx").on(t.orgId)]);

export const insertStageEventSchema = createInsertSchema(stageEventsTable).omit({ id: true, createdAt: true });
export type InsertStageEvent = z.infer<typeof insertStageEventSchema>;
export type StageEvent = typeof stageEventsTable.$inferSelect;
