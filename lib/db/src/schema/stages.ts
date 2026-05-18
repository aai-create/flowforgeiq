import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stagesTable = pgTable("stages", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const insertStageSchema = createInsertSchema(stagesTable);
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stagesTable.$inferSelect;
