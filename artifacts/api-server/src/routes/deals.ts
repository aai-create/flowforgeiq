import { Router, type IRouter } from "express";
import { db, dealsTable, shipmentsTable, paymentsTable, suppliersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  CreateDealBody,
  UpdateDealBody,
  ListDealsResponseItem,
  GetDealResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildDealWithSpread(dealId: number) {
  const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, dealId));
  if (!deal) return null;

  const shipments = await db
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
    .where(eq(shipmentsTable.dealId, dealId));

  if (!shipments.length) {
    return GetDealResponse.parse({
      ...deal,
      notes: deal.notes ?? null,
      supplierCostUsd: 0,
      supplierPaidUsd: 0,
      spreadUsd: deal.buyerTotalUsd,
      spreadPct: 100,
      legs: [],
      createdAt: deal.createdAt.toISOString(),
    });
  }

  const shipmentIds = shipments.map(s => s.id);
  const supplierIds = [...new Set(shipments.map(s => s.supplierId))];

  const [allPayments, allSuppliers] = await Promise.all([
    db.select().from(paymentsTable).where(
      shipmentIds.length === 1
        ? eq(paymentsTable.shipmentId, shipmentIds[0])
        : inArray(paymentsTable.shipmentId, shipmentIds)
    ),
    db.select().from(suppliersTable).where(
      supplierIds.length === 1
        ? eq(suppliersTable.id, supplierIds[0])
        : inArray(suppliersTable.id, supplierIds)
    ),
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
  const spreadUsd = deal.buyerTotalUsd - supplierCostUsd;
  const spreadPct = deal.buyerTotalUsd > 0 ? (spreadUsd / deal.buyerTotalUsd) * 100 : 0;

  return GetDealResponse.parse({
    ...deal,
    notes: deal.notes ?? null,
    supplierCostUsd,
    supplierPaidUsd,
    spreadUsd,
    spreadPct,
    legs,
    createdAt: deal.createdAt.toISOString(),
  });
}

router.get("/deals", async (req, res) => {
  const deals = await db.select().from(dealsTable).orderBy(dealsTable.id);
  const results = await Promise.all(deals.map(d => buildDealWithSpread(d.id)));
  res.json(results.filter(Boolean).map(r => ListDealsResponseItem.parse(r)));
});

router.get("/deals/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await buildDealWithSpread(id);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

router.post("/deals", async (req, res) => {
  const body = CreateDealBody.parse(req.body);
  const [deal] = await db.insert(dealsTable).values({
    buyerPoNumber: body.buyerPoNumber,
    customerName: body.customerName,
    buyerTotalUsd: body.buyerTotalUsd,
    buyerUnitPrice: body.buyerUnitPrice,
    buyerQuantity: body.buyerQuantity,
    currency: body.currency ?? "USD",
    notes: body.notes,
  }).returning();
  const result = await buildDealWithSpread(deal.id);
  res.status(201).json(result);
});

router.patch("/deals/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
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
    await db.update(dealsTable).set(update).where(eq(dealsTable.id, id));
  }
  const result = await buildDealWithSpread(id);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

export default router;
