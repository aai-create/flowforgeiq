import { pgTable, serial, text, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  expoPushToken: text("expo_push_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("push_tokens_org_id_idx").on(t.orgId),
  index("push_tokens_clerk_user_id_idx").on(t.clerkUserId),
  unique("push_tokens_expo_push_token_unique").on(t.expoPushToken),
]);

export type PushToken = typeof pushTokensTable.$inferSelect;
