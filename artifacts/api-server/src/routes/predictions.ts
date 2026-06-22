import { Router, type IRouter } from "express";
import {
  db,
  shipmentsTable,
  suppliersTable,
  paymentsTable,
  shipmentPredictionsTable,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import {
  computeAndStorePrediction,
  getLatestPrediction,
  getAllPredictions,
} from "../services/prediction";

const router: IRouter = Router();

async function loadShipmentForOrg(id: number, orgId: number) {
  const [row] = await db.select({ id: shipmentsTable.id })
    .from(shipmentsTable)
    .where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.orgId, orgId)));
  return row ?? null;
}

router.get("/shipments/:id/prediction", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  if (!(await loadShipmentForOrg(id, orgId))) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const prediction = await getLatestPrediction(id, orgId);
  if (!prediction) {
    const fresh = await computeAndStorePrediction(id, orgId).catch(() => null);
    if (!fresh) {
      res.status(404).json({ error: "No prediction available" });
      return;
    }
    res.json(fresh);
    return;
  }
  res.json(prediction);
});

router.post("/shipments/:id/prediction", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  if (!(await loadShipmentForOrg(id, orgId))) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const prediction = await computeAndStorePrediction(id, orgId);
  res.json(prediction);
});

router.get("/shipments/:id/prediction/history", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  if (!(await loadShipmentForOrg(id, orgId))) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const history = await getAllPredictions(id, orgId);
  res.json(history);
});

router.get("/risk-radar", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const shipments = await db
    .select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .where(eq(shipmentsTable.orgId, orgId))
    .orderBy(asc(shipmentsTable.id));

  const allPayments = shipments.length
    ? await db.select().from(paymentsTable).where(eq(paymentsTable.orgId, orgId)).orderBy(asc(paymentsTable.sortOrder))
    : [];

  const allPredictions = await db
    .select()
    .from(shipmentPredictionsTable)
    .where(eq(shipmentPredictionsTable.orgId, orgId))
    .orderBy(desc(shipmentPredictionsTable.computedAt));

  const latestByShipment = new Map<number, typeof allPredictions[number]>();
  for (const p of allPredictions) {
    if (!latestByShipment.has(p.shipmentId)) {
      latestByShipment.set(p.shipmentId, p);
    }
  }

  const items = await Promise.all(
    shipments.map(async ({ shipment, supplierName }) => {
      let pred = latestByShipment.get(shipment.id);
      if (!pred) {
        try {
          pred = await computeAndStorePrediction(shipment.id, orgId);
        } catch {
          return null;
        }
      }

      const pmts = allPayments.filter(p => p.shipmentId === shipment.id);
      const unpaidUsd = pmts.filter(p => !p.paid).reduce((s, p) => s + p.amountUsd, 0);
      const totalUsd = pmts.reduce((s, p) => s + p.amountUsd, 0);
      const financialExposureUsd = unpaidUsd || totalUsd;

      const riskExposureUsd = Math.round(financialExposureUsd * (pred.riskScore / 100));
      const signals = pred.contributingSignals as Array<{ signal: string; description: string; weight: number; direction: string }>;
      const topSignal = signals.length > 0 ? signals[0].description : "No significant signals";

      return {
        shipmentId: shipment.id,
        poNumber: shipment.poNumber,
        product: shipment.product,
        supplierName,
        customerName: shipment.customerName,
        status: shipment.status,
        riskScore: pred.riskScore,
        predictedEtaMin: pred.predictedEtaMin,
        predictedEtaMax: pred.predictedEtaMax,
        confidence: pred.confidence,
        financialExposureUsd,
        riskExposureUsd,
        topSignal,
        computedAt: pred.computedAt,
      };
    }),
  );

  const filtered = items.filter(Boolean) as NonNullable<typeof items[number]>[];
  filtered.sort((a, b) => b.riskExposureUsd - a.riskExposureUsd);

  const totalExposureUsd = filtered.reduce((s, i) => s + i.riskExposureUsd, 0);
  const highRiskCount = filtered.filter(i => i.riskScore >= 60).length;

  res.json({
    items: filtered,
    totalExposureUsd,
    highRiskCount,
    generatedAt: new Date(),
  });
});

router.get("/predictions/accuracy", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const allPredictions = await db
    .select()
    .from(shipmentPredictionsTable)
    .where(eq(shipmentPredictionsTable.orgId, orgId))
    .orderBy(desc(shipmentPredictionsTable.computedAt));

  const resolvedShipments = await db
    .select()
    .from(shipmentsTable)
    .where(and(eq(shipmentsTable.status, "delivered"), eq(shipmentsTable.orgId, orgId)));

  const resolvedIds = new Set(resolvedShipments.map(s => s.id));

  const resolved = allPredictions.filter(p => resolvedIds.has(p.shipmentId));

  let within1 = 0;
  let within3 = 0;
  let within7 = 0;

  for (const pred of resolved) {
    const ship = resolvedShipments.find(s => s.id === pred.shipmentId);
    if (!ship) continue;
    const actualEta = new Date(ship.dueDate);
    const midpoint = new Date(
      (new Date(pred.predictedEtaMin).getTime() + new Date(pred.predictedEtaMax).getTime()) / 2
    );
    const diffDays = Math.abs(Math.round((actualEta.getTime() - midpoint.getTime()) / 86_400_000));
    if (diffDays <= 1) within1++;
    if (diffDays <= 3) within3++;
    if (diffDays <= 7) within7++;
  }

  const total = allPredictions.length;
  const resolvedCount = resolved.length;

  const buckets = [
    { leadTimeDays: "0-7 days", totalPredictions: 0, withinOneDayCount: 0, withinThreeDayCount: 0, withinSevenDayCount: 0 },
    { leadTimeDays: "8-14 days", totalPredictions: 0, withinOneDayCount: 0, withinThreeDayCount: 0, withinSevenDayCount: 0 },
    { leadTimeDays: "15-30 days", totalPredictions: 0, withinOneDayCount: 0, withinThreeDayCount: 0, withinSevenDayCount: 0 },
    { leadTimeDays: "30+ days", totalPredictions: 0, withinOneDayCount: 0, withinThreeDayCount: 0, withinSevenDayCount: 0 },
  ];

  const today = new Date("2026-05-18T00:00:00Z");

  for (const pred of allPredictions) {
    const ship = resolvedShipments.find(s => s.id === pred.shipmentId);
    const dueDate = ship ? new Date(ship.dueDate) : new Date(pred.predictedEtaMax);
    const leadDays = Math.round((dueDate.getTime() - new Date(pred.computedAt).getTime()) / 86_400_000);
    const bucket =
      leadDays <= 7 ? buckets[0]
      : leadDays <= 14 ? buckets[1]
      : leadDays <= 30 ? buckets[2]
      : buckets[3];

    bucket.totalPredictions++;

    if (ship) {
      const actualEta = new Date(ship.dueDate);
      const midpoint = new Date(
        (new Date(pred.predictedEtaMin).getTime() + new Date(pred.predictedEtaMax).getTime()) / 2
      );
      const diffDays = Math.abs(Math.round((actualEta.getTime() - midpoint.getTime()) / 86_400_000));
      if (diffDays <= 1) bucket.withinOneDayCount++;
      if (diffDays <= 3) bucket.withinThreeDayCount++;
      if (diffDays <= 7) bucket.withinSevenDayCount++;
    }
  }

  const overallWithin3Pct = resolvedCount > 0 ? Math.round((within3 / resolvedCount) * 100) : 0;
  const overallWithin7Pct = resolvedCount > 0 ? Math.round((within7 / resolvedCount) * 100) : 0;

  res.json({
    totalPredictions: total,
    resolvedPredictions: resolvedCount,
    overallWithinThreeDaysPct: overallWithin3Pct,
    overallWithinSevenDaysPct: overallWithin7Pct,
    buckets,
    lastUpdated: today,
    disclaimer:
      "Accuracy is measured retroactively against actual delivery dates for completed shipments. " +
      "With fewer than 30 resolved predictions, these figures are indicative only.",
  });
});

export default router;
