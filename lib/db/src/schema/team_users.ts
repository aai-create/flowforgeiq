import { pgTable, text, timestamp, integer, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const teamUsersTable = pgTable("team_users", {
  clerkUserId: text("clerk_user_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"),
  inboundToken: text("inbound_token").notNull().unique(),
  inboundHandle: text("inbound_handle").unique(),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.clerkUserId, t.orgId] }),
  index("team_users_org_id_idx").on(t.orgId),
]);

export const insertTeamUserSchema = createInsertSchema(teamUsersTable);
export type InsertTeamUser = z.infer<typeof insertTeamUserSchema>;
export type TeamUser = typeof teamUsersTable.$inferSelect;
