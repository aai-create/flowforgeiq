import { Router, type IRouter } from "express";
import { db, rfqsTable, rfqQuotesTable, shipmentsTable, suppliersTable, paymentsTable, stagesTable } from "@workspace/db";
import { and, eq, asc, isNotNull } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
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

async function loadRfq(id: number, orgId?: number) {
  const cond = orgId !== undefined
    ? and(eq(rfqsTable.id, id), eq(rfqsTable.orgId, orgId))
    : eq(rfqsTable.id, id);
  const [rfq] = await db.select().from(rfqsTable).where(cond);
  if (!rfq) return null;
  const quoteCond = orgId !== undefined
    ? and(eq(rfqQuotesTable.rfqId, id), eq(rfqQuotesTable.orgId, orgId))
    : eq(rfqQuotesTable.rfqId, id);
  const quotes = await db
    .select()
    .from(rfqQuotesTable)
    .where(quoteCond)
    .orderBy(asc(rfqQuotesTable.sortOrder));
  return {
    ...rfq,
    convertedShipmentId: rfq.convertedShipmentId ?? null,
    notes: rfq.notes ?? null,
    deadline: rfq.deadline.toISOString(),
    createdAt: rfq.createdAt.toISOString(),
    quotes: quotes.map(q => ({
      ...q,
      supplierId: q.supplierId ?? null,
      notes: q.notes ?? null,
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
  const rfqs = await db.select().from(rfqsTable).where(eq(rfqsTable.orgId, orgId)).orderBy(asc(rfqsTable.id));
  const allQuotes = await db.select().from(rfqQuotesTable).where(eq(rfqQuotesTable.orgId, orgId)).orderBy(asc(rfqQuotesTable.sortOrder));
  const quotesByRfq = new Map<number, typeof allQuotes>();
  for (const q of allQuotes) {
    const arr = quotesByRfq.get(q.rfqId) ?? [];
    arr.push(q);
    quotesByRfq.set(q.rfqId, arr);
  }
  const out = rfqs.map(rfq =>
    ListRfqsResponseItem.parse({
      ...rfq,
      convertedShipmentId: rfq.convertedShipmentId ?? null,
      notes: rfq.notes ?? null,
      deadline: rfq.deadline.toISOString(),
      createdAt: rfq.createdAt.toISOString(),
      quotes: (quotesByRfq.get(rfq.id) ?? []).map(q => ({
        ...q,
        supplierId: q.supplierId ?? null,
        notes: q.notes ?? null,
      })),
    }),
  );
  res.json(out);
});

router.get("/rfqs/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const orgId = await resolveOrgId(req);
  const result = await loadRfq(id, orgId);
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
