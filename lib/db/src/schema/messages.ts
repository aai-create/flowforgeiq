import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id"),
  supplierId: integer("supplier_id"),
  sender: text("sender").notNull(),
  recipient: text("recipient"),
  channel: text("channel").notNull(),
  subject: text("subject"),
  direction: text("direction").notNull().default("inbound"),
  snippet: text("snippet").notNull(),
  fullBody: text("full_body").notNull(),
  aiDraft: text("ai_draft").notNull().default(""),
  aiAction: text("ai_action").notNull().default(""),
  aiTags: text("ai_tags").array().notNull().default([]),
  unread: boolean("unread").notNull().default(true),
  isFlagged: boolean("is_flagged").notNull().default(false),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  routingStatus: text("routing_status").notNull().default("routed"),
  routingConfidence: real("routing_confidence"),
  matchMethod: text("match_method"),
  rawSenderEmail: text("raw_sender_email"),
  gmailThreadId: text("gmail_thread_id"),
  gmailMessageId: text("gmail_message_id"),
  inboundEventKey: text("inbound_event_key"),
  normalizedBody: text("normalized_body"),
  normalizationVersion: text("normalization_version"),
  suppressionReason: text("suppression_reason"),
  aiRoutingGuess: jsonb("ai_routing_guess"),
  pendingExtractionFields: jsonb("pending_extraction_fields"),
  rawChatText: text("raw_chat_text"),
  routedToClerkUserId: text("routed_to_clerk_user_id"),
  signalStatus: text("signal_status").notNull().default("new"), // new | assessing | draft_ready | approved | sending | sent | send_failed | send_uncertain | skipped
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [
  index("messages_org_id_idx").on(t.orgId),
  index("messages_signal_status_org_idx").on(t.orgId, t.signalStatus),
  uniqueIndex("messages_org_gmail_message_id_unique").on(t.orgId, t.gmailMessageId),
  uniqueIndex("messages_org_inbound_event_key_unique").on(t.orgId, t.inboundEventKey),
]);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
