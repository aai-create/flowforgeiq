import { openai } from "@workspace/integrations-openai-ai-server";

interface ShipmentRow {
  id: number;
  poNumber: string;
  product: string;
  supplierName: string;
  customerName: string;
  status: string;
  currentStageId: string;
}

interface CorrectionRow {
  documentType: string;
  fieldPath: string;
  originalValue: string | null;
  correctedValue: string;
  supplierId: number | null;
}

interface DocRow {
  id: number;
  fileName: string;
  fileType: string;
  mimeType: string;
  shipmentId: number | null;
}

interface PoLineItemsMap {
  [shipmentId: number]: LineItem[];
}

interface ExtractionInput {
  doc: DocRow;
  fileBuffer: Buffer;
  shipments: ShipmentRow[];
  corrections: CorrectionRow[];
  supplierId?: number;
  poLineItemsByShipment?: PoLineItemsMap;
}

export interface ExtractedFields {
  poNumber?: string;
  supplier?: string;
  buyer?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  currency?: string;
  totalAmount?: number;
  incoterms?: string;
  paymentTerms?: string;
  etd?: string;
  eta?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  documentType?: string;
  qcResult?: string;
  qcIssues?: string[];
  transcriptSummary?: string;
  detectedEntities?: string[];
}

export interface FieldProvenanceEntry {
  confidence: number;
  snippet: string;
}

export type FieldProvenance = Record<string, FieldProvenanceEntry>;

export interface LineItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  unit?: string;
  discrepancy?: string;
}

export interface ReconciliationFinding {
  type?: string;
  field?: string;
  expected?: string;
  actual?: string;
  severity?: string;
}

export interface ExtractionResult {
  extractedFields: ExtractedFields;
  fieldProvenance: FieldProvenance;
  lineItems: LineItem[];
  reconciliationFindings: ReconciliationFinding[];
  transcriptText?: string;
  confidence: number;
  matchedShipmentId?: number;
}

const SHIPMENT_CONTEXT = (shipments: ShipmentRow[]) =>
  shipments.map(s => `ID:${s.id} PO:${s.poNumber} Product:"${s.product}" Supplier:"${s.supplierName}" Customer:"${s.customerName}"`).join("\n");

/**
 * Maps each file modality to the set of business document-type names that can
 * be produced by that modality. Corrections are saved with the BUSINESS type
 * (e.g. "commercial_invoice") but applied during extraction where only the
 * MODALITY is known. We match against both so the correction loop works.
 */
const MODALITY_DOC_TYPES: Record<string, string[]> = {
  pdf: [
    "pdf",
    "commercial_invoice", "packing_list", "purchase_order", "qc_report",
    "factory_quote", "tech_pack", "shipping_doc", "other",
  ],
  image: [
    "image",
    "qc_photo", "factory_photo", "sample_photo", "packaging_photo", "document_scan",
  ],
  spreadsheet: [
    "spreadsheet",
    "price_list", "costing_sheet", "shipping_schedule", "packing_list",
    "inventory_list", "other",
  ],
  audio: ["audio", "voice_note"],
};

/**
 * Returns a prompt-ready string listing user corrections that apply to this
 * extraction context (matched by supplier scope + any doc type in the modality
 * group, or "any" wildcard). Empty string when no relevant corrections exist.
 */
const CORRECTION_CONTEXT = (corrections: CorrectionRow[], modality: string, supplierId?: number): string => {
  const applicableDocTypes = new Set([
    "any",
    modality,
    ...(MODALITY_DOC_TYPES[modality] ?? []),
  ]);

  const relevant = corrections.filter(c => {
    if (!applicableDocTypes.has(c.documentType)) return false;
    // Supplier scoping: supplier-specific corrections apply only when supplierId matches;
    // global corrections (supplierId=null) apply to everyone.
    if (c.supplierId !== null) {
      return supplierId !== undefined && c.supplierId === supplierId;
    }
    return true; // global correction
  });

  if (!relevant.length) return "";
  return "\n\nUser correction preferences (apply these field overrides):\n" +
    relevant.map(c => `- ${c.fieldPath}: prefer "${c.correctedValue}"${c.originalValue ? ` (was "${c.originalValue}")` : ""}`).join("\n");
};

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const mod = await import("pdf-parse") as unknown as { default?: (buf: Buffer) => Promise<{ text: string }>; parse?: (buf: Buffer) => Promise<{ text: string }> };
    const fn = mod.default ?? mod.parse;
    if (!fn) throw new Error("pdf-parse: no callable export");
    const data = await fn(buffer);
    return data.text ?? "";
  } catch {
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
  }
}

async function parseSpreadsheet(buffer: Buffer, filename: string): Promise<string> {
  if (/\.csv$/i.test(filename)) return buffer.toString("utf-8");
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheets: string[] = [];
    for (const sheetName of wb.SheetNames.slice(0, 5)) {
      const ws = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });
      sheets.push(`=== Sheet: ${sheetName} ===\n${csv.slice(0, 3000)}`);
    }
    return sheets.join("\n\n");
  } catch {
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
  }
}

function parseLineItems(raw: unknown[]): LineItem[] {
  return raw.map((li: unknown) => {
    const item = li as Record<string, unknown>;
    return {
      description: typeof item.description === "string" ? item.description : undefined,
      quantity: typeof item.quantity === "number" ? item.quantity : undefined,
      unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : undefined,
      totalPrice: typeof item.totalPrice === "number" ? item.totalPrice : undefined,
      unit: typeof item.unit === "string" ? item.unit : undefined,
    };
  });
}

function parseExtractedFields(raw: Record<string, unknown>): ExtractedFields {
  const fields: ExtractedFields = {};
  for (const key of Object.keys(raw)) {
    if (raw[key] !== null && raw[key] !== undefined) {
      (fields as Record<string, unknown>)[key] = raw[key];
    }
  }
  return fields;
}

function parseFieldProvenance(raw: Record<string, unknown> | undefined): FieldProvenance {
  if (!raw) return {};
  const prov: FieldProvenance = {};
  for (const key of Object.keys(raw)) {
    const entry = raw[key] as Record<string, unknown>;
    if (entry && typeof entry === "object") {
      prov[key] = {
        confidence: typeof entry.confidence === "number" ? entry.confidence : 0.5,
        snippet: typeof entry.snippet === "string" ? entry.snippet : "",
      };
    }
  }
  return prov;
}

const PROVENANCE_SCHEMA = `"fieldProvenance": {
  "<fieldName>": { "confidence": number (0-1), "snippet": "exact text fragment from document that supports this value" }
}`;

async function extractFromPdfOrText(
  textContent: string,
  doc: DocRow,
  shipments: ShipmentRow[],
  corrections: CorrectionRow[],
  supplierId?: number,
): Promise<ExtractionResult> {
  const corrCtx = CORRECTION_CONTEXT(corrections, "pdf", supplierId);
  const shipCtx = SHIPMENT_CONTEXT(shipments);

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: `You are a supply-chain document extraction AI.

Active shipments for PO matching:
${shipCtx}

Document filename: ${doc.fileName}
Document text:
${textContent.slice(0, 7500)}
${corrCtx}

Respond with JSON only (no markdown). Schema:
{
  "extractedFields": {
    "poNumber": string|null, "supplier": string|null, "buyer": string|null,
    "invoiceNumber": string|null, "invoiceDate": string|null, "currency": string|null,
    "totalAmount": number|null, "incoterms": string|null, "paymentTerms": string|null,
    "etd": string|null, "eta": string|null, "portOfLoading": string|null,
    "portOfDischarge": string|null,
    "documentType": "commercial_invoice"|"packing_list"|"purchase_order"|"qc_report"|"factory_quote"|"tech_pack"|"shipping_doc"|"other",
    "qcResult": string|null, "qcIssues": string[]
  },
  ${PROVENANCE_SCHEMA},
  "lineItems": [{"description":string,"quantity":number,"unitPrice":number,"totalPrice":number,"unit":string}],
  "matchedShipmentId": number|null,
  "confidence": number
}` }],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const fields = parseExtractedFields(raw.extractedFields ?? {});
  const fieldProvenance = parseFieldProvenance(raw.fieldProvenance);
  const lineItems = parseLineItems(raw.lineItems ?? []);
  const matchedShipmentId: number | undefined = raw.matchedShipmentId ?? undefined;
  const reconciliationFindings = reconcileDocument(fields, lineItems, matchedShipmentId, shipments);

  return { extractedFields: fields, fieldProvenance, lineItems, reconciliationFindings, confidence: Math.min(Math.max(Number(raw.confidence ?? 0.7), 0), 1), matchedShipmentId };
}

async function extractFromImage(
  imageBase64: string,
  mimeType: string,
  doc: DocRow,
  shipments: ShipmentRow[],
  corrections: CorrectionRow[],
  supplierId?: number,
): Promise<ExtractionResult> {
  const corrCtx = CORRECTION_CONTEXT(corrections, "image", supplierId);
  const shipCtx = SHIPMENT_CONTEXT(shipments);

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are a supply-chain QC and document intelligence AI.

Active shipments for matching:
${shipCtx}

Document filename: ${doc.fileName}
${corrCtx}

Respond with JSON only. Schema:
{
  "extractedFields": {
    "poNumber": string|null, "supplier": string|null,
    "documentType": "qc_photo"|"factory_photo"|"sample_photo"|"packaging_photo"|"document_scan"|"other",
    "qcResult": "pass"|"fail"|"pending"|null, "qcIssues": string[], "detectedEntities": string[]
  },
  ${PROVENANCE_SCHEMA},
  "matchedShipmentId": number|null, "confidence": number, "imageDescription": string
}`,
        },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ],
    }],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const fields = parseExtractedFields(raw.extractedFields ?? {});
  if (raw.imageDescription) fields.transcriptSummary = raw.imageDescription as string;
  const fieldProvenance = parseFieldProvenance(raw.fieldProvenance);

  return { extractedFields: fields, fieldProvenance, lineItems: [], reconciliationFindings: [], confidence: Math.min(Math.max(Number(raw.confidence ?? 0.75), 0), 1), matchedShipmentId: raw.matchedShipmentId ?? undefined };
}

function detectAudioFormat(mimeType: string, filename: string): "mp3" | "wav" | "webm" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3") || ext === "mp3") return "mp3";
  if (mimeType.includes("wav") || ext === "wav") return "wav";
  if (mimeType.includes("webm") || ext === "webm") return "webm";
  // ogg, flac, m4a, mp4 → closest Whisper-supported format
  if (mimeType.includes("ogg") || ext === "ogg") return "webm"; // ogg/opus is webm-compatible
  if (mimeType.includes("flac") || ext === "flac") return "wav"; // lossless → wav path
  if (mimeType.includes("m4a") || ext === "m4a" || mimeType.includes("mp4") || ext === "mp4") return "mp3"; // AAC → mp3 path
  return "mp3"; // safe default
}

async function extractFromAudio(
  audioBuffer: Buffer,
  mimeType: string,
  doc: DocRow,
  shipments: ShipmentRow[],
  corrections: CorrectionRow[],
  supplierId?: number,
): Promise<ExtractionResult> {
  const corrCtx = CORRECTION_CONTEXT(corrections, "audio", supplierId);
  const shipCtx = SHIPMENT_CONTEXT(shipments);

  const { speechToText } = await import("@workspace/integrations-openai-ai-server/audio");
  const audioFormat = detectAudioFormat(mimeType, doc.fileName);
  const transcript = await speechToText(audioBuffer, audioFormat);

  const summaryResponse = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: `You are a supply-chain communication AI.

Active shipments:
${shipCtx}

File: ${doc.fileName}
Transcript: ${transcript}
${corrCtx}

Respond with JSON only. Schema:
{
  "extractedFields": { "poNumber": string|null, "supplier": string|null, "documentType": "voice_note", "transcriptSummary": string, "detectedEntities": string[] },
  ${PROVENANCE_SCHEMA},
  "matchedShipmentId": number|null, "confidence": number
}` }],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(summaryResponse.choices[0]?.message?.content ?? "{}");
  const fields = parseExtractedFields(raw.extractedFields ?? {});
  const fieldProvenance = parseFieldProvenance(raw.fieldProvenance);

  return { extractedFields: fields, fieldProvenance, lineItems: [], reconciliationFindings: [], transcriptText: transcript, confidence: Math.min(Math.max(Number(raw.confidence ?? 0.8), 0), 1), matchedShipmentId: raw.matchedShipmentId ?? undefined };
}

async function extractFromSpreadsheetText(
  csvText: string,
  doc: DocRow,
  shipments: ShipmentRow[],
  corrections: CorrectionRow[],
  supplierId?: number,
): Promise<ExtractionResult> {
  const corrCtx = CORRECTION_CONTEXT(corrections, "spreadsheet", supplierId);
  const shipCtx = SHIPMENT_CONTEXT(shipments);

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: `You are a supply-chain data extraction AI.

Active shipments:
${shipCtx}

Filename: ${doc.fileName}
Spreadsheet data:
${csvText.slice(0, 7000)}
${corrCtx}

Respond with JSON only. Schema:
{
  "extractedFields": {
    "poNumber": string|null, "supplier": string|null, "buyer": string|null,
    "currency": string|null, "totalAmount": number|null, "paymentTerms": string|null,
    "incoterms": string|null, "documentType": "price_list"|"costing_sheet"|"shipping_schedule"|"packing_list"|"inventory_list"|"other"
  },
  ${PROVENANCE_SCHEMA},
  "lineItems": [{"description":string,"quantity":number,"unitPrice":number,"totalPrice":number,"unit":string}],
  "matchedShipmentId": number|null, "confidence": number
}` }],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  const fields = parseExtractedFields(raw.extractedFields ?? {});
  const fieldProvenance = parseFieldProvenance(raw.fieldProvenance);
  const lineItems = parseLineItems(raw.lineItems ?? []);
  const matchedShipmentId: number | undefined = raw.matchedShipmentId ?? undefined;
  const reconciliationFindings = reconcileDocument(fields, lineItems, matchedShipmentId, shipments);

  return { extractedFields: fields, fieldProvenance, lineItems, reconciliationFindings, confidence: Math.min(Math.max(Number(raw.confidence ?? 0.7), 0), 1), matchedShipmentId };
}

function reconcileDocument(
  fields: ExtractedFields,
  lineItems: LineItem[],
  matchedShipmentId: number | undefined,
  shipments: ShipmentRow[],
  poLineItemsByShipment?: PoLineItemsMap,
): ReconciliationFinding[] {
  const isInvoice = fields.documentType === "commercial_invoice";
  const isPackingList = fields.documentType === "packing_list";
  if ((!isInvoice && !isPackingList) || !matchedShipmentId) return [];

  const shipment = shipments.find(s => s.id === matchedShipmentId);
  if (!shipment) return [];

  const findings: ReconciliationFinding[] = [];

  // ── Header checks ─────────────────────────────────────────────────────────
  if (fields.poNumber && fields.poNumber !== shipment.poNumber) {
    findings.push({ type: "po_mismatch", field: "poNumber", expected: shipment.poNumber, actual: fields.poNumber, severity: "critical" });
  }

  if (fields.supplier &&
      !shipment.supplierName.toLowerCase().includes(fields.supplier.toLowerCase()) &&
      !fields.supplier.toLowerCase().includes(shipment.supplierName.toLowerCase())) {
    findings.push({ type: "supplier_mismatch", field: "supplier", expected: shipment.supplierName, actual: fields.supplier, severity: "high" });
  }

  if (isInvoice && lineItems.length > 0) {
    // ── Arithmetic consistency ─────────────────────────────────────────────
    const computedTotal = lineItems.reduce((sum, li) => sum + (li.totalPrice ?? (li.quantity ?? 0) * (li.unitPrice ?? 0)), 0);
    if (fields.totalAmount && Math.abs(computedTotal - fields.totalAmount) > 0.01) {
      findings.push({ type: "total_amount_mismatch", field: "totalAmount", expected: computedTotal.toFixed(2), actual: String(fields.totalAmount), severity: "high" });
    }

    for (const li of lineItems) {
      if (li.unitPrice != null && li.quantity != null && li.totalPrice != null) {
        const expected = Number((li.quantity * li.unitPrice).toFixed(2));
        if (Math.abs(expected - li.totalPrice) > 0.01) {
          findings.push({ type: "line_item_arithmetic_error", field: "lineItems", expected: String(expected), actual: String(li.totalPrice), severity: "warning" });
        }
      }
    }

    // ── Compare against parent PO line items (if available) ────────────────
    const poLines = poLineItemsByShipment?.[matchedShipmentId];
    if (poLines && poLines.length > 0) {
      // Per-SKU quantity and price check
      for (const poLi of poLines) {
        const poDesc = (poLi.description ?? "").toLowerCase();
        if (!poDesc) continue;

        const invoiceLi = lineItems.find(li =>
          (li.description ?? "").toLowerCase().includes(poDesc) ||
          poDesc.includes((li.description ?? "").toLowerCase())
        );

        if (!invoiceLi) {
          findings.push({
            type: "po_line_item_missing",
            field: "lineItems",
            expected: `${poLi.description} (qty ${poLi.quantity ?? "?"}  @ ${poLi.unitPrice ?? "?"})`,
            actual: "not found on invoice",
            severity: "high",
          });
          continue;
        }

        if (poLi.quantity != null && invoiceLi.quantity != null && Math.abs(poLi.quantity - invoiceLi.quantity) > 0.001) {
          findings.push({
            type: "quantity_mismatch",
            field: "lineItems",
            expected: `qty ${poLi.quantity} for "${poLi.description}"`,
            actual: `qty ${invoiceLi.quantity}`,
            severity: "high",
          });
        }

        if (poLi.unitPrice != null && invoiceLi.unitPrice != null && Math.abs(poLi.unitPrice - invoiceLi.unitPrice) > 0.001) {
          findings.push({
            type: "unit_price_mismatch",
            field: "lineItems",
            expected: `${poLi.unitPrice} for "${poLi.description}"`,
            actual: String(invoiceLi.unitPrice),
            severity: "high",
          });
        }
      }

      // Check for invoice lines not on the PO
      for (const li of lineItems) {
        const liDesc = (li.description ?? "").toLowerCase();
        if (!liDesc) continue;
        const onPo = poLines.some(poLi => {
          const poDesc = (poLi.description ?? "").toLowerCase();
          return liDesc.includes(poDesc) || poDesc.includes(liDesc);
        });
        if (!onPo) {
          findings.push({
            type: "unexpected_line_item",
            field: "lineItems",
            expected: "item present on PO",
            actual: `"${li.description}" not on PO`,
            severity: "warning",
          });
        }
      }
    } else {
      // No PO line items from prior documents — fall back to shipment product text match
      const productsOnPo = shipment.product.toLowerCase();
      const lineDescriptions = lineItems.map(li => (li.description ?? "").toLowerCase());
      const hasMatchingProduct = lineDescriptions.some(d => d.includes(productsOnPo) || productsOnPo.includes(d));
      if (!hasMatchingProduct) {
        findings.push({ type: "product_not_found", field: "lineItems", expected: shipment.product, actual: lineItems.map(li => li.description ?? "?").join(", "), severity: "warning" });
      }
    }
  }

  return findings;
}

// Patch reconciliation findings with PO line-item comparison after extraction
function applyPoReconciliation(
  result: ExtractionResult,
  shipments: ShipmentRow[],
  poLineItemsByShipment?: PoLineItemsMap,
): ExtractionResult {
  const docType = result.extractedFields.documentType;
  if (docType !== "commercial_invoice" && docType !== "packing_list") return result;
  if (!result.matchedShipmentId) return result;
  const poFindings = reconcileDocument(
    result.extractedFields,
    result.lineItems,
    result.matchedShipmentId,
    shipments,
    poLineItemsByShipment,
  );
  return { ...result, reconciliationFindings: poFindings };
}

export async function runExtraction(input: ExtractionInput): Promise<ExtractionResult> {
  const { doc, fileBuffer, shipments, corrections, supplierId, poLineItemsByShipment } = input;

  let result: ExtractionResult;

  if (doc.fileType === "image") {
    const base64 = fileBuffer.toString("base64");
    result = await extractFromImage(base64, doc.mimeType, doc, shipments, corrections, supplierId);
  } else if (doc.fileType === "audio") {
    result = await extractFromAudio(fileBuffer, doc.mimeType, doc, shipments, corrections, supplierId);
  } else if (doc.fileType === "spreadsheet") {
    const csvText = await parseSpreadsheet(fileBuffer, doc.fileName);
    result = await extractFromSpreadsheetText(csvText, doc, shipments, corrections, supplierId);
  } else {
    const text = await parsePdf(fileBuffer);
    result = await extractFromPdfOrText(text, doc, shipments, corrections, supplierId);
  }

  // Apply PO line-item reconciliation now that matchedShipmentId is known
  return applyPoReconciliation(result, shipments, poLineItemsByShipment);
}
