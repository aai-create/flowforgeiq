import { pgTable, text, serial, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  messageId: integer("message_id"),
  title: text("title").notNull(),
  source: text("source").notNull(),
  sourceAge: text("source_age").notNull(),
  urgency: text("urgency").notNull(), // high | medium | low
  action: text("action").notNull(),
  done: boolean("done").notNull().default(false),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [index("tasks_org_id_idx").on(t.orgId)]);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
