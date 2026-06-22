import { pgTable, text, serial, integer, real, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  mimeType: text("mime_type").notNull().default(""),
  fileSize: integer("file_size").notNull().default(0),
  storageData: text("storage_data"),
  sourceChannel: text("source_channel").notNull().default("upload"),
  status: text("status").notNull().default("pending"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("documents_org_id_idx").on(t.orgId)]);

export const extractionsTable = pgTable("extractions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  shipmentMatchId: integer("shipment_match_id"),
  extractedFields: jsonb("extracted_fields").notNull().default({}),
  fieldProvenance: jsonb("field_provenance").notNull().default({}),
  lineItems: jsonb("line_items").notNull().default([]),
  reconciliationFindings: jsonb("reconciliation_findings").notNull().default([]),
  transcriptText: text("transcript_text"),
  confidence: real("confidence").notNull().default(0),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [index("extractions_org_id_idx").on(t.orgId)]);

export const extractionCorrectionsTable = pgTable("extraction_corrections", {
  id: serial("id").primaryKey(),
  extractionId: integer("extraction_id").notNull(),
  supplierId: integer("supplier_id"),
  documentType: text("document_type").notNull(),
  fieldPath: text("field_path").notNull(),
  originalValue: text("original_value"),
  correctedValue: text("corrected_value").notNull(),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("extraction_corrections_org_id_idx").on(t.orgId)]);

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;

export const insertExtractionSchema = createInsertSchema(extractionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExtraction = z.infer<typeof insertExtractionSchema>;
export type Extraction = typeof extractionsTable.$inferSelect;

export const insertExtractionCorrectionSchema = createInsertSchema(extractionCorrectionsTable).omit({ id: true, createdAt: true });
export type InsertExtractionCorrection = z.infer<typeof insertExtractionCorrectionSchema>;
export type ExtractionCorrection = typeof extractionCorrectionsTable.$inferSelect;
