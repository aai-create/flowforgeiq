import { Router, type IRouter } from "express";
import { db, rfqsTable, rfqQuotesTable, shipmentsTable, suppliersTable, paymentsTable, stagesTable, teamUsersTable, sampleRequestsTable } from "@workspace/db";
import { and, eq, asc, isNotNull, type SQL } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import { resolveVisibilityMode, visibilityCondition } from "../lib/visibilityFilter";
import { z } from "zod/v4";
import {
  CreateRfqBody,
  UpdateRfqBody,
  AddRfqQuoteBody,
  UpdateRfqQuoteBody,
  ConvertRfqToPoBody,
  ListRfqsResponseItem,
  GetRfqResponse,
  UpdateRfqQuoteResponse,
  UpdateRfqResponse,
  GetRfqProformaResponse,
  ListShipmentsResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function sendViaPostmark(opts: {
  from: string;
  to: string[];
  subject: string;
  textBody: string;
}): Promise<void> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error("POSTMARK_SERVER_TOKEN is not set");
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: opts.from,
      To: opts.to.join(","),
      Subject: opts.subject,
      TextBody: opts.textBody,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Postmark error ${res.status}: ${detail}`);
  }
}

async function loadRfq(id: number, orgId?: number, extraCond?: SQL) {
  const conditions: SQL[] = [eq(rfqsTable.id, id)];
  if (orgId !== undefined) conditions.push(eq(rfqsTable.orgId, orgId));
  if (extraCond) conditions.push(extraCond);
  const cond = and(...conditions);
  const [row] = await db
    .select({ rfq: rfqsTable, assigneeName: teamUsersTable.name })
    .from(rfqsTable)
    .leftJoin(teamUsersTable, eq(rfqsTable.assigneeId, teamUsersTable.clerkUserId))
    .where(cond);
  if (!row) return null;
  const { rfq } = row;
  const quoteCond = orgId !== undefined
    ? and(eq(rfqQuotesTable.rfqId, id), eq(rfqQuotesTable.orgId, orgId))
    : eq(rfqQuotesTable.rfqId, id);
  const quotes = await db
    .select()
    .from(rfqQuotesTable)
    .where(quoteCond)
    .orderBy(asc(rfqQuotesTable.sortOrder));
  const samples = await db.select().from(sampleRequestsTable)
    .where(and(eq(sampleRequestsTable.rfqId, id), ...(orgId !== undefined ? [eq(sampleRequestsTable.orgId, orgId)] : [])))
    .orderBy(asc(sampleRequestsTable.createdAt));
  return {
    ...rfq,
    assigneeId: rfq.assigneeId ?? null,
    assigneeName: row.assigneeName ?? null,
    convertedShipmentId: rfq.convertedShipmentId ?? null,
    notes: rfq.notes ?? null,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    quotes: quotes.map(q => ({
      ...q,
      supplierId: q.supplierId ?? null,
      notes: q.notes ?? null,
    })),
    samples: samples.map(sample => ({
      ...sample,
      rfqId: sample.rfqId ?? null,
      rfqQuoteId: sample.rfqQuoteId ?? null,
      supplierId: sample.supplierId ?? null,
      buyerId: sample.buyerId ?? null,
      quantity: sample.quantity ?? null,
      notes: sample.notes ?? null,
      approvalOutcome: sample.approvalOutcome ?? null,
      writtenApproval: sample.writtenApproval ?? null,
      writtenApprovalAt: sample.writtenApprovalAt ? sample.writtenApprovalAt.toISOString() : null,
      writtenApprovalBy: sample.writtenApprovalBy ?? null,
      trackingCode: sample.trackingCode ?? null,
      carrierName: sample.carrierName ?? null,
      convertedShipmentId: sample.convertedShipmentId ?? null,
      supplierName: null,
      buyerName: null,
      documents: [],
      createdAt: sample.createdAt.toISOString(),
      updatedAt: sample.updatedAt.toISOString(),
    })),
  };
}

const SendRfqEmailBodySchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

router.get("/rfqs/buyers", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db
    .selectDistinct({ buyerName: rfqsTable.buyerName })
    .from(rfqsTable)
    .where(and(isNotNull(rfqsTable.buyerName), eq(rfqsTable.orgId, orgId)))
    .orderBy(asc(rfqsTable.buyerName));
  res.json(rows.map(r => r.buyerName));
});

router.post("/rfqs/:id/send-email", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const [rfq] = await db.select().from(rfqsTable).where(and(eq(rfqsTable.id, id), eq(rfqsTable.orgId, orgId)));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  const body = SendRfqEmailBodySchema.parse(req.body);
  if (req.isTestBuyerSession) {
    req.log.info({ rfqId: id, to: body.to }, "RFQ email suppressed for test buyer session");
    res.json({ ok: true, testOnly: true });
    return;
  }
  const from = process.env.POSTMARK_FROM_EMAIL ?? "noreply@flowforgeiq.com";
  try {
    await sendViaPostmark({ from, to: body.to, subject: body.subject, textBody: body.body });
    req.log.info({ rfqId: id, to: body.to }, "RFQ email sent");
    res.json({ ok: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to send RFQ email");
    res.status(500).json({ error: (err as Error).message ?? "Failed to send email" });
  }
});

router.get("/rfqs", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const visibilityMode = await resolveVisibilityMode(orgId);
  const visCond = visibilityCondition(rfqsTable.assigneeId, req.userId, req.role, visibilityMode);
  const rfqWhere = visCond ? and(eq(rfqsTable.orgId, orgId), visCond) : eq(rfqsTable.orgId, orgId);
  const rows = await db
    .select({ rfq: rfqsTable, assigneeName: teamUsersTable.name })
    .from(rfqsTable)
    .leftJoin(teamUsersTable, eq(rfqsTable.assigneeId, teamUsersTable.clerkUserId))
    .where(rfqWhere)
    .orderBy(asc(rfqsTable.id));
  const rfqIds = rows.map(r => r.rfq.id);
  const allQuotes = rfqIds.length
    ? await db.select().from(rfqQuotesTable).where(eq(rfqQuotesTable.orgId, orgId)).orderBy(asc(rfqQuotesTable.sortOrder))
    : [];
  const allSamples = rfqIds.length
    ? await db.select().from(sampleRequestsTable).where(eq(sampleRequestsTable.orgId, orgId)).orderBy(asc(sampleRequestsTable.createdAt))
    : [];
  const quotesByRfq = new Map<number, typeof allQuotes>();
  for (const q of allQuotes) {
    const arr = quotesByRfq.get(q.rfqId) ?? [];
    arr.push(q);
    quotesByRfq.set(q.rfqId, arr);
  }
  const samplesByRfq = new Map<number, typeof allSamples>();
  for (const sample of allSamples) {
    if (sample.rfqId == null) continue;
    const arr = samplesByRfq.get(sample.rfqId) ?? [];
    arr.push(sample);
    samplesByRfq.set(sample.rfqId, arr);
  }
  const out = rows.map(({ rfq, assigneeName }) =>
    ListRfqsResponseItem.parse({
      ...rfq,
      assigneeId: rfq.assigneeId ?? null,
      assigneeName: assigneeName ?? null,
      convertedShipmentId: rfq.convertedShipmentId ?? null,
      notes: rfq.notes ?? null,
      deadline: rfq.deadline.toISOString(),
      createdAt: rfq.createdAt.toISOString(),
      quotes: (quotesByRfq.get(rfq.id) ?? []).map(q => ({
        ...q,
        supplierId: q.supplierId ?? null,
        notes: q.notes ?? null,
      })),
      samples: (samplesByRfq.get(rfq.id) ?? []).map(sample => ({
        ...sample,
        rfqId: sample.rfqId ?? null,
        rfqQuoteId: sample.rfqQuoteId ?? null,
        supplierId: sample.supplierId ?? null,
        buyerId: sample.buyerId ?? null,
        quantity: sample.quantity ?? null,
        notes: sample.notes ?? null,
        approvalOutcome: sample.approvalOutcome ?? null,
        writtenApproval: sample.writtenApproval ?? null,
        writtenApprovalAt: sample.writtenApprovalAt ? sample.writtenApprovalAt.toISOString() : null,
        writtenApprovalBy: sample.writtenApprovalBy ?? null,
        trackingCode: sample.trackingCode ?? null,
        carrierName: sample.carrierName ?? null,
        convertedShipmentId: sample.convertedShipmentId ?? null,
        supplierName: null,
        buyerName: null,
        documents: [],
        createdAt: sample.createdAt.toISOString(),
        updatedAt: sample.updatedAt.toISOString(),
      })),
    }),
  );
  res.json(out);
});

router.get("/rfqs/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const visibilityMode = await resolveVisibilityMode(orgId);
  const visCond = visibilityCondition(rfqsTable.assigneeId, req.userId, req.role, visibilityMode);
  const result = await loadRfq(id, orgId, visCond);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateRfqResponse.parse(result));
});

router.post("/rfqs", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const body = CreateRfqBody.parse(req.body);
  const [rfq] = await db.insert(rfqsTable).values({
    product: body.product,
    category: body.category ?? "",
    buyerName: body.buyerName,
    targetPriceUsd: body.targetPriceUsd,
    quantity: body.quantity,
    deadline: new Date(body.deadline),
    notes: body.notes ?? null,
    assigneeId: (body as { assigneeId?: string | null }).assigneeId ?? null,
    status: "open",
    orgId,
  }).returning();
  const result = await loadRfq(rfq.id, orgId);
  res.status(201).json(GetRfqResponse.parse(result));
});

router.patch("/rfqs/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const body = UpdateRfqBody.parse(req.body);
  const update: Record<string, unknown> = {};
  if (body.product        !== undefined) update.product        = body.product;
  if (body.category       !== undefined) update.category       = body.category;
  if (body.buyerName      !== undefined) update.buyerName      = body.buyerName;
  if (body.targetPriceUsd !== undefined) update.targetPriceUsd = body.targetPriceUsd;
  if (body.quantity       !== undefined) update.quantity       = body.quantity;
  if (body.deadline       !== undefined) update.deadline       = new Date(body.deadline);
  if (body.notes          !== undefined) update.notes          = body.notes;
  if (body.status         !== undefined) update.status         = body.status;
  if ("assigneeId" in body)             update.assigneeId     = (body as { assigneeId?: string | null }).assigneeId ?? null;
  if (Object.keys(update).length) {
    await db.update(rfqsTable).set(update).where(and(eq(rfqsTable.id, id), eq(rfqsTable.orgId, orgId)));
  }
  const result = await loadRfq(id, orgId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetRfqResponse.parse(result));
});

router.post("/rfqs/:id/quotes", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rfqId = Number(req.params.id);
  if (!Number.isFinite(rfqId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [rfq] = await db.select({ id: rfqsTable.id }).from(rfqsTable).where(and(eq(rfqsTable.id, rfqId), eq(rfqsTable.orgId, orgId)));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  const body = AddRfqQuoteBody.parse(req.body);
  const existingQuotes = await db.select({ sortOrder: rfqQuotesTable.sortOrder }).from(rfqQuotesTable).where(eq(rfqQuotesTable.rfqId, rfqId));
  const nextSort = existingQuotes.length;
  const [quote] = await db.insert(rfqQuotesTable).values({
    rfqId,
    supplierId: body.supplierId ?? null,
    factoryName: body.factoryName,
    country: body.country ?? "CN",
    unitPriceUsd: body.unitPriceUsd,
    leadTimeDays: body.leadTimeDays,
    moq: body.moq,
    notes: body.notes ?? null,
    status: (body.status as string) ?? "received",
    sortOrder: nextSort,
    orgId,
  }).returning();
  res.status(201).json(UpdateRfqQuoteResponse.parse({ ...quote, supplierId: quote.supplierId ?? null, notes: quote.notes ?? null }));
});

router.patch("/rfqs/:id/quotes/:quoteId", async (req, res) => {
  const rfqId = Number(req.params.id);
  const quoteId = Number(req.params.quoteId);
  if (!Number.isFinite(rfqId) || !Number.isFinite(quoteId)) {
    res.status(400).json({ error: "Invalid id" }); return;
  }
  const orgId = await resolveOrgId(req);
  const [rfq] = await db.select({ id: rfqsTable.id }).from(rfqsTable).where(and(eq(rfqsTable.id, rfqId), eq(rfqsTable.orgId, orgId)));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  const body = UpdateRfqQuoteBody.parse(req.body);
  const update: Record<string, unknown> = {};
  if (body.factoryName  !== undefined) update.factoryName  = body.factoryName;
  if (body.country      !== undefined) update.country      = body.country;
  if (body.unitPriceUsd !== undefined) update.unitPriceUsd = body.unitPriceUsd;
  if (body.leadTimeDays !== undefined) update.leadTimeDays = body.leadTimeDays;
  if (body.moq          !== undefined) update.moq          = body.moq;
  if (body.notes        !== undefined) update.notes        = body.notes;
  if (body.status       !== undefined) update.status       = body.status;
  if (body.shortlisted  !== undefined) update.shortlisted  = body.shortlisted;
  if (Object.keys(update).length) {
    await db.update(rfqQuotesTable).set(update).where(and(eq(rfqQuotesTable.id, quoteId), eq(rfqQuotesTable.rfqId, rfqId), eq(rfqQuotesTable.orgId, orgId)));
  }
  const [quote] = await db.select().from(rfqQuotesTable).where(and(eq(rfqQuotesTable.id, quoteId), eq(rfqQuotesTable.rfqId, rfqId), eq(rfqQuotesTable.orgId, orgId)));
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }
  res.json(UpdateRfqQuoteResponse.parse({ ...quote, supplierId: quote.supplierId ?? null, notes: quote.notes ?? null }));
});

router.delete("/rfqs/:id/quotes/:quoteId", async (req, res) => {
  const rfqId = Number(req.params.id);
  const quoteId = Number(req.params.quoteId);
  if (!Number.isFinite(rfqId) || !Number.isFinite(quoteId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const [rfq] = await db.select({ id: rfqsTable.id }).from(rfqsTable).where(and(eq(rfqsTable.id, rfqId), eq(rfqsTable.orgId, orgId)));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  await db.delete(rfqQuotesTable).where(and(eq(rfqQuotesTable.id, quoteId), eq(rfqQuotesTable.rfqId, rfqId), eq(rfqQuotesTable.orgId, orgId)));
  res.status(204).end();
});

router.post("/rfqs/:id/convert", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rfqId = Number(req.params.id);
  if (!Number.isFinite(rfqId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [rfq] = await db.select().from(rfqsTable).where(and(eq(rfqsTable.id, rfqId), eq(rfqsTable.orgId, orgId)));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }
  if (rfq.status === "accepted") {
    res.status(400).json({ error: "RFQ has already been converted to a PO" }); return;
  }
  const body = ConvertRfqToPoBody.parse(req.body);
  const [acceptedQuote] = await db
    .select()
    .from(rfqQuotesTable)
    .where(and(eq(rfqQuotesTable.id, body.acceptedQuoteId), eq(rfqQuotesTable.orgId, orgId)));
  if (!acceptedQuote || acceptedQuote.rfqId !== rfqId) {
    res.status(400).json({ error: "Quote not found or does not belong to this RFQ" }); return;
  }
  const [approvedSample] = await db.select({ id: sampleRequestsTable.id })
    .from(sampleRequestsTable)
    .where(and(
      eq(sampleRequestsTable.rfqId, rfqId),
      eq(sampleRequestsTable.rfqQuoteId, acceptedQuote.id),
      eq(sampleRequestsTable.orgId, orgId),
      eq(sampleRequestsTable.approvalOutcome, "approved"),
      eq(sampleRequestsTable.milestone, "approved"),
      isNotNull(sampleRequestsTable.writtenApproval),
    ))
    .limit(1);
  if (!approvedSample) {
    res.status(400).json({ error: "PO_READY_REQUIRES_APPROVED_SAMPLE", message: "The selected quote needs a linked sample with written buyer approval before it can become a PO." }); return;
  }
  const [supplier] = await db.select().from(suppliersTable).where(and(eq(suppliersTable.id, body.supplierId), eq(suppliersTable.orgId, orgId)));
  if (!supplier) { res.status(400).json({ error: "Supplier not found" }); return; }

  const [firstStage] = await db.select().from(stagesTable).where(eq(stagesTable.orgId, orgId)).orderBy(asc(stagesTable.sortOrder)).limit(1);
  if (!firstStage) { res.status(400).json({ error: "No pipeline stages configured for this organization" }); return; }
  const stageId = firstStage.id;

  const depositPct = body.depositPct ?? 30;
  const totalUsd = acceptedQuote.unitPriceUsd * rfq.quantity;
  const depositUsd = Math.round(totalUsd * depositPct / 100);
  const balanceUsd = Math.round(totalUsd - depositUsd);

  const [shipment] = await db.insert(shipmentsTable).values({
    poNumber: body.poNumber,
    product: rfq.product,
    category: rfq.category,
    supplierId: body.supplierId,
    customerName: rfq.buyerName,
    status: "on-track",
    currentStageId: stageId,
    dueDate: new Date(body.dueDate),
    exFactoryDate: new Date(body.exFactoryDate),
    destination: body.destination,
    via: body.via ?? "OCEAN",
    notes: body.notes ?? rfq.notes ?? null,
    quantity: rfq.quantity,
    unitCostUsd: Math.round(acceptedQuote.unitPriceUsd),
    orgId,
  }).returning();

  const dueDate = new Date(body.dueDate);
  const depositDate = new Date(dueDate.getTime() - 60 * 24 * 3600 * 1000);
  await db.insert(paymentsTable).values([
    {
      shipmentId: shipment.id,
      label: `Deposit (${depositPct}%)`,
      percent: depositPct,
      amountUsd: depositUsd,
      paid: false,
      dueDate: depositDate,
      sortOrder: 0,
      orgId,
    },
    {
      shipmentId: shipment.id,
      label: `Balance (${100 - depositPct}%)`,
      percent: 100 - depositPct,
      amountUsd: balanceUsd,
      paid: false,
      dueDate: dueDate,
      sortOrder: 1,
      orgId,
    },
  ]);

  await db.update(rfqQuotesTable)
    .set({ status: "accepted" })
    .where(and(eq(rfqQuotesTable.id, body.acceptedQuoteId), eq(rfqQuotesTable.orgId, orgId)));

  await db.update(rfqsTable)
    .set({ status: "accepted", convertedShipmentId: shipment.id })
    .where(eq(rfqsTable.id, rfqId));

  const [supplierRow] = await db.select({ name: suppliersTable.name }).from(suppliersTable).where(and(eq(suppliersTable.id, body.supplierId), eq(suppliersTable.orgId, orgId)));
  const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.shipmentId, shipment.id), eq(paymentsTable.orgId, orgId))).orderBy(asc(paymentsTable.sortOrder));

  res.status(201).json(ListShipmentsResponseItem.parse({
    ...shipment,
    supplierName: supplierRow?.name ?? supplier.name,
    buyerPoNumber: null,
    buyerPoNumbers: [],
    payments: payments.map(p => ({
      ...p,
      dueDate: p.dueDate.toISOString(),
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      buyerSharePct: p.buyerSharePct ?? null,
      intermediaryAdvanceUsd: p.intermediaryAdvanceUsd ?? null,
      intermediaryRecoveredUsd: p.intermediaryRecoveredUsd ?? null,
    })),
    quotes: [],
    notes: shipment.notes ?? null,
    quantity: shipment.quantity ?? null,
    unitCostUsd: shipment.unitCostUsd ?? null,
    dealId: shipment.dealId ?? null,
    dueDate: shipment.dueDate.toISOString(),
    exFactoryDate: shipment.exFactoryDate.toISOString(),
  }));
});

router.get("/rfqs/:id/proforma", async (req, res) => {
  const rfqId = Number(req.params.id);
  if (!Number.isFinite(rfqId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const [rfq] = await db.select().from(rfqsTable).where(and(eq(rfqsTable.id, rfqId), eq(rfqsTable.orgId, orgId)));
  if (!rfq || !rfq.convertedShipmentId) {
    res.status(404).json({ error: "RFQ not found or not yet converted to a PO" }); return;
  }
  const [shipment] = await db.select().from(shipmentsTable).where(and(eq(shipmentsTable.id, rfq.convertedShipmentId), eq(shipmentsTable.orgId, orgId)));
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  const [supplier] = await db.select().from(suppliersTable).where(and(eq(suppliersTable.id, shipment.supplierId), eq(suppliersTable.orgId, orgId)));
  const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.shipmentId, shipment.id), eq(paymentsTable.orgId, orgId))).orderBy(asc(paymentsTable.sortOrder));
  const deposit = payments.find(p => p.sortOrder === 0);
  const balance = payments.find(p => p.sortOrder === 1);
  const depositPct = deposit?.percent ?? 30;
  const totalUsd = (shipment.quantity ?? 0) * (shipment.unitCostUsd ?? 0);

  res.json(GetRfqProformaResponse.parse({
    rfqId,
    shipmentId: shipment.id,
    poNumber: shipment.poNumber,
    buyerName: rfq.buyerName,
    product: rfq.product,
    quantity: rfq.quantity,
    unitPriceUsd: shipment.unitCostUsd ?? 0,
    totalUsd,
    depositPct,
    depositUsd: deposit?.amountUsd ?? Math.round(totalUsd * depositPct / 100),
    balanceUsd: balance?.amountUsd ?? Math.round(totalUsd * (100 - depositPct) / 100),
    paymentTerms: `${depositPct}% deposit, ${100 - depositPct}% balance before shipment`,
    deadline: rfq.deadline.toISOString(),
    supplierName: supplier?.name ?? "",
    supplierCountry: supplier?.country ?? "CN",
    generatedAt: new Date().toISOString(),
  }));
});

export default router;
