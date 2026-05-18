import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
