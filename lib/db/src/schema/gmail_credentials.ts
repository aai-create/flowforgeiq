import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const gmailCredentialsTable = pgTable("gmail_credentials", {
  id: serial("id").primaryKey(),
  gmailAddress: text("gmail_address").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("gmail_credentials_org_id_idx").on(t.orgId)]);

export type GmailCredential = typeof gmailCredentialsTable.$inferSelect;
