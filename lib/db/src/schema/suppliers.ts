import { pgTable, text, serial, integer, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull().default("CN"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  whatsAppNumber: text("whats_app_number"),
  paymentTerms: text("payment_terms"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [
  index("suppliers_org_id_idx").on(t.orgId),
  unique("suppliers_org_name_uniq").on(t.orgId, t.name),
]);

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
