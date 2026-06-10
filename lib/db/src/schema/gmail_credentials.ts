import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const gmailCredentialsTable = pgTable("gmail_credentials", {
  id: serial("id").primaryKey(),
  gmailAddress: text("gmail_address").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GmailCredential = typeof gmailCredentialsTable.$inferSelect;
