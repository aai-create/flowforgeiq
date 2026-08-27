import { Router, type IRouter } from "express";
import { db, sampleRequestsTable, suppliersTable, buyersTable, shipmentsTable, paymentsTable, stagesTable, rfqsTable, rfqQuotesTable, documentsTable } from "@workspace/db";
import { and, eq, asc, ne } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import { z } from "zod/v4";

const router: IRouter = Router();

const SampleRequestCreateSchema = z.object({
  supplierId: z.number().int().optional().nullable(),
  buyerId: z.number().int().optional().nullable(),
  product: z.string().min(1),
  quantity: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  rfqId: z.number().int().optional().nullable(),
  rfqQuoteId: z.number().int().optional().nullable(),
  milestone: z.enum(["sample_requested", "sample_shipped", "sample_received", "changes_requested", "approved", "rejected"]).optional(),
  trackingCode: z.string().optional().nullable(),
  carrierName: z.string().optional().nullable(),
});

const SampleRequestUpdateSchema = z.object({
  supplierId: z.number().int().optional().nullable(),
  buyerId: z.number().int().optional().nullable(),
  product: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  rfqId: z.number().int().optional().nullable(),
  rfqQuoteId: z.number().int().optional().nullable(),
  milestone: z.enum(["sample_requested", "sample_shipped", "sample_received", "changes_requested", "approved", "rejected"]).optional(),
  approvalOutcome: z.enum(["approved", "changes_requested"]).optional(),
  writtenApproval: z.string().min(1).optional(),
  trackingCode: z.string().optional().nullable(),
  carrierName: z.string().optional().nullable(),
});

const ConvertSchema = z.object({
  poNumber: z.string().min(1),
  supplierId: z.number().int(),
  buyerId: z.number().int().optional().nullable(),
  dueDate: z.string(),
  exFactoryDate: z.string(),
  destination: z.string().min(1),
  via: z.string().optional(),
  depositPct: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional().nullable(),
});

async function loadSampleRequest(id: number, orgId: number) {
  const [row] = await db
    .select({
      id: sampleRequestsTable.id,
      orgId: sampleRequestsTable.orgId,
      rfqId: sampleRequestsTable.rfqId,
      rfqQuoteId: sampleRequestsTable.rfqQuoteId,
      supplierId: sampleRequestsTable.supplierId,
      supplierName: suppliersTable.name,
      buyerId: sampleRequestsTable.buyerId,
      buyerName: buyersTable.name,
      product: sampleRequestsTable.product,
      quantity: sampleRequestsTable.quantity,
      notes: sampleRequestsTable.notes,
      milestone: sampleRequestsTable.milestone,
      approvalOutcome: sampleRequestsTable.approvalOutcome,
      writtenApproval: sampleRequestsTable.writtenApproval,
      writtenApprovalAt: sampleRequestsTable.writtenApprovalAt,
      writtenApprovalBy: sampleRequestsTable.writtenApprovalBy,
      trackingCode: sampleRequestsTable.trackingCode,
      carrierName: sampleRequestsTable.carrierName,
      convertedShipmentId: sampleRequestsTable.convertedShipmentId,
      createdAt: sampleRequestsTable.createdAt,
      updatedAt: sampleRequestsTable.updatedAt,
    })
    .from(sampleRequestsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, sampleRequestsTable.supplierId))
    .leftJoin(buyersTable, eq(buyersTable.id, sampleRequestsTable.buyerId))
    .where(and(eq(sampleRequestsTable.id, id), eq(sampleRequestsTable.orgId, orgId)));
  if (!row) return null;
  const documents = await db.select().from(documentsTable).where(and(eq(documentsTable.sampleRequestId, id), eq(documentsTable.orgId, orgId))).orderBy(asc(documentsTable.createdAt));
  return {
    ...row,
    rfqId: row.rfqId ?? null,
    rfqQuoteId: row.rfqQuoteId ?? null,
    supplierId: row.supplierId ?? null,
    supplierName: row.supplierName ?? null,
    buyerId: row.buyerId ?? null,
    buyerName: row.buyerName ?? null,
    quantity: row.quantity ?? null,
    notes: row.notes ?? null,
    trackingCode: row.trackingCode ?? null,
    carrierName: row.carrierName ?? null,
    convertedShipmentId: row.convertedShipmentId ?? null,
    approvalOutcome: row.approvalOutcome ?? null,
    writtenApproval: row.writtenApproval ?? null,
    writtenApprovalAt: row.writtenApprovalAt ? row.writtenApprovalAt.toISOString() : null,
    writtenApprovalBy: row.writtenApprovalBy ?? null,
    documents,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/sample-requests", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const includeArchived = req.query.includeArchived === "true";
  const rows = await db
    .select({
      id: sampleRequestsTable.id,
      orgId: sampleRequestsTable.orgId,
      rfqId: sampleRequestsTable.rfqId,
      rfqQuoteId: sampleRequestsTable.rfqQuoteId,
      supplierId: sampleRequestsTable.supplierId,
      supplierName: suppliersTable.name,
      buyerId: sampleRequestsTable.buyerId,
      buyerName: buyersTable.name,
      product: sampleRequestsTable.product,
      quantity: sampleRequestsTable.quantity,
      notes: sampleRequestsTable.notes,
      milestone: sampleRequestsTable.milestone,
      approvalOutcome: sampleRequestsTable.approvalOutcome,
      writtenApproval: sampleRequestsTable.writtenApproval,
      writtenApprovalAt: sampleRequestsTable.writtenApprovalAt,
      writtenApprovalBy: sampleRequestsTable.writtenApprovalBy,
      trackingCode: sampleRequestsTable.trackingCode,
      carrierName: sampleRequestsTable.carrierName,
      convertedShipmentId: sampleRequestsTable.convertedShipmentId,
      createdAt: sampleRequestsTable.createdAt,
      updatedAt: sampleRequestsTable.updatedAt,
    })
    .from(sampleRequestsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, sampleRequestsTable.supplierId))
    .leftJoin(buyersTable, eq(buyersTable.id, sampleRequestsTable.buyerId))
    .where(
      includeArchived
        ? eq(sampleRequestsTable.orgId, orgId)
        : and(eq(sampleRequestsTable.orgId, orgId), ne(sampleRequestsTable.milestone, "rejected"))
    )
    .orderBy(asc(sampleRequestsTable.createdAt));
  res.json(rows.map(r => ({
    ...r,
    rfqId: r.rfqId ?? null,
    rfqQuoteId: r.rfqQuoteId ?? null,
    supplierId: r.supplierId ?? null,
    supplierName: r.supplierName ?? null,
    buyerId: r.buyerId ?? null,
    buyerName: r.buyerName ?? null,
    quantity: r.quantity ?? null,
    notes: r.notes ?? null,
    trackingCode: r.trackingCode ?? null,
    carrierName: r.carrierName ?? null,
    convertedShipmentId: r.convertedShipmentId ?? null,
    approvalOutcome: r.approvalOutcome ?? null,
    writtenApproval: r.writtenApproval ?? null,
    writtenApprovalAt: r.writtenApprovalAt ? r.writtenApprovalAt.toISOString() : null,
    writtenApprovalBy: r.writtenApprovalBy ?? null,
    documents: [],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

router.get("/sample-requests/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const result = await loadSampleRequest(id, orgId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

router.post("/sample-requests", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const body = SampleRequestCreateSchema.parse(req.body);
  let linkedQuote: typeof rfqQuotesTable.$inferSelect | undefined;
  if (body.rfqId !== undefined && body.rfqId !== null) {
    const [rfq] = await db.select({ id: rfqsTable.id, buyerName: rfqsTable.buyerName, product: rfqsTable.product, quantity: rfqsTable.quantity })
      .from(rfqsTable).where(and(eq(rfqsTable.id, body.rfqId), eq(rfqsTable.orgId, orgId)));
    if (!rfq) { res.status(400).json({ error: "RFQ not found" }); return; }
    if (body.rfqQuoteId == null) { res.status(400).json({ error: "An RFQ quote is required for a linked sample" }); return; }
    [linkedQuote] = await db.select().from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.id, body.rfqQuoteId), eq(rfqQuotesTable.rfqId, body.rfqId), eq(rfqQuotesTable.orgId, orgId)));
    if (!linkedQuote) { res.status(400).json({ error: "Quote not found or does not belong to this RFQ" }); return; }
    if (!linkedQuote.shortlisted) { res.status(400).json({ error: "Only shortlisted quotes can start a sample round" }); return; }
  } else if (body.rfqQuoteId != null) {
    res.status(400).json({ error: "rfqId is required when linking a quote" }); return;
  }
  if (body.milestone === "approved") { res.status(400).json({ error: "Record written approval explicitly after the sample is received" }); return; }
  const [row] = await db.insert(sampleRequestsTable).values({
    orgId,
    rfqId: body.rfqId ?? null,
    rfqQuoteId: body.rfqQuoteId ?? null,
    supplierId: body.supplierId ?? linkedQuote?.supplierId ?? null,
    buyerId: body.buyerId ?? null,
    product: body.product || "",
    quantity: body.quantity ?? null,
    notes: body.notes ?? null,
    milestone: body.milestone ?? "sample_requested",
    trackingCode: body.trackingCode ?? null,
    carrierName: body.carrierName ?? null,
  }).returning();
  const result = await loadSampleRequest(row.id, orgId);
  res.status(201).json(result);
});

router.patch("/sample-requests/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const body = SampleRequestUpdateSchema.parse(req.body);
  const update: Record<string, unknown> = {};
  if (body.supplierId !== undefined) update.supplierId = body.supplierId;
  if (body.rfqId !== undefined || body.rfqQuoteId !== undefined) {
    res.status(400).json({ error: "RFQ and originating quote links cannot be changed after creation" }); return;
  }
  if (body.buyerId !== undefined) update.buyerId = body.buyerId;
  if (body.product !== undefined) update.product = body.product;
  if (body.quantity !== undefined) update.quantity = body.quantity;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.milestone === "approved" && body.approvalOutcome !== "approved") {
    res.status(400).json({ error: "Written approval is required before marking a sample approved" }); return;
  }
  if (body.approvalOutcome === "approved" || body.approvalOutcome === "changes_requested") {
    if (!body.writtenApproval?.trim()) { res.status(400).json({ error: "Written approval or requested changes are required" }); return; }
    update.approvalOutcome = body.approvalOutcome;
    update.writtenApproval = body.writtenApproval.trim();
    update.writtenApprovalAt = new Date();
    update.writtenApprovalBy = req.userId ?? null;
    update.milestone = body.approvalOutcome === "approved" ? "approved" : "changes_requested";
  } else if (body.milestone !== undefined) {
    if (body.milestone === "approved") { res.status(400).json({ error: "Written approval is required before marking a sample approved" }); return; }
    update.milestone = body.milestone;
  }
  if (body.trackingCode !== undefined) update.trackingCode = body.trackingCode;
  if (body.carrierName !== undefined) update.carrierName = body.carrierName;
  if (Object.keys(update).length) {
    await db.update(sampleRequestsTable).set(update).where(and(eq(sampleRequestsTable.id, id), eq(sampleRequestsTable.orgId, orgId)));
  }
  const result = await loadSampleRequest(id, orgId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

router.post("/sample-requests/:id/convert", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const [sr] = await db.select().from(sampleRequestsTable).where(and(eq(sampleRequestsTable.id, id), eq(sampleRequestsTable.orgId, orgId)));
  if (!sr) { res.status(404).json({ error: "Sample request not found" }); return; }
  if (sr.milestone !== "approved") { res.status(400).json({ error: "Sample request must be in approved milestone to convert" }); return; }
  if (sr.convertedShipmentId) { res.status(400).json({ error: "Already converted to a PO" }); return; }
  const body = ConvertSchema.parse(req.body);
  const [supplier] = await db.select().from(suppliersTable).where(and(eq(suppliersTable.id, body.supplierId), eq(suppliersTable.orgId, orgId)));
  if (!supplier) { res.status(400).json({ error: "Supplier not found" }); return; }
  const [firstStage] = await db.select().from(stagesTable).where(eq(stagesTable.orgId, orgId)).orderBy(asc(stagesTable.sortOrder)).limit(1);
  if (!firstStage) { res.status(400).json({ error: "No pipeline stages configured" }); return; }
  const depositPct = body.depositPct ?? 30;
  const [shipment] = await db.insert(shipmentsTable).values({
    poNumber: body.poNumber,
    product: sr.product,
    category: "",
    supplierId: body.supplierId,
    customerName: "",
    buyerId: body.buyerId ?? sr.buyerId ?? null,
    status: "on-track",
    currentStageId: firstStage.id,
    dueDate: new Date(body.dueDate),
    exFactoryDate: new Date(body.exFactoryDate),
    destination: body.destination,
    via: body.via ?? "OCEAN",
    notes: body.notes ?? sr.notes ?? null,
    quantity: sr.quantity ?? null,
    orgId,
  }).returning();
  const totalUsd = 0;
  const depositUsd = 0;
  const balanceUsd = 0;
  const dueDate = new Date(body.dueDate);
  const depositDate = new Date(dueDate.getTime() - 60 * 24 * 3600 * 1000);
  await db.insert(paymentsTable).values([
    { shipmentId: shipment.id, label: `Deposit (${depositPct}%)`, percent: depositPct, amountUsd: depositUsd, paid: false, dueDate: depositDate, sortOrder: 0, orgId },
    { shipmentId: shipment.id, label: `Balance (${100 - depositPct}%)`, percent: 100 - depositPct, amountUsd: balanceUsd, paid: false, dueDate, sortOrder: 1, orgId },
  ]);
  await db.update(sampleRequestsTable).set({ convertedShipmentId: shipment.id }).where(eq(sampleRequestsTable.id, id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.shipmentId, shipment.id)).orderBy(asc(paymentsTable.sortOrder));
  res.status(201).json({
    ...shipment,
    supplierName: supplier.name,
    buyerPoNumber: null,
    buyerPoNumbers: [],
    payments: payments.map(p => ({ ...p, dueDate: p.dueDate.toISOString(), paidAt: null, buyerSharePct: null, intermediaryAdvanceUsd: null, intermediaryRecoveredUsd: null })),
    quotes: [],
    notes: shipment.notes ?? null,
    quantity: shipment.quantity ?? null,
    unitCostUsd: shipment.unitCostUsd ?? null,
    dealId: shipment.dealId ?? null,
    dueDate: shipment.dueDate.toISOString(),
    exFactoryDate: shipment.exFactoryDate.toISOString(),
    archivedAt: null,
  });
  void totalUsd; void depositUsd; void balanceUsd;
});

export default router;
