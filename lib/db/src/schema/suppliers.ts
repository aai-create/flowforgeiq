import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  country: text("country").notNull().default("CN"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  whatsAppNumber: text("whats_app_number"),
  paymentTerms: text("payment_terms"),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
