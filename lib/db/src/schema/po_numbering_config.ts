import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const poNumberingConfigTable = pgTable("po_numbering_config", {
  id: serial("id").primaryKey(),
  prefix: text("prefix").notNull().default("PO-"),
  sequenceFormat: text("sequence_format").notNull().default("{seq}"),
  supplierSuffix: text("supplier_suffix").notNull().default("S"),
  nextSeq: integer("next_seq").notNull().default(1),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("po_numbering_config_org_id_idx").on(t.orgId)]);

export const insertPoNumberingConfigSchema = createInsertSchema(poNumberingConfigTable).omit({ id: true, updatedAt: true });
export type InsertPoNumberingConfig = z.infer<typeof insertPoNumberingConfigSchema>;
export type PoNumberingConfig = typeof poNumberingConfigTable.$inferSelect;
