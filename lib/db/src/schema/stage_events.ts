import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shipmentsTable } from "./shipments";

export const stageEventsTable = pgTable("stage_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipmentsTable.id, { onDelete: "cascade" }),
  fromStageId: text("from_stage_id").notNull(),
  toStageId: text("to_stage_id").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStageEventSchema = createInsertSchema(stageEventsTable).omit({ id: true, createdAt: true });
export type InsertStageEvent = z.infer<typeof insertStageEventSchema>;
export type StageEvent = typeof stageEventsTable.$inferSelect;
