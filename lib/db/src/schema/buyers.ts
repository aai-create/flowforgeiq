import { pgTable, text, serial, integer, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const buyersTable = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  region: text("region"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [
  index("buyers_org_id_idx").on(t.orgId),
  unique("buyers_name_org_id_uniq").on(t.name, t.orgId),
]);

export const insertBuyerSchema = createInsertSchema(buyersTable).omit({ id: true });
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type Buyer = typeof buyersTable.$inferSelect;
