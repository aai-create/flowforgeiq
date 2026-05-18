import { Router, type IRouter } from "express";
import {
  db,
  documentsTable,
  extractionsTable,
  shipmentsTable,
  suppliersTable,
  extractionCorrectionsTable,
} from "@workspace/db";
import { InboundEmailWebhookBody } from "@workspace/api-zod";
import { asc, eq } from "drizzle-orm";
import { runExtraction } from "../lib/extraction";

const router: IRouter = Router();

function getMimeFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return "spreadsheet";
  if (mimeType.startsWith("audio/")) return "audio";
  return "pdf";
}

async function ingestDocumentFromBase64({
  fileName,
  mimeType,
  base64Content,
  sourceChannel,
}: {
  fileName: string;
  mimeType: string;
  base64Content: string;
  sourceChannel: string;
}): Promise<number> {
  const fileBuffer = Buffer.from(base64Content, "base64");
  const fileType = getMimeFileType(mimeType);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      shipmentId: null,
      fileName,
      fileType,
      mimeType,
      fileSize: fileBuffer.length,
      storageData: base64Content,
      sourceChannel,
      status: "processing",
    })
    .returning();

  const [extraction] = await db
    .insert(extractionsTable)
    .values({
      documentId: doc.id,
      status: "processing",
      extractedFields: {},
      fieldProvenance: {},
      lineItems: [],
      reconciliationFindings: [],
      confidence: 0,
    })
    .returning();

  setImmediate(async () => {
    try {
      const [shipmentRows, corrections] = await Promise.all([
        db
          .select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
          .from(shipmentsTable)
          .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
          .orderBy(asc(shipmentsTable.id)),
        db
          .select()
          .from(extractionCorrectionsTable)
          .orderBy(asc(extractionCorrectionsTable.createdAt)),
      ]);

      const result = await runExtraction({
        doc,
        fileBuffer,
        shipments: shipmentRows.map((r) => ({ ...r.shipment, supplierName: r.supplierName })),
        corrections,
        supplierId: undefined,
        poLineItemsByShipment: {},
      });

      await db
        .update(extractionsTable)
        .set({
          extractedFields: result.extractedFields,
          fieldProvenance: result.fieldProvenance,
          lineItems: result.lineItems,
          reconciliationFindings: result.reconciliationFindings,
          transcriptText: result.transcriptText ?? null,
          confidence: result.confidence,
          shipmentMatchId: result.matchedShipmentId ?? null,
          status: "extracted",
          errorMessage: null,
        })
        .where(eq(extractionsTable.id, extraction.id));

      const resolvedShipmentId = result.matchedShipmentId ?? null;
      const docStatus = resolvedShipmentId ? "extracted" : "unmatched";
      await db
        .update(documentsTable)
        .set({ shipmentId: resolvedShipmentId, status: docStatus })
        .where(eq(documentsTable.id, doc.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(extractionsTable)
        .set({ status: "failed", errorMessage: msg })
        .where(eq(extractionsTable.id, extraction.id));
      await db
        .update(documentsTable)
        .set({ status: "failed" })
        .where(eq(documentsTable.id, doc.id));
    }
  });

  return doc.id;
}

export { ingestDocumentFromBase64 };

router.post("/webhooks/email", async (req, res) => {
  const parsed = InboundEmailWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const { Attachments } = parsed.data;

  if (!Attachments || Attachments.length === 0) {
    res.json({ accepted: true, documentIds: [] });
    return;
  }

  const documentIds: number[] = [];

  for (const attachment of Attachments) {
    if (!attachment.Content) continue;
    const docId = await ingestDocumentFromBase64({
      fileName: attachment.Name,
      mimeType: attachment.ContentType,
      base64Content: attachment.Content,
      sourceChannel: "gmail",
    });
    documentIds.push(docId);
  }

  res.json({ accepted: true, documentIds });
});

export default router;
