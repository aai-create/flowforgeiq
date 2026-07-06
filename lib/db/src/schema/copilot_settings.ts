import { pgTable, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const copilotSettingsTable = pgTable("copilot_settings", {
  id: serial("id").primaryKey(),
  sparseThreadMinMessages: integer("sparse_thread_min_messages").notNull().default(5),
  sparseThreadMinDays: integer("sparse_thread_min_days").notNull().default(14),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("copilot_settings_org_id_idx").on(t.orgId)]);

export const insertCopilotSettingsSchema = createInsertSchema(copilotSettingsTable).omit({ id: true, updatedAt: true });
export type InsertCopilotSettings = z.infer<typeof insertCopilotSettingsSchema>;
export type CopilotSettings = typeof copilotSettingsTable.$inferSelect;
