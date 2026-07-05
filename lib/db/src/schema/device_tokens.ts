import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, (t) => [
  index("device_tokens_clerk_user_id_idx").on(t.clerkUserId),
  index("device_tokens_org_id_idx").on(t.orgId),
]);

export const insertDeviceTokenSchema = createInsertSchema(deviceTokensTable).omit({ id: true });
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;
export type DeviceToken = typeof deviceTokensTable.$inferSelect;
