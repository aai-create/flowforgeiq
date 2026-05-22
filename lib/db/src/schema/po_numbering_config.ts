import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const poNumberingConfigTable = pgTable("po_numbering_config", {
  id: serial("id").primaryKey(),
  prefix: text("prefix").notNull().default("PO-"),
  sequenceFormat: text("sequence_format").notNull().default("{seq}"),
  supplierSuffix: text("supplier_suffix").notNull().default("S"),
  nextSeq: integer("next_seq").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPoNumberingConfigSchema = createInsertSchema(poNumberingConfigTable).omit({ id: true, updatedAt: true });
export type InsertPoNumberingConfig = z.infer<typeof insertPoNumberingConfigSchema>;
export type PoNumberingConfig = typeof poNumberingConfigTable.$inferSelect;
