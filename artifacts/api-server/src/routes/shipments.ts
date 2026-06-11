import { Router, type IRouter } from "express";
import {
  db,
  shipmentsTable,
  suppliersTable,
  paymentsTable,
  factoryQuotesTable,
  stageEventsTable,
  dealsTable,
  poNumberingConfigTable,
  dealShipmentsTable,
  teamUsersTable,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  ListShipmentsResponseItem,
  CreateShipmentBody,
  UpdateShipmentBody,
  UpdateShipmentResponse,
  UpdatePaymentBody,
  UpdatePaymentResponse,
  SelectFactoryQuoteBody,
  SelectFactoryQuoteResponseItem,
  ListShipmentStageEventsResponseItem,
  CreateShipmentStageEventBody,
  CreateFactoryQuoteBody,
  ListShipmentQuotesResponseItem,
} from "@workspace/api-zod";
import { insertFactoryQuoteSchema } from "@workspace/db";

const router: IRouter = Router();

async function loadShipment(id: number) {
  const [row] = await db
    .select({
      shipment: shipmentsTable,
      supplierName: suppliersTable.name,
      buyerPoNumber: dealsTable.buyerPoNumber,
      buyerTotalUsd: dealsTable.buyerTotalUsd,
      assigneeName: teamUsersTable.name,
    })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .leftJoin(dealsTable, eq(shipmentsTable.dealId, dealsTable.id))
    .leftJoin(teamUsersTable, eq(shipmentsTable.assigneeId, teamUsersTable.clerkUserId))
    .where(eq(shipmentsTable.id, id));
  if (!row) return null;
  const linkedDeals = await db
    .select({ buyerPoNumber: dealsTable.buyerPoNumber })
    .from(dealShipmentsTable)
    .innerJoin(dealsTable, eq(dealShipmentsTable.dealId, dealsTable.id))
    .where(eq(dealShipmentsTable.shipmentId, id));
  const buyerPoNumbers = linkedDeals.map(d => d.buyerPoNumber);
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.shipmentId, id)).orderBy(asc(paymentsTable.sortOrder));
  const quotes = await db.select().from(factoryQuotesTable).where(eq(factoryQuotesTable.shipmentId, id)).orderBy(asc(factoryQuotesTable.sortOrder));

  const buyerTotalUsd = row.buyerTotalUsd ?? null;
  let spreadUsd: number | null = null;
  let spreadPct: number | null = null;
  if (buyerTotalUsd !== null) {
    const supplierCostUsd = payments.reduce((sum, p) => sum + p.amountUsd, 0);
    spreadUsd = buyerTotalUsd - supplierCostUsd;
    spreadPct = buyerTotalUsd > 0 ? (spreadUsd / buyerTotalUsd) * 100 : null;
  }

  return { ...row.shipment, supplierName: row.supplierName, buyerPoNumber: row.buyerPoNumber ?? null, assigneeName: row.assigneeName ?? null, buyerPoNumbers, payments, quotes, spreadUsd, spreadPct };
}

router.get("/shipments", async (_req, res) => {
  const shipments = await db
    .select({
      shipment: shipmentsTable,
      supplierName: suppliersTable.name,
      buyerPoNumber: dealsTable.buyerPoNumber,
      buyerTotalUsd: dealsTable.buyerTotalUsd,
      assigneeName: teamUsersTable.name,
    })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .leftJoin(dealsTable, eq(shipmentsTable.dealId, dealsTable.id))
    .leftJoin(teamUsersTable, eq(shipmentsTable.assigneeId, teamUsersTable.clerkUserId))
    .orderBy(asc(shipmentsTable.id));
  const [allPayments, allQuotes, allDealShipments] = await Promise.all([
    shipments.length
      ? db.select().from(paymentsTable).orderBy(asc(paymentsTable.sortOrder))
      : Promise.resolve([] as (typeof paymentsTable.$inferSelect)[]),
    shipments.length
      ? db.select().from(factoryQuotesTable).orderBy(asc(factoryQuotesTable.sortOrder))
      : Promise.resolve([] as (typeof factoryQuotesTable.$inferSelect)[]),
    shipments.length
      ? db
          .select({ shipmentId: dealShipmentsTable.shipmentId, buyerPoNumber: dealsTable.buyerPoNumber })
          .from(dealShipmentsTable)
          .innerJoin(dealsTable, eq(dealShipmentsTable.dealId, dealsTable.id))
      : Promise.resolve([] as { shipmentId: number; buyerPoNumber: string }[]),
  ]);
  const buyerPoByShipment: Record<number, string[]> = {};
  for (const { shipmentId, buyerPoNumber } of allDealShipments) {
    if (!buyerPoByShipment[shipmentId]) buyerPoByShipment[shipmentId] = [];
    buyerPoByShipment[shipmentId].push(buyerPoNumber);
  }
  const out = shipments.map(({ shipment, supplierName, buyerPoNumber, buyerTotalUsd, assigneeName }) => {
    const payments = allPayments.filter(p => p.shipmentId === shipment.id);
    let spreadUsd: number | null = null;
    let spreadPct: number | null = null;
    if (buyerTotalUsd !== null && buyerTotalUsd !== undefined) {
      const supplierCostUsd = payments.reduce((sum, p) => sum + p.amountUsd, 0);
      spreadUsd = buyerTotalUsd - supplierCostUsd;
      spreadPct = buyerTotalUsd > 0 ? (spreadUsd / buyerTotalUsd) * 100 : null;
    }
    return ListShipmentsResponseItem.parse({
      ...shipment,
      supplierName,
      buyerPoNumber: buyerPoNumber ?? null,
      assigneeName: assigneeName ?? null,
      buyerPoNumbers: buyerPoByShipment[shipment.id] ?? [],
      payments,
      quotes: allQuotes.filter(q => q.shipmentId === shipment.id),
      spreadUsd,
      spreadPct,
    });
  });
  res.json(out);
});

async function getOrCreateDeal(
  buyerPoNumber: string,
  customerName: string,
  buyerUnitPrice?: number,
  buyerQuantity?: number,
): Promise<number> {
  const [existing] = await db.select({ id: dealsTable.id }).from(dealsTable).where(eq(dealsTable.buyerPoNumber, buyerPoNumber));
  if (existing) {
    const update: Record<string, unknown> = {};
    if (buyerUnitPrice !== undefined) update.buyerUnitPrice = buyerUnitPrice;
    if (buyerQuantity !== undefined) update.buyerQuantity = buyerQuantity;
    if (buyerUnitPrice !== undefined && buyerQuantity !== undefined) {
      update.buyerTotalUsd = buyerUnitPrice * buyerQuantity;
    }
    if (Object.keys(update).length) {
      await db.update(dealsTable).set(update).where(eq(dealsTable.id, existing.id));
    }
    return existing.id;
  }
  const resolvedUnitPrice = buyerUnitPrice ?? 0;
  const resolvedQuantity = buyerQuantity ?? 0;
  const [created] = await db.insert(dealsTable).values({
    buyerPoNumber,
    customerName,
    buyerTotalUsd: resolvedUnitPrice * resolvedQuantity,
    buyerUnitPrice: resolvedUnitPrice,
    buyerQuantity: resolvedQuantity,
    currency: "USD",
  }).returning({ id: dealsTable.id });
  return created!.id;
}

async function consumeNextSeq(): Promise<number> {
  const [cfg] = await db.select().from(poNumberingConfigTable).limit(1);
  if (!cfg) return 1;
  await db.update(poNumberingConfigTable).set({ nextSeq: cfg.nextSeq + 1 }).where(eq(poNumberingConfigTable.id, cfg.id));
  return cfg.nextSeq;
}

router.post("/shipments", async (req, res) => {
  const parsed = CreateShipmentBody.parse(req.body);
  const { payments: paymentMilestones, buyerPoNumber, ...shipmentFields } = parsed as typeof parsed & { buyerPoNumber?: string };
  const input = {
    ...shipmentFields,
    status: shipmentFields.status ?? "on-track",
    currentStageId: shipmentFields.currentStageId ?? "stage-spec-sheet",
    via: shipmentFields.via ?? "OCEAN",
  };
  let row: typeof shipmentsTable.$inferSelect;
  try {
    [row] = await db.insert(shipmentsTable).values(input).returning();
  } catch (err: unknown) {
    const isPoUnique = (e: unknown): boolean => {
      if (!e || typeof e !== "object") return false;
      const obj = e as Record<string, unknown>;
      const code = obj["code"];
      const constraint = String(obj["constraint"] ?? "");
      const detail = String(obj["detail"] ?? "");
      if (code === "23505" && (constraint.includes("po_number") || detail.includes("po_number"))) return true;
      if (obj["cause"]) return isPoUnique(obj["cause"]);
      return false;
    };
    if (isPoUnique(err)) {
      res.status(409).json({ error: "A shipment with this PO number already exists." });
      return;
    }
    throw err;
  }

  if (buyerPoNumber && buyerPoNumber.trim()) {
    try {
      const bup = (parsed as typeof parsed & { buyerUnitPrice?: number }).buyerUnitPrice;
      const bqty = (parsed as typeof parsed & { buyerQuantity?: number }).buyerQuantity;
      const dealId = await getOrCreateDeal(buyerPoNumber.trim(), shipmentFields.customerName, bup, bqty);
      await db.update(shipmentsTable).set({ dealId }).where(eq(shipmentsTable.id, row.id));
      row = { ...row, dealId };
      await db.insert(dealShipmentsTable).values({ dealId, shipmentId: row.id }).catch(() => {});
    } catch {
      req.log.warn("Failed to link buyerPoNumber to deal — continuing without deal link");
    }
  }

  if (paymentMilestones && paymentMilestones.length > 0) {
    const qty = row.quantity ?? null;
    const unitCost = row.unitCostUsd ?? null;
    await db.insert(paymentsTable).values(
      paymentMilestones.map((m, i) => ({
        shipmentId: row.id,
        label: m.label,
        percent: m.percent,
        amountUsd: qty != null && unitCost != null
          ? Math.round(m.percent / 100 * qty * unitCost)
          : 0,
        paid: false,
        dueDate: new Date(m.dueDate),
        sortOrder: i,
      })),
    );
  }
  const out = await loadShipment(row.id);
  if (!out) {
    res.status(500).json({ error: "Failed to load created shipment" });
    return;
  }
  res.status(201).json(ListShipmentsResponseItem.parse(out));
});

router.patch("/shipments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdateShipmentBody.parse(req.body);
  await db.update(shipmentsTable).set(input).where(eq(shipmentsTable.id, id));
  const out = await loadShipment(id);
  if (!out) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateShipmentResponse.parse(out));
});

router.patch("/payments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdatePaymentBody.parse(req.body);
  const [updated] = await db.update(paymentsTable).set(input).where(eq(paymentsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdatePaymentResponse.parse(updated));
});

router.get("/shipments/:id/quotes", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const quotes = await db.select().from(factoryQuotesTable).where(eq(factoryQuotesTable.shipmentId, shipmentId)).orderBy(asc(factoryQuotesTable.sortOrder));
  res.json(quotes.map(q => ListShipmentQuotesResponseItem.parse(q)));
});

router.post("/shipments/:id/quotes", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const input = CreateFactoryQuoteBody.parse(req.body);
  const maxOrder = await db.select({ sortOrder: factoryQuotesTable.sortOrder })
    .from(factoryQuotesTable)
    .where(eq(factoryQuotesTable.shipmentId, shipmentId))
    .orderBy(asc(factoryQuotesTable.sortOrder));
  const nextOrder = maxOrder.length > 0 ? Math.max(...maxOrder.map(r => r.sortOrder)) + 1 : 0;
  const parsed = insertFactoryQuoteSchema.parse({
    shipmentId,
    factory: input.factory,
    country: input.country ?? "CN",
    unitPrice: input.unitPrice,
    leadDays: input.leadDays,
    moq: input.moq,
    selected: false,
    sortOrder: nextOrder,
    validityDate: input.validityDate ?? null,
    notes: input.notes ?? null,
  });
  const [created] = await db.insert(factoryQuotesTable).values(parsed).returning();
  res.status(201).json(ListShipmentQuotesResponseItem.parse(created));
});

router.post("/shipments/:id/select-quote", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const input = SelectFactoryQuoteBody.parse(req.body);
  const [target] = await db
    .select()
    .from(factoryQuotesTable)
    .where(and(eq(factoryQuotesTable.id, input.quoteId), eq(factoryQuotesTable.shipmentId, shipmentId)));
  if (!target) {
    res.status(404).json({ error: "Quote not found for this shipment" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.update(factoryQuotesTable).set({ selected: false }).where(eq(factoryQuotesTable.shipmentId, shipmentId));
    await tx.update(factoryQuotesTable).set({ selected: true }).where(
      and(eq(factoryQuotesTable.id, input.quoteId), eq(factoryQuotesTable.shipmentId, shipmentId)),
    );
  });
  const quotes = await db.select().from(factoryQuotesTable).where(eq(factoryQuotesTable.shipmentId, shipmentId)).orderBy(asc(factoryQuotesTable.sortOrder));
  res.json(quotes.map(q => SelectFactoryQuoteResponseItem.parse(q)));
});

router.get("/shipments/:id/stage-events", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const events = await db
    .select()
    .from(stageEventsTable)
    .where(eq(stageEventsTable.shipmentId, shipmentId))
    .orderBy(desc(stageEventsTable.createdAt));
  res.json(events.map(e => ListShipmentStageEventsResponseItem.parse(e)));
});

router.post("/shipments/:id/stage-events", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const input = CreateShipmentStageEventBody.parse(req.body);

  const shipment = await loadShipment(shipmentId);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }

  const createdBy = req.actorName ?? input.createdBy ?? null;

  const [event] = await db.transaction(async (tx) => {
    await tx.update(shipmentsTable)
      .set({ currentStageId: input.toStageId, status: "on-track" })
      .where(eq(shipmentsTable.id, shipmentId));
    return tx
      .insert(stageEventsTable)
      .values({
        shipmentId,
        fromStageId: input.fromStageId,
        toStageId: input.toStageId,
        note: input.note ?? null,
        createdBy,
      })
      .returning();
  });

  res.status(201).json(ListShipmentStageEventsResponseItem.parse(event));
});

// POST /shipments/:id/deals — link an existing deal (by dealId) to this shipment
router.post("/shipments/:id/deals", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const { dealId } = req.body as { dealId?: number };
  if (!dealId || !Number.isFinite(dealId)) {
    res.status(400).json({ error: "dealId required" });
    return;
  }
  const shipment = await loadShipment(shipmentId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  const [deal] = await db.select({ id: dealsTable.id }).from(dealsTable).where(eq(dealsTable.id, dealId));
  if (!deal) { res.status(404).json({ error: "Deal not found" }); return; }
  try {
    await db.insert(dealShipmentsTable).values({ dealId, shipmentId });
  } catch (err: unknown) {
    const code = (err as Record<string, unknown>)?.["code"];
    if (code === "23505") {
      res.status(409).json({ error: "This deal is already linked to this shipment" });
      return;
    }
    throw err;
  }
  const updated = await loadShipment(shipmentId);
  res.status(201).json(updated);
});

// DELETE /shipments/:id/deals/:dealId — unlink a deal from this shipment
router.delete("/shipments/:id/deals/:dealId", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const dealId = Number(req.params.dealId);
  if (!Number.isFinite(shipmentId) || !Number.isFinite(dealId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(dealShipmentsTable)
    .where(and(eq(dealShipmentsTable.shipmentId, shipmentId), eq(dealShipmentsTable.dealId, dealId)));
  res.status(204).send();
});

export { consumeNextSeq };
export default router;
