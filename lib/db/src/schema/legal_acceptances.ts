import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const legalAcceptancesTable = pgTable("legal_acceptances", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  privacyVersion: text("privacy_version").notNull(),
  termsVersion: text("terms_version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LegalAcceptance = typeof legalAcceptancesTable.$inferSelect;