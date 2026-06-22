import { pgTable, text, serial, integer, real, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const shipmentPredictionsTable = pgTable("shipment_predictions", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  riskScore: integer("risk_score").notNull(),
  predictedEtaMin: timestamp("predicted_eta_min", { withTimezone: true }).notNull(),
  predictedEtaMax: timestamp("predicted_eta_max", { withTimezone: true }).notNull(),
  confidence: real("confidence").notNull(),
  contributingSignals: jsonb("contributing_signals").notNull().default([]),
  recommendedMitigations: jsonb("recommended_mitigations").notNull().default([]),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  orgId: integer("org_id").notNull().default(1).references(() => organizationsTable.id),
}, (t) => [index("shipment_predictions_org_id_idx").on(t.orgId)]);

export const insertShipmentPredictionSchema = createInsertSchema(shipmentPredictionsTable)
  .omit({ id: true });
export type InsertShipmentPrediction = z.infer<typeof insertShipmentPredictionSchema>;
export type ShipmentPrediction = typeof shipmentPredictionsTable.$inferSelect;
