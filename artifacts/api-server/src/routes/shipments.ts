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
  stagesTable,
  tasksTable,
  buyersTable,
} from "@workspace/db";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
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
import { resolveOrgId } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function loadShipment(id: number, orgId?: number) {
  const conditions = [eq(shipmentsTable.id, id)];
  if (orgId !== undefined) conditions.push(eq(shipmentsTable.orgId, orgId));
  const [row] = await db
    .select({
      shipment: shipmentsTable,
      supplierName: suppliersTable.name,
      buyerPoNumber: dealsTable.buyerPoNumber,
      buyerTotalUsd: dealsTable.buyerTotalUsd,
      buyerUnitPrice: dealsTable.buyerUnitPrice,
      buyerQuantity: dealsTable.buyerQuantity,
      assigneeName: teamUsersTable.name,
    })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, orgId !== undefined
      ? and(eq(shipmentsTable.supplierId, suppliersTable.id), eq(suppliersTable.orgId, orgId))
      : eq(shipmentsTable.supplierId, suppliersTable.id))
    .leftJoin(dealsTable, orgId !== undefined
      ? and(eq(shipmentsTable.dealId, dealsTable.id), eq(dealsTable.orgId, orgId))
      : eq(shipmentsTable.dealId, dealsTable.id))
    .leftJoin(teamUsersTable, eq(shipmentsTable.assigneeId, teamUsersTable.clerkUserId))
    .where(and(...conditions));
  if (!row) return null;
  const dealJoinCond = orgId !== undefined
    ? and(eq(dealShipmentsTable.shipmentId, id), eq(dealShipmentsTable.orgId, orgId))
    : eq(dealShipmentsTable.shipmentId, id);
  const linkedDeals = await db
    .select({ buyerPoNumber: dealsTable.buyerPoNumber })
    .from(dealShipmentsTable)
    .innerJoin(dealsTable, eq(dealShipmentsTable.dealId, dealsTable.id))
    .where(dealJoinCond);
  const buyerPoNumbers = linkedDeals.map(d => d.buyerPoNumber);
  const paymentCond = orgId !== undefined
    ? and(eq(paymentsTable.shipmentId, id), eq(paymentsTable.orgId, orgId))
    : eq(paymentsTable.shipmentId, id);
  const quoteCond = orgId !== undefined
    ? and(eq(factoryQuotesTable.shipmentId, id), eq(factoryQuotesTable.orgId, orgId))
    : eq(factoryQuotesTable.shipmentId, id);
  const payments = await db.select().from(paymentsTable).where(paymentCond).orderBy(asc(paymentsTable.sortOrder));
  const quotes = await db.select().from(factoryQuotesTable).where(quoteCond).orderBy(asc(factoryQuotesTable.sortOrder));

  const buyerTotalUsd = row.buyerTotalUsd ?? null;
  let spreadUsd: number | null = null;
  let spreadPct: number | null = null;
  if (buyerTotalUsd !== null) {
    const supplierCostUsd = payments.reduce((sum, p) => sum + p.amountUsd, 0);
    spreadUsd = buyerTotalUsd - supplierCostUsd;
    spreadPct = buyerTotalUsd > 0 ? (spreadUsd / buyerTotalUsd) * 100 : null;
  }

  return { ...row.shipment, supplierName: row.supplierName, buyerPoNumber: row.buyerPoNumber ?? null, buyerUnitPrice: row.buyerUnitPrice ?? null, buyerQuantity: row.buyerQuantity ?? null, assigneeName: row.assigneeName ?? null, buyerPoNumbers, payments, quotes, spreadUsd, spreadPct };
}

router.get("/shipments", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const includeArchived = req.query["includeArchived"] === "true";
  const whereConditions = includeArchived
    ? [eq(shipmentsTable.orgId, orgId)]
    : [eq(shipmentsTable.orgId, orgId), isNull(shipmentsTable.archivedAt)];
  const shipments = await db
    .select({
      shipment: shipmentsTable,
      supplierName: suppliersTable.name,
      buyerPoNumber: dealsTable.buyerPoNumber,
      buyerTotalUsd: dealsTable.buyerTotalUsd,
      buyerUnitPrice: dealsTable.buyerUnitPrice,
      buyerQuantity: dealsTable.buyerQuantity,
      assigneeName: teamUsersTable.name,
    })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, and(eq(shipmentsTable.supplierId, suppliersTable.id), eq(suppliersTable.orgId, orgId)))
    .leftJoin(dealsTable, and(eq(shipmentsTable.dealId, dealsTable.id), eq(dealsTable.orgId, orgId)))
    .leftJoin(teamUsersTable, eq(shipmentsTable.assigneeId, teamUsersTable.clerkUserId))
    .where(and(...whereConditions))
    .orderBy(asc(shipmentsTable.id));
  const [allPayments, allQuotes, allDealShipments] = await Promise.all([
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
  ]);
  const buyerPoByShipment: Record<number, string[]> = {};
  for (const { shipmentId, buyerPoNumber } of allDealShipments) {
    if (!buyerPoByShipment[shipmentId]) buyerPoByShipment[shipmentId] = [];
    buyerPoByShipment[shipmentId].push(buyerPoNumber);
  }
  const out = shipments.map(({ shipment, supplierName, buyerPoNumber, buyerTotalUsd, buyerUnitPrice, buyerQuantity, assigneeName }) => {
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
      buyerUnitPrice: buyerUnitPrice ?? null,
      buyerQuantity: buyerQuantity ?? null,
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
  orgId: number,
  buyerUnitPrice?: number,
  buyerQuantity?: number,
): Promise<number> {
  const [existing] = await db.select({ id: dealsTable.id }).from(dealsTable).where(and(eq(dealsTable.buyerPoNumber, buyerPoNumber), eq(dealsTable.orgId, orgId)));
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
    orgId,
  }).returning({ id: dealsTable.id });
  return created!.id;
}

async function resolveOrCreateBuyer(customerName: string, orgId: number): Promise<number> {
  // Use ON CONFLICT DO NOTHING so concurrent inserts don't cause unique violations,
  // then re-select the row that won the race.
  const [inserted] = await db
    .insert(buyersTable)
    .values({ name: customerName, orgId })
    .onConflictDoNothing()
    .returning({ id: buyersTable.id });
  if (inserted) return inserted.id;
  const [existing] = await db
    .select({ id: buyersTable.id })
    .from(buyersTable)
    .where(and(eq(buyersTable.name, customerName), eq(buyersTable.orgId, orgId)))
    .limit(1);
  if (!existing) throw new Error(`Failed to resolve or create buyer for customerName="${customerName}" orgId=${orgId}`);
  return existing.id;
}

async function consumeNextSeq(orgId: number): Promise<number> {
  const [cfg] = await db.select().from(poNumberingConfigTable).where(eq(poNumberingConfigTable.orgId, orgId)).limit(1);
  if (!cfg) return 1;
  await db.update(poNumberingConfigTable).set({ nextSeq: cfg.nextSeq + 1 }).where(eq(poNumberingConfigTable.id, cfg.id));
  return cfg.nextSeq;
}

router.post("/shipments", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const parsed = CreateShipmentBody.parse(req.body);
  const { payments: paymentMilestones, buyerPoNumber, ...shipmentFields } = parsed as typeof parsed & { buyerPoNumber?: string };

  // Validate supplierId belongs to this org
  const [supplierCheck] = await db.select({ id: suppliersTable.id }).from(suppliersTable)
    .where(and(eq(suppliersTable.id, shipmentFields.supplierId), eq(suppliersTable.orgId, orgId))).limit(1);
  if (!supplierCheck) { res.status(400).json({ error: "Supplier not found" }); return; }

  // Resolve default stage from the org's first stage by sortOrder
  let defaultStageId = shipmentFields.currentStageId;
  if (!defaultStageId) {
    const [firstStage] = await db.select({ id: stagesTable.id }).from(stagesTable)
      .where(eq(stagesTable.orgId, orgId)).orderBy(asc(stagesTable.sortOrder)).limit(1);
    if (!firstStage) { res.status(400).json({ error: "No pipeline stages configured for this organization" }); return; }
    defaultStageId = firstStage.id;
  }

  const input = {
    ...shipmentFields,
    status: shipmentFields.status ?? "on-track",
    currentStageId: defaultStageId,
    via: shipmentFields.via ?? "OCEAN",
    orgId,
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

  // Resolve buyerId from buyers table — throws on genuine DB errors (propagates as 500)
  const buyerId = await resolveOrCreateBuyer(shipmentFields.customerName, orgId);
  await db.update(shipmentsTable).set({ buyerId }).where(eq(shipmentsTable.id, row.id));
  row = { ...row, buyerId };

  if (buyerPoNumber && buyerPoNumber.trim()) {
    try {
      const bup = (parsed as typeof parsed & { buyerUnitPrice?: number }).buyerUnitPrice;
      const bqty = (parsed as typeof parsed & { buyerQuantity?: number }).buyerQuantity;
      const dealId = await getOrCreateDeal(buyerPoNumber.trim(), shipmentFields.customerName, orgId, bup, bqty);
      await db.update(shipmentsTable).set({ dealId }).where(eq(shipmentsTable.id, row.id));
      row = { ...row, dealId };
      await db.insert(dealShipmentsTable).values({ dealId, shipmentId: row.id, orgId }).catch(() => {});
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
        orgId,
      })),
    );
  }
  const out = await loadShipment(row.id, orgId);
  if (!out) {
    res.status(500).json({ error: "Failed to load created shipment" });
    return;
  }
  res.status(201).json(ListShipmentsResponseItem.parse(out));
});

router.patch("/shipments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const input = UpdateShipmentBody.parse(req.body);

  // If supplierId is being changed, validate it belongs to this org
  if (input.supplierId !== undefined) {
    const [supplierCheck] = await db.select({ id: suppliersTable.id }).from(suppliersTable)
      .where(and(eq(suppliersTable.id, input.supplierId), eq(suppliersTable.orgId, orgId))).limit(1);
    if (!supplierCheck) { res.status(400).json({ error: "Supplier not found" }); return; }
  }

  // Keep buyerId in sync when customerName changes — throws on genuine DB errors (propagates as 500)
  const updateSet: typeof input & { buyerId?: number } = { ...input };
  if (input.customerName !== undefined) {
    updateSet.buyerId = await resolveOrCreateBuyer(input.customerName, orgId);
  }

  await db.update(shipmentsTable).set(updateSet).where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.orgId, orgId)));
  const out = await loadShipment(id, orgId);
  if (!out) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateShipmentResponse.parse(out));
});

router.patch("/payments/:id", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const input = UpdatePaymentBody.parse(req.body);
  const [updated] = await db.update(paymentsTable).set(input).where(and(eq(paymentsTable.id, id), eq(paymentsTable.orgId, orgId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdatePaymentResponse.parse(updated));
});

router.get("/shipments/:id/quotes", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const shipment = await loadShipment(shipmentId, orgId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  const quotes = await db.select().from(factoryQuotesTable).where(and(eq(factoryQuotesTable.shipmentId, shipmentId), eq(factoryQuotesTable.orgId, orgId))).orderBy(asc(factoryQuotesTable.sortOrder));
  res.json(quotes.map(q => ListShipmentQuotesResponseItem.parse(q)));
});

router.post("/shipments/:id/quotes", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const shipmentId = Number(req.params.id);
  const ownership = await loadShipment(shipmentId, orgId);
  if (!ownership) { res.status(404).json({ error: "Shipment not found" }); return; }
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
    orgId,
  });
  const [created] = await db.insert(factoryQuotesTable).values(parsed).returning();
  res.status(201).json(ListShipmentQuotesResponseItem.parse(created));
});

router.post("/shipments/:id/select-quote", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const parentShipment = await loadShipment(shipmentId, orgId);
  if (!parentShipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  const input = SelectFactoryQuoteBody.parse(req.body);
  const [target] = await db
    .select()
    .from(factoryQuotesTable)
    .where(and(eq(factoryQuotesTable.id, input.quoteId), eq(factoryQuotesTable.shipmentId, shipmentId), eq(factoryQuotesTable.orgId, orgId)));
  if (!target) {
    res.status(404).json({ error: "Quote not found for this shipment" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.update(factoryQuotesTable).set({ selected: false }).where(and(eq(factoryQuotesTable.shipmentId, shipmentId), eq(factoryQuotesTable.orgId, orgId)));
    await tx.update(factoryQuotesTable).set({ selected: true }).where(
      and(eq(factoryQuotesTable.id, input.quoteId), eq(factoryQuotesTable.shipmentId, shipmentId), eq(factoryQuotesTable.orgId, orgId)),
    );
  });
  const quotes = await db.select().from(factoryQuotesTable).where(and(eq(factoryQuotesTable.shipmentId, shipmentId), eq(factoryQuotesTable.orgId, orgId))).orderBy(asc(factoryQuotesTable.sortOrder));
  res.json(quotes.map(q => SelectFactoryQuoteResponseItem.parse(q)));
});

router.get("/shipments/:id/stage-events", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const shipment = await loadShipment(shipmentId, orgId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  const events = await db
    .select()
    .from(stageEventsTable)
    .where(and(eq(stageEventsTable.shipmentId, shipmentId), eq(stageEventsTable.orgId, orgId)))
    .orderBy(desc(stageEventsTable.createdAt));
  res.json(events.map(e => ListShipmentStageEventsResponseItem.parse(e)));
});

router.post("/shipments/:id/stage-events", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const shipmentId = Number(req.params.id);
  const input = CreateShipmentStageEventBody.parse(req.body);

  const shipment = await loadShipment(shipmentId, orgId);
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
        orgId,
      })
      .returning();
  });

  res.status(201).json(ListShipmentStageEventsResponseItem.parse(event));
});

// PATCH /shipments/:id/deal — set or update buyerUnitPrice / buyerQuantity on the linked deal
router.patch("/shipments/:id/deal", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rawBody = req.body as Record<string, unknown>;
  const buyerUnitPrice = rawBody.buyerUnitPrice !== undefined ? Number(rawBody.buyerUnitPrice) : undefined;
  const buyerQuantity  = rawBody.buyerQuantity  !== undefined ? Number(rawBody.buyerQuantity)  : undefined;
  if (buyerUnitPrice !== undefined && (!Number.isFinite(buyerUnitPrice) || buyerUnitPrice < 0)) {
    res.status(400).json({ error: "buyerUnitPrice must be a non-negative number" }); return;
  }
  if (buyerQuantity !== undefined && (!Number.isFinite(buyerQuantity) || buyerQuantity < 1 || !Number.isInteger(buyerQuantity))) {
    res.status(400).json({ error: "buyerQuantity must be a positive integer" }); return;
  }

  const shipment = await loadShipment(id, orgId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

  let dealId: number | null = shipment.dealId ?? null;

  if (!dealId) {
    const [dealLink] = await db.select({ dealId: dealShipmentsTable.dealId })
      .from(dealShipmentsTable)
      .where(and(eq(dealShipmentsTable.shipmentId, id), eq(dealShipmentsTable.orgId, orgId)));
    if (dealLink) {
      dealId = dealLink.dealId;
      await db.update(shipmentsTable).set({ dealId }).where(eq(shipmentsTable.id, id));
    }
  }

  if (!dealId) {
    const buyerPoNumber = shipment.buyerPoNumber ?? shipment.poNumber;
    const resolvedUnitPrice = buyerUnitPrice ?? 0;
    const resolvedQuantity = buyerQuantity ?? 0;
    const [created] = await db.insert(dealsTable).values({
      buyerPoNumber,
      customerName: shipment.customerName ?? "",
      buyerUnitPrice: resolvedUnitPrice,
      buyerQuantity: resolvedQuantity,
      buyerTotalUsd: resolvedUnitPrice * resolvedQuantity,
      orgId,
    }).returning({ id: dealsTable.id });
    dealId = created.id;
    await db.update(shipmentsTable).set({ dealId }).where(eq(shipmentsTable.id, id));
    await db.insert(dealShipmentsTable).values({ dealId, shipmentId: id, orgId }).catch(() => {});
  } else {
    const [existingDeal] = await db.select().from(dealsTable).where(and(eq(dealsTable.id, dealId), eq(dealsTable.orgId, orgId)));
    if (existingDeal) {
      const up = buyerUnitPrice !== undefined ? buyerUnitPrice : (existingDeal.buyerUnitPrice ?? 0);
      const qty = buyerQuantity !== undefined ? buyerQuantity : (existingDeal.buyerQuantity ?? 0);
      const update: Record<string, unknown> = { buyerTotalUsd: up * qty };
      if (buyerUnitPrice !== undefined) update.buyerUnitPrice = buyerUnitPrice;
      if (buyerQuantity !== undefined) update.buyerQuantity = buyerQuantity;
      await db.update(dealsTable).set(update).where(eq(dealsTable.id, dealId));
    }
  }

  const out = await loadShipment(id, orgId);
  if (!out) { res.status(500).json({ error: "Failed to reload shipment" }); return; }
  res.json(ListShipmentsResponseItem.parse(out));
});

// POST /shipments/:id/deals — link an existing deal (by dealId) to this shipment
router.post("/shipments/:id/deals", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const shipmentId = Number(req.params.id);
  const { dealId } = req.body as { dealId?: number };
  if (!dealId || !Number.isFinite(dealId)) {
    res.status(400).json({ error: "dealId required" });
    return;
  }
  const shipment = await loadShipment(shipmentId, orgId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  const [deal] = await db.select({ id: dealsTable.id }).from(dealsTable).where(and(eq(dealsTable.id, dealId), eq(dealsTable.orgId, orgId)));
  if (!deal) { res.status(404).json({ error: "Deal not found" }); return; }
  try {
    await db.insert(dealShipmentsTable).values({ dealId, shipmentId, orgId });
  } catch (err: unknown) {
    const code = (err as Record<string, unknown>)?.["code"];
    if (code === "23505") {
      res.status(409).json({ error: "This deal is already linked to this shipment" });
      return;
    }
    throw err;
  }
  const updated = await loadShipment(shipmentId, orgId);
  res.status(201).json(updated);
});

// DELETE /shipments/:id — permanently remove a shipment and its related records
router.delete("/shipments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const shipment = await loadShipment(id, orgId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  await db.transaction(async (tx) => {
    // Manually delete tables without FK cascade on shipmentId
    await tx.delete(paymentsTable).where(and(eq(paymentsTable.shipmentId, id), eq(paymentsTable.orgId, orgId)));
    await tx.delete(factoryQuotesTable).where(and(eq(factoryQuotesTable.shipmentId, id), eq(factoryQuotesTable.orgId, orgId)));
    await tx.delete(tasksTable).where(and(eq(tasksTable.shipmentId, id), eq(tasksTable.orgId, orgId)));
    // stage_events and deal_shipments have ON DELETE CASCADE on shipmentId
    await tx.delete(shipmentsTable).where(and(eq(shipmentsTable.id, id), eq(shipmentsTable.orgId, orgId)));
  });
  res.status(204).send();
});

// DELETE /shipments/:id/deals/:dealId — unlink a deal from this shipment
router.delete("/shipments/:id/deals/:dealId", async (req, res) => {
  const shipmentId = Number(req.params.id);
  const dealId = Number(req.params.dealId);
  if (!Number.isFinite(shipmentId) || !Number.isFinite(dealId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const orgId = await resolveOrgId(req);
  const shipment = await loadShipment(shipmentId, orgId);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  await db.delete(dealShipmentsTable)
    .where(and(eq(dealShipmentsTable.shipmentId, shipmentId), eq(dealShipmentsTable.dealId, dealId), eq(dealShipmentsTable.orgId, orgId)));
  res.status(204).send();
});

export { consumeNextSeq };
export default router;
