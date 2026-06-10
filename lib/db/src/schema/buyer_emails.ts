import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buyerEmailsTable = pgTable("buyer_emails", {
  id: serial("id").primaryKey(),
  senderEmail: text("sender_email").notNull().unique(),
  buyerName: text("buyer_name").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBuyerEmailSchema = createInsertSchema(buyerEmailsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuyerEmail = z.infer<typeof insertBuyerEmailSchema>;
export type BuyerEmail = typeof buyerEmailsTable.$inferSelect;
