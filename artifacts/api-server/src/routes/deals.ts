import { Router, type IRouter } from "express";
import { db, dealsTable, dealAdjustmentsTable, shipmentsTable, paymentsTable, suppliersTable, dealShipmentsTable } from "@workspace/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  CreateDealBody,
  UpdateDealBody,
  ListDealsResponseItem,
  GetDealResponse,
} from "@workspace/api-zod";
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function buildDealWithSpread(dealId: number, orgId: number) {
  const [deal] = await db.select().from(dealsTable).where(and(eq(dealsTable.id, dealId), eq(dealsTable.orgId, orgId)));
  if (!deal) return null;

  const [joinRows, fkRows] = await Promise.all([
    db.select({ id: dealShipmentsTable.shipmentId }).from(dealShipmentsTable).where(and(eq(dealShipmentsTable.dealId, dealId), eq(dealShipmentsTable.orgId, orgId))),
    db.select({ id: shipmentsTable.id }).from(shipmentsTable).where(and(eq(shipmentsTable.dealId, dealId), eq(shipmentsTable.orgId, orgId))),
  ]);
  const linkedIds = [...new Set([...joinRows.map(r => r.id), ...fkRows.map(r => r.id)])];

  const shipments = linkedIds.length === 0 ? [] : await db
    .select({
      id: shipmentsTable.id,
      poNumber: shipmentsTable.poNumber,
      product: shipmentsTable.product,
      status: shipmentsTable.status,
      currentStageId: shipmentsTable.currentStageId,
      exFactoryDate: shipmentsTable.exFactoryDate,
      supplierId: shipmentsTable.supplierId,
    })
    .from(shipmentsTable)
    .where(and(
      linkedIds.length === 1 ? eq(shipmentsTable.id, linkedIds[0]) : inArray(shipmentsTable.id, linkedIds),
      eq(shipmentsTable.orgId, orgId),
    ));

  const adjustments = await db.select().from(dealAdjustmentsTable)
    .where(and(eq(dealAdjustmentsTable.dealId, dealId), eq(dealAdjustmentsTable.orgId, orgId)))
    .orderBy(asc(dealAdjustmentsTable.sortOrder), asc(dealAdjustmentsTable.id));
  const adjustmentsUsd = adjustments.reduce((sum, a) =>
    sum + (a.type === "percent" ? (a.value / 100) * deal.buyerTotalUsd : a.value), 0);

  if (!shipments.length) {
    const spreadUsd0 = deal.buyerTotalUsd - adjustmentsUsd;
    return GetDealResponse.parse({
      ...deal,
      notes: deal.notes ?? null,
      targetSpreadPct: deal.targetSpreadPct ?? null,
      supplierCostUsd: 0,
      supplierPaidUsd: 0,
      adjustmentsUsd,
      adjustments,
      spreadUsd: spreadUsd0,
      spreadPct: deal.buyerTotalUsd > 0 ? (spreadUsd0 / deal.buyerTotalUsd) * 100 : 0,
      legs: [],
      createdAt: deal.createdAt.toISOString(),
    });
  }

  const shipmentIds = shipments.map(s => s.id);
  const supplierIds = [...new Set(shipments.map(s => s.supplierId))];

  const [allPayments, allSuppliers] = await Promise.all([
    db.select().from(paymentsTable).where(and(
      shipmentIds.length === 1
        ? eq(paymentsTable.shipmentId, shipmentIds[0])
        : inArray(paymentsTable.shipmentId, shipmentIds),
      eq(paymentsTable.orgId, orgId),
    )),
    db.select().from(suppliersTable).where(and(
      supplierIds.length === 1
        ? eq(suppliersTable.id, supplierIds[0])
        : inArray(suppliersTable.id, supplierIds),
      eq(suppliersTable.orgId, orgId),
    )),
  ]);

  const supplierNameById = new Map(allSuppliers.map(s => [s.id, s.name]));
  const paymentsByShipment = new Map<number, typeof allPayments>();
  for (const p of allPayments) {
    const arr = paymentsByShipment.get(p.shipmentId) ?? [];
    arr.push(p);
    paymentsByShipment.set(p.shipmentId, arr);
  }

  const legs = shipments.map(s => {
    const payments = paymentsByShipment.get(s.id) ?? [];
    const supplierCost = payments.reduce((sum, p) => sum + p.amountUsd, 0);
    const supplierPaid = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amountUsd, 0);
    return {
      id: s.id,
      poNumber: s.poNumber,
      product: s.product,
      supplierName: supplierNameById.get(s.supplierId) ?? "",
      supplierCost,
      supplierPaid,
      status: s.status,
      currentStageId: s.currentStageId,
      exFactoryDate: s.exFactoryDate.toISOString(),
    };
  });

  const supplierCostUsd = legs.reduce((sum, l) => sum + l.supplierCost, 0);
  const supplierPaidUsd = legs.reduce((sum, l) => sum + l.supplierPaid, 0);
  const spreadUsd = deal.buyerTotalUsd - supplierCostUsd - adjustmentsUsd;
  const spreadPct = deal.buyerTotalUsd > 0 ? (spreadUsd / deal.buyerTotalUsd) * 100 : 0;

  return GetDealResponse.parse({
    ...deal,
    notes: deal.notes ?? null,
    targetSpreadPct: deal.targetSpreadPct ?? null,
    supplierCostUsd,
    supplierPaidUsd,
    adjustmentsUsd,
    adjustments,
    spreadUsd,
    spreadPct,
    legs,
    createdAt: deal.createdAt.toISOString(),
  });
}

router.get("/deals", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const deals = await db.select().from(dealsTable).where(eq(dealsTable.orgId, orgId)).orderBy(dealsTable.id);
  const results = await Promise.all(deals.map(d => buildDealWithSpread(d.id, orgId)));
  res.json(results.filter(Boolean).map(r => ListDealsResponseItem.parse(r)));
});

router.get("/deals/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const result = await buildDealWithSpread(id, orgId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

router.post("/deals", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const body = CreateDealBody.parse(req.body);
  const [deal] = await db.insert(dealsTable).values({
    buyerPoNumber: body.buyerPoNumber,
    customerName: body.customerName,
    buyerTotalUsd: body.buyerTotalUsd,
    buyerUnitPrice: body.buyerUnitPrice,
    buyerQuantity: body.buyerQuantity,
    currency: body.currency ?? "USD",
    notes: body.notes,
    orgId,
  }).returning();
  const result = await buildDealWithSpread(deal.id, orgId);
  res.status(201).json(result);
});

router.patch("/deals/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const body = UpdateDealBody.parse(req.body);
  const update: Record<string, unknown> = {};
  if (body.buyerPoNumber !== undefined) update.buyerPoNumber = body.buyerPoNumber;
  if (body.customerName  !== undefined) update.customerName  = body.customerName;
  if (body.buyerTotalUsd !== undefined) update.buyerTotalUsd = body.buyerTotalUsd;
  if (body.buyerUnitPrice !== undefined) update.buyerUnitPrice = body.buyerUnitPrice;
  if (body.buyerQuantity !== undefined) update.buyerQuantity = body.buyerQuantity;
  if (body.currency      !== undefined) update.currency      = body.currency;
  if (body.notes         !== undefined) update.notes         = body.notes;
  if (Object.keys(update).length) {
    await db.update(dealsTable).set(update).where(and(eq(dealsTable.id, id), eq(dealsTable.orgId, orgId)));
  }
  const result = await buildDealWithSpread(id, orgId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

export default router;
