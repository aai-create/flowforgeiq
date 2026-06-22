import { pgTable, text, serial, boolean, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const buyerEmailsTable = pgTable("buyer_emails", {
  id: serial("id").primaryKey(),
  senderEmail: text("sender_email").notNull(),
  buyerName: text("buyer_name").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  /** When set, this learned buyer email belongs to a specific team member's routing context.
   *  NULL means it is a workspace-global entry visible to all users. */
  clerkUserId: text("clerk_user_id"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("buyer_emails_org_id_idx").on(t.orgId),
  unique("buyer_emails_org_sender_unique").on(t.orgId, t.senderEmail),
]);

export const insertBuyerEmailSchema = createInsertSchema(buyerEmailsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyerEmail = z.infer<typeof insertBuyerEmailSchema>;
export type BuyerEmail = typeof buyerEmailsTable.$inferSelect;
