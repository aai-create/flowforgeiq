import { Router, type IRouter } from "express";
import multer from "multer";
import {
  db,
  documentsTable,
  extractionsTable,
  extractionCorrectionsTable,
  shipmentsTable,
  suppliersTable,
  sampleRequestsTable,
} from "@workspace/db";
import { and, desc, eq, asc, inArray } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import {
  ListDocumentsQueryParams,
  ListDocumentsResponseItem,
  UpdateDocumentBody,
  UpdateDocumentParams,
  SaveExtractionCorrectionBody,
  SaveExtractionCorrectionParams,
  SaveExtractionCorrectionResponse,
} from "@workspace/api-zod";
import { runExtraction } from "../lib/extraction";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function getFileType(mimetype: string, originalname: string): string {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel") || /\.(xlsx?|csv)$/i.test(originalname)) return "spreadsheet";
  if (mimetype.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm)$/i.test(originalname)) return "audio";
  return "pdf";
}

async function loadDocumentWithExtraction(id: number) {
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!doc) return null;
  const [ext] = await db.select().from(extractionsTable).where(eq(extractionsTable.documentId, id)).orderBy(desc(extractionsTable.createdAt)).limit(1);
  return { ...doc, extraction: ext ?? undefined };
}

router.get("/documents", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const params = ListDocumentsQueryParams.parse(req.query);
  const docs = params.shipmentId != null
    ? await db.select().from(documentsTable).where(and(eq(documentsTable.shipmentId, params.shipmentId), eq(documentsTable.orgId, orgId))).orderBy(desc(documentsTable.createdAt))
    : params.sampleRequestId != null
      ? await db.select().from(documentsTable).where(and(eq(documentsTable.sampleRequestId, params.sampleRequestId), eq(documentsTable.orgId, orgId))).orderBy(desc(documentsTable.createdAt))
    : await db.select().from(documentsTable).where(eq(documentsTable.orgId, orgId)).orderBy(desc(documentsTable.createdAt));

  if (!docs.length) { res.json([]); return; }

  const docIds = docs.map(d => d.id);
  const allExtractions = await db.select().from(extractionsTable)
    .where(docIds.length === 1 ? eq(extractionsTable.documentId, docIds[0]) : inArray(extractionsTable.documentId, docIds))
    .orderBy(desc(extractionsTable.createdAt));

  const extByDoc = new Map<number, typeof allExtractions[0]>();
  for (const ext of allExtractions) {
    if (!extByDoc.has(ext.documentId)) extByDoc.set(ext.documentId, ext);
  }

  res.json(docs.map(doc => ListDocumentsResponseItem.parse({ ...doc, extraction: extByDoc.get(doc.id) })));
});

router.post("/documents", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: "No file provided" }); return; }

  const rawShipmentId = req.body.shipmentId;
  const rawSampleRequestId = req.body.sampleRequestId;
  const parsedShipmentId = rawShipmentId !== undefined && rawShipmentId !== "" ? Number(rawShipmentId) : null;
  if (parsedShipmentId !== null && (Number.isNaN(parsedShipmentId) || parsedShipmentId <= 0)) {
    res.status(400).json({ error: "Invalid shipmentId" }); return;
  }
  const shipmentId = parsedShipmentId;
  const parsedSampleRequestId = rawSampleRequestId !== undefined && rawSampleRequestId !== "" ? Number(rawSampleRequestId) : null;
  if (parsedSampleRequestId !== null && (Number.isNaN(parsedSampleRequestId) || parsedSampleRequestId <= 0)) {
    res.status(400).json({ error: "Invalid sampleRequestId" }); return;
  }
  if (shipmentId !== null && parsedSampleRequestId !== null) {
    res.status(400).json({ error: "A document cannot be linked to both a shipment and a sample" }); return;
  }
  const orgId = await resolveOrgId(req);

  // Validate that the provided shipmentId belongs to this org
  if (shipmentId !== null) {
    const [shipCheck] = await db.select({ id: shipmentsTable.id }).from(shipmentsTable)
      .where(and(eq(shipmentsTable.id, shipmentId), eq(shipmentsTable.orgId, orgId))).limit(1);
    if (!shipCheck) { res.status(400).json({ error: "Shipment not found" }); return; }
  }
  if (parsedSampleRequestId !== null) {
    const [sampleCheck] = await db.select({ id: sampleRequestsTable.id }).from(sampleRequestsTable)
      .where(and(eq(sampleRequestsTable.id, parsedSampleRequestId), eq(sampleRequestsTable.orgId, orgId))).limit(1);
    if (!sampleCheck) { res.status(400).json({ error: "Sample request not found" }); return; }
  }
  const sourceChannel = (req.body.sourceChannel as string | undefined) ?? "upload";
  const fileType = getFileType(file.mimetype, file.originalname);

  const [doc] = await db.insert(documentsTable).values({
    shipmentId,
    sampleRequestId: parsedSampleRequestId,
    fileName: file.originalname,
    fileType,
    mimeType: file.mimetype,
    fileSize: file.size,
    storageData: file.buffer.toString("base64"),
    sourceChannel,
    status: "processing",
    orgId,
  }).returning();

  const [extraction] = await db.insert(extractionsTable).values({
    documentId: doc.id,
    status: "processing",
    extractedFields: {},
    fieldProvenance: {},
    lineItems: [],
    reconciliationFindings: [],
    confidence: 0,
    orgId,
  }).returning();

  res.status(201).json(ListDocumentsResponseItem.parse({ ...doc, extraction }));

  setImmediate(async () => {
    try {
      // Resolve supplierId from pre-linked shipment for supplier-scoped corrections
      let supplierId: number | undefined;
      if (shipmentId) {
        const [linkedShipment] = await db.select().from(shipmentsTable).where(and(eq(shipmentsTable.id, shipmentId), eq(shipmentsTable.orgId, orgId))).limit(1);
        if (linkedShipment) supplierId = linkedShipment.supplierId;
      }

      const [shipmentRows, corrections, poExtractionsRaw] = await Promise.all([
        db.select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
          .from(shipmentsTable)
          .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
          .where(eq(shipmentsTable.orgId, orgId))
          .orderBy(asc(shipmentsTable.id)),
        db.select().from(extractionCorrectionsTable)
          .where(eq(extractionCorrectionsTable.orgId, orgId))
          .orderBy(asc(extractionCorrectionsTable.createdAt)),
        // Load line items from previously extracted *purchase_order* documents, grouped by shipmentId
        db.select({
          shipmentId: documentsTable.shipmentId,
          lineItems: extractionsTable.lineItems,
          extractedFields: extractionsTable.extractedFields,
        })
          .from(documentsTable)
          .innerJoin(extractionsTable, eq(extractionsTable.documentId, documentsTable.id))
          .where(and(eq(documentsTable.orgId, orgId), eq(extractionsTable.status, "extracted"))),
      ]);

      // Build PO line-items map: shipmentId → LineItem[] — restricted to purchase_order docs only
      type ExtLineItem = { description?: string; quantity?: number; unitPrice?: number; totalPrice?: number; unit?: string };
      const poLineItemsByShipment: Record<number, ExtLineItem[]> = {};
      for (const row of poExtractionsRaw) {
        if (!row.shipmentId) continue;
        const ef = row.extractedFields as Record<string, unknown>;
        // Only use line items from documents classified as purchase orders
        if (ef?.documentType !== "purchase_order") continue;
        const lineItems = row.lineItems as ExtLineItem[];
        if (!Array.isArray(lineItems) || lineItems.length === 0) continue;
        const existing = poLineItemsByShipment[row.shipmentId] ?? [];
        poLineItemsByShipment[row.shipmentId] = [...existing, ...lineItems];
      }

      const result = await runExtraction({
        doc,
        fileBuffer: file.buffer,
        shipments: shipmentRows.map(r => ({ ...r.shipment, supplierName: r.supplierName })),
        corrections,
        orgId,
        supplierId,
        poLineItemsByShipment,
      });

      // If supplierId wasn't known pre-extraction, derive it from matched shipment
      if (!supplierId && result.matchedShipmentId) {
        const [matched] = await db.select().from(shipmentsTable).where(and(eq(shipmentsTable.id, result.matchedShipmentId), eq(shipmentsTable.orgId, orgId))).limit(1);
        if (matched) supplierId = matched.supplierId;
      }

      await db.update(extractionsTable).set({
        extractedFields: result.extractedFields,
        fieldProvenance: result.fieldProvenance,
        lineItems: result.lineItems,
        reconciliationFindings: result.reconciliationFindings,
        transcriptText: result.transcriptText ?? null,
        confidence: result.confidence,
        shipmentMatchId: result.matchedShipmentId ?? null,
        status: "extracted",
        errorMessage: null,
      }).where(eq(extractionsTable.id, extraction.id));

      // Evidence belongs to the sample until the buyer explicitly approves it;
      // extraction must never move a sample document into a shipment.
      const resolvedShipmentId = parsedSampleRequestId !== null ? null : (result.matchedShipmentId ?? shipmentId ?? null);
      const docStatus = resolvedShipmentId ? "extracted" : "unmatched";
      await db.update(documentsTable).set({ shipmentId: resolvedShipmentId, status: parsedSampleRequestId !== null ? "extracted" : docStatus }).where(eq(documentsTable.id, doc.id));

      // QC stage tagging: if QC photo is uploaded and has a result, tag the shipment status
      const extractedFields = result.extractedFields as Record<string, unknown>;
      const docType = extractedFields.documentType as string | undefined;
      if (
        (docType === "qc_photo" || docType === "qc_report") &&
        resolvedShipmentId &&
        extractedFields.qcResult
      ) {
        const qcResult = extractedFields.qcResult as string;
        const newStatus = qcResult === "fail" ? "at-risk" : undefined;
        if (newStatus) {
          await db.update(shipmentsTable).set({ status: newStatus }).where(and(eq(shipmentsTable.id, resolvedShipmentId), eq(shipmentsTable.orgId, orgId)));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.update(extractionsTable).set({ status: "failed", errorMessage: msg }).where(eq(extractionsTable.id, extraction.id));
      await db.update(documentsTable).set({ status: "failed" }).where(eq(documentsTable.id, doc.id));
    }
  });
});

router.get("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const doc = await loadDocumentWithExtraction(id);
  if (!doc || doc.orgId !== orgId) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ListDocumentsResponseItem.parse(doc));
});

router.patch("/documents/:id", async (req, res) => {
  const { id } = UpdateDocumentParams.parse(req.params);
  const orgId = await resolveOrgId(req);
  const input = UpdateDocumentBody.parse(req.body);
  const newShipmentId = input.shipmentId ?? null;
  const newSampleRequestId = input.sampleRequestId ?? null;
  if (newShipmentId !== null && newSampleRequestId !== null) {
    res.status(400).json({ error: "A document cannot be linked to both a shipment and a sample" }); return;
  }

  // Normalize status: linked docs are "extracted" (or keep "failed"/"processing");
  // unlinked docs become "unmatched" unless they were never extracted.
  const [existing] = await db.select().from(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.orgId, orgId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (newSampleRequestId !== null) {
    const [sampleCheck] = await db.select({ id: sampleRequestsTable.id }).from(sampleRequestsTable)
      .where(and(eq(sampleRequestsTable.id, newSampleRequestId), eq(sampleRequestsTable.orgId, orgId))).limit(1);
    if (!sampleCheck) { res.status(400).json({ error: "Sample request not found" }); return; }
  }

  let newStatus = existing.status;
  if (newShipmentId !== null && existing.status === "unmatched") newStatus = "extracted";
  if (newShipmentId === null && existing.status === "extracted") newStatus = "unmatched";

  await db.update(documentsTable)
    .set({ shipmentId: newShipmentId, sampleRequestId: newSampleRequestId, status: newSampleRequestId !== null ? "extracted" : newStatus })
    .where(and(eq(documentsTable.id, id), eq(documentsTable.orgId, orgId)));

  // Sync the latest extraction's shipmentMatchId to match the new link
  const [latestExt] = await db.select().from(extractionsTable)
    .where(eq(extractionsTable.documentId, id))
    .orderBy(desc(extractionsTable.createdAt)).limit(1);
  if (latestExt) {
    await db.update(extractionsTable)
        .set({ shipmentMatchId: newSampleRequestId !== null ? null : newShipmentId })
      .where(eq(extractionsTable.id, latestExt.id));
  }

  const doc = await loadDocumentWithExtraction(id);
  res.json(ListDocumentsResponseItem.parse(doc));
});

router.get("/extractions/:id/corrections", async (req, res) => {
  const id = Number(req.params.id);
  const orgId = await resolveOrgId(req);
  const corrections = await db.select()
    .from(extractionCorrectionsTable)
    .where(and(eq(extractionCorrectionsTable.extractionId, id), eq(extractionCorrectionsTable.orgId, orgId)))
    .orderBy(asc(extractionCorrectionsTable.createdAt));
  res.json(corrections);
});

router.post("/extractions/:id/corrections", async (req, res) => {
  const { id } = SaveExtractionCorrectionParams.parse(req.params);
  const input = SaveExtractionCorrectionBody.parse(req.body);

  // Derive supplierId from extraction → document → shipment when not provided by the client
  let supplierId: number | null = input.supplierId ?? null;
  if (supplierId === null) {
    const [ext] = await db.select({ documentId: extractionsTable.documentId })
      .from(extractionsTable).where(eq(extractionsTable.id, id)).limit(1);
    if (ext) {
      const [docRow] = await db.select({ shipmentId: documentsTable.shipmentId })
        .from(documentsTable).where(eq(documentsTable.id, ext.documentId)).limit(1);
      if (docRow?.shipmentId) {
        const [shipRow] = await db.select({ supplierId: shipmentsTable.supplierId })
          .from(shipmentsTable).where(eq(shipmentsTable.id, docRow.shipmentId)).limit(1);
        if (shipRow) supplierId = shipRow.supplierId;
      }
    }
  }

  const orgId = await resolveOrgId(req);
  const [correction] = await db.insert(extractionCorrectionsTable).values({
    extractionId: id,
    supplierId,
    documentType: input.documentType,
    fieldPath: input.fieldPath,
    originalValue: input.originalValue ?? null,
    correctedValue: input.correctedValue,
    orgId,
  }).returning();
  res.json(SaveExtractionCorrectionResponse.parse(correction));
});

export default router;
