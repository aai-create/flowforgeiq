import { Router, type IRouter } from "express";
import {
  db,
  shipmentsTable,
  suppliersTable,
  paymentsTable,
  factoryQuotesTable,
  dealsTable,
  dealShipmentsTable,
  dealAdjustmentsTable,
  teamUsersTable,
} from "@workspace/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireManager } from "../middlewares/requireAuth";
import { GetPipelineReportResponse, ListShipmentsResponseItem } from "@workspace/api-zod";

const router: IRouter = Router();

function computeAdjustmentsUsd(
  adjustments: { type: string; value: number }[],
  buyerTotalUsd: number,
): number {
  return adjustments.reduce(
    (sum, a) => sum + (a.type === "percent" ? (a.value / 100) * buyerTotalUsd : a.value),
    0,
  );
}

router.get("/reports/pipeline", requireManager, async (req, res) => {
  const orgId = req.orgId;
  const assignedUserId = typeof req.query.assignedUserId === "string" ? req.query.assignedUserId : undefined;

  const whereConditions = [eq(shipmentsTable.orgId, orgId), isNull(shipmentsTable.archivedAt)];
  if (assignedUserId) {
    whereConditions.push(eq(shipmentsTable.assigneeId, assignedUserId));
  }

  const shipments = await db
    .select({
      shipment: shipmentsTable,
      supplierName: suppliersTable.name,
      buyerPoNumber: dealsTable.buyerPoNumber,
      buyerTotalUsd: dealsTable.buyerTotalUsd,
      buyerUnitPrice: dealsTable.buyerUnitPrice,
      buyerQuantity: dealsTable.buyerQuantity,
      targetSpreadPct: dealsTable.targetSpreadPct,
      assigneeName: teamUsersTable.name,
    })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, and(eq(shipmentsTable.supplierId, suppliersTable.id), eq(suppliersTable.orgId, orgId)))
    .leftJoin(dealsTable, and(eq(shipmentsTable.dealId, dealsTable.id), eq(dealsTable.orgId, orgId)))
    .leftJoin(teamUsersTable, eq(shipmentsTable.assigneeId, teamUsersTable.clerkUserId))
    .where(and(...whereConditions))
    .orderBy(asc(shipmentsTable.id));

  const [allPayments, allQuotes, allDealShipments, allAdjustments] = await Promise.all([
    shipments.length
      ? db.select().from(paymentsTable).where(eq(paymentsTable.orgId, orgId)).orderBy(asc(paymentsTable.sortOrder))
      : Promise.resolve([] as (typeof paymentsTable.$inferSelect)[]),
    shipments.length
      ? db.select().from(factoryQuotesTable).where(eq(factoryQuotesTable.orgId, orgId)).orderBy(asc(factoryQuotesTable.sortOrder))
      : Promise.resolve([] as (typeof factoryQuotesTable.$inferSelect)[]),
    shipments.length
      ? db
          .select({ shipmentId: dealShipmentsTable.shipmentId, buyerPoNumber: dealsTable.buyerPoNumber })
          .from(dealShipmentsTable)
          .innerJoin(dealsTable, eq(dealShipmentsTable.dealId, dealsTable.id))
          .where(eq(dealShipmentsTable.orgId, orgId))
      : Promise.resolve([] as { shipmentId: number; buyerPoNumber: string }[]),
    shipments.length
      ? db.select().from(dealAdjustmentsTable).where(eq(dealAdjustmentsTable.orgId, orgId)).orderBy(asc(dealAdjustmentsTable.sortOrder), asc(dealAdjustmentsTable.id))
      : Promise.resolve([] as (typeof dealAdjustmentsTable.$inferSelect)[]),
  ]);

  const buyerPoByShipment: Record<number, string[]> = {};
  for (const { shipmentId, buyerPoNumber } of allDealShipments) {
    if (!buyerPoByShipment[shipmentId]) buyerPoByShipment[shipmentId] = [];
    buyerPoByShipment[shipmentId].push(buyerPoNumber);
  }
  const adjustmentsByDeal = new Map<number, (typeof dealAdjustmentsTable.$inferSelect)[]>();
  for (const a of allAdjustments) {
    const arr = adjustmentsByDeal.get(a.dealId) ?? [];
    arr.push(a);
    adjustmentsByDeal.set(a.dealId, arr);
  }

  type Enriched = {
    shipment: typeof shipmentsTable.$inferSelect;
    supplierName: string;
    assigneeName: string | null;
    buyerPoNumber: string | null;
    buyerUnitPrice: number | null;
    buyerQuantity: number | null;
    targetSpreadPct: number | null;
    spreadPct: number | null;
  };

  const enriched: Enriched[] = shipments.map(({ shipment, supplierName, buyerPoNumber, buyerTotalUsd, buyerUnitPrice, buyerQuantity, targetSpreadPct, assigneeName }) => {
    const payments = allPayments.filter(p => p.shipmentId === shipment.id);
    const adjustments = shipment.dealId !== null ? (adjustmentsByDeal.get(shipment.dealId) ?? []) : [];
    let spreadPct: number | null = null;
    if (buyerTotalUsd !== null && buyerTotalUsd !== undefined) {
      const supplierCostUsd = payments.reduce((sum, p) => sum + p.amountUsd, 0);
      const adjustmentsUsd = computeAdjustmentsUsd(adjustments, buyerTotalUsd);
      const spreadUsd = buyerTotalUsd - supplierCostUsd - adjustmentsUsd;
      spreadPct = buyerTotalUsd > 0 ? (spreadUsd / buyerTotalUsd) * 100 : null;
    }
    return {
      shipment,
      supplierName,
      assigneeName: assigneeName ?? null,
      buyerPoNumber: buyerPoNumber ?? null,
      buyerUnitPrice: buyerUnitPrice ?? null,
      buyerQuantity: buyerQuantity ?? null,
      targetSpreadPct: targetSpreadPct ?? null,
      spreadPct,
    };
  });

  if (assignedUserId) {
    const out = enriched.map(({ shipment, supplierName, buyerPoNumber, buyerUnitPrice, buyerQuantity, targetSpreadPct, assigneeName, spreadPct }) => {
      const payments = allPayments.filter(p => p.shipmentId === shipment.id);
      const adjustments = shipment.dealId !== null ? (adjustmentsByDeal.get(shipment.dealId) ?? []) : [];
      return ListShipmentsResponseItem.parse({
        ...shipment,
        supplierName,
        buyerPoNumber,
        buyerUnitPrice,
        buyerQuantity,
        targetSpreadPct,
        assigneeName,
        spreadPct,
        buyerPoNumbers: buyerPoByShipment[shipment.id] ?? [],
        payments,
        quotes: allQuotes.filter(q => q.shipmentId === shipment.id),
        adjustments,
      });
    });
    res.json(GetPipelineReportResponse.parse({ agents: null, shipments: out }));
    return;
  }

  const byAgent = new Map<string, {
    assigneeId: string | null;
    assigneeName: string;
    shipmentCount: number;
    totalValueUsd: number;
    spreadPctSum: number;
    spreadPctCount: number;
    stageBreakdown: Record<string, number>;
  }>();

  for (const e of enriched) {
    const key = e.shipment.assigneeId ?? "__unassigned__";
    if (!byAgent.has(key)) {
      byAgent.set(key, {
        assigneeId: e.shipment.assigneeId ?? null,
        assigneeName: e.assigneeName ?? "Unassigned",
        shipmentCount: 0,
        totalValueUsd: 0,
        spreadPctSum: 0,
        spreadPctCount: 0,
        stageBreakdown: {},
      });
    }
    const agg = byAgent.get(key)!;
    agg.shipmentCount += 1;
    agg.totalValueUsd += e.buyerUnitPrice !== null && e.buyerQuantity !== null ? e.buyerUnitPrice * e.buyerQuantity : 0;
    if (e.spreadPct !== null) {
      agg.spreadPctSum += e.spreadPct;
      agg.spreadPctCount += 1;
    }
    agg.stageBreakdown[e.shipment.currentStageId] = (agg.stageBreakdown[e.shipment.currentStageId] ?? 0) + 1;
  }

  const agents = Array.from(byAgent.values())
    .map(a => ({
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
      shipmentCount: a.shipmentCount,
      totalValueUsd: a.totalValueUsd,
      avgSpreadPct: a.spreadPctCount > 0 ? a.spreadPctSum / a.spreadPctCount : null,
      stageBreakdown: a.stageBreakdown,
    }))
    .sort((a, b) => b.shipmentCount - a.shipmentCount);

  res.json(GetPipelineReportResponse.parse({ agents, shipments: null }));
});

export default router;
