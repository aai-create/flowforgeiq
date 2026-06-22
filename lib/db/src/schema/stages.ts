import { pgTable, text, integer, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const stagesTable = pgTable("stages", {
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  id: text("id").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
}, (t) => [
  primaryKey({ columns: [t.orgId, t.id] }),
  index("stages_org_id_idx").on(t.orgId),
]);

export const insertStageSchema = createInsertSchema(stagesTable);
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stagesTable.$inferSelect;
