import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  supplierId: integer("supplier_id"),
  sender: text("sender").notNull(),
  recipient: text("recipient"),          // for outbound: supplier email or name
  channel: text("channel").notNull(),    // gmail | whatsapp | sheets | pdf
  subject: text("subject"),             // for outbound email: subject line
  direction: text("direction").notNull().default("inbound"), // inbound | outbound
  snippet: text("snippet").notNull(),
  fullBody: text("full_body").notNull(),
  aiDraft: text("ai_draft").notNull().default(""),
  aiAction: text("ai_action").notNull().default(""),
  aiTags: text("ai_tags").array().notNull().default([]),
  unread: boolean("unread").notNull().default(true),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
