import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamUsersTable = pgTable("team_users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTeamUserSchema = createInsertSchema(teamUsersTable);
export type InsertTeamUser = z.infer<typeof insertTeamUserSchema>;
export type TeamUser = typeof teamUsersTable.$inferSelect;
