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

// ─── Text normalisation ────────────────────────────────────────────────────────

/**
 * Normalises a company name or domain segment for fuzzy comparison.
 * Strips common legal / industry suffixes and punctuation, lower-cases the result.
 */
function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(
      /\b(trading|trade|intl|international|co|ltd|inc|corp|group|textile|textiles|garment|garments|factory|factories|mfg|manufacturing|tech|technology|sourcing|apparel)\b/g,
      "",
    )
    .replace(/[\s\-_.]+/g, "")
    .trim();
}

/**
 * Extracts the company-name token from an email domain.
 * e.g. "marco@bridgelinktrading.com" → "bridgelink"
 *      "sales@sun-tex.co.uk"         → "suntex"
 */
function domainToken(email: string): string {
  const domain = (email.split("@")[1] ?? "").toLowerCase();
  const parts = domain.split(".");
  // Drop top-level domain segments (last 1–2 parts)
  const keepParts = parts.length > 2 ? parts.slice(0, parts.length - 2) : parts.slice(0, 1);
  return normaliseName(keepParts.join("-"));
}

function tokenOverlaps(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// ─── Forwarded-email parsing ───────────────────────────────────────────────────

/**
 * Extracts the original sender's email from the forwarded body text.
 * Handles "---------- Forwarded message ---------" style separators as well as
 * bare "From:" lines in English, French, and German.
 */
function extractForwardedFrom(textBody: string): string | null {
  if (!textBody) return null;

  const EMAIL_RE = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/;

  // Prefer to search within a forwarded section
  const sectionMatch = textBody.match(
    /(?:---------- Forwarded message ---------|-{3,}\s*Original Message\s*-{3,}|Begin forwarded message)/i,
  );
  const searchText = sectionMatch ? textBody.slice(sectionMatch.index!) : textBody;

  const fromLine = searchText.match(
    /^(?:From|De|Von):\s+(?:[^<\n]+<)?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/im,
  );
  if (fromLine?.[1]) return fromLine[1].toLowerCase();

  // Fallback: first email address found after the separator
  if (sectionMatch) {
    const m = searchText.match(EMAIL_RE);
    if (m?.[1]) return m[1].toLowerCase();
  }

  return null;
}

// ─── Party type resolution ─────────────────────────────────────────────────────

type PartyType = "supplier" | "buyer" | "unknown";
type SupplierMatchMethod = "exact-email" | "exact-domain" | "fuzzy-name";

interface SupplierRecord { id: number; name: string; contactEmail: string | null }
interface ShipmentRecord { id: number; poNumber: string; product: string; customerName: string; supplierId: number }

interface SupplierMatch {
  supplier: SupplierRecord;
  matchedBy: SupplierMatchMethod;
}

/**
 * Attempts to match an email address to a known supplier.
 *
 * Resolution order (most → least specific):
 *  1. Exact email address match against `contactEmail`
 *  2. Exact domain match (sender's domain == domain part of `contactEmail`)
 *  3. Fuzzy domain-token overlap against supplier name (legacy heuristic)
 *
 * Returns a match object that includes how the match was made so callers can
 * log when the fuzzy fallback is used.
 */
function matchEmailToSupplier(email: string, suppliers: SupplierRecord[]): SupplierMatch | null {
  const senderEmail = email.toLowerCase();
  const senderDomain = (senderEmail.split("@")[1] ?? "").toLowerCase();

  // ── 1. Exact email match ────────────────────────────────────────────────────
  for (const s of suppliers) {
    if (s.contactEmail && s.contactEmail.toLowerCase() === senderEmail) {
      return { supplier: s, matchedBy: "exact-email" };
    }
  }

  // ── 2. Exact domain match ───────────────────────────────────────────────────
  if (senderDomain) {
    for (const s of suppliers) {
      if (s.contactEmail) {
        const contactDomain = (s.contactEmail.split("@")[1] ?? "").toLowerCase();
        if (contactDomain && contactDomain === senderDomain) {
          return { supplier: s, matchedBy: "exact-domain" };
        }
      }
    }
  }

  // ── 3. Fuzzy name heuristic (legacy fallback) ───────────────────────────────
  const token = domainToken(email);
  if (!token || token.length < 3) return null;
  for (const s of suppliers) {
    if (tokenOverlaps(token, normaliseName(s.name))) {
      return { supplier: s, matchedBy: "fuzzy-name" };
    }
  }

  return null;
}

/**
 * Attempts to match an email address to a known buyer by comparing the
 * normalised domain token against the customerName values in shipments.
 * Returns the matched customerName, or null.
 */
function matchEmailToBuyer(email: string, shipments: ShipmentRecord[]): string | null {
  const token = domainToken(email);
  if (!token || token.length < 3) return null;
  const names = [...new Set(shipments.map((s) => s.customerName))];
  for (const name of names) {
    if (tokenOverlaps(token, normaliseName(name))) return name;
  }
  return null;
}

// ─── PO / shipment reference scanning ─────────────────────────────────────────

/**
 * Scans subject + body text for shipment-identifying signals (PO numbers,
 * product names / style codes) within the given account-scoped candidates.
 * Returns the single matching shipment id when exactly one candidate matches
 * (confidence gate — prevents false-positive auto-linking on ambiguous hits).
 */
function scanForShipmentMatch(
  subject: string,
  body: string,
  candidates: ShipmentRecord[],
): number | null {
  const raw = `${subject} ${body}`.toLowerCase();
  const stripped = raw.replace(/[^a-z0-9]/g, "");

  const hits = candidates.filter((s) => {
    // ── PO number match ──────────────────────────────────────────────────────
    const po = s.poNumber.toLowerCase();
    if (raw.includes(po)) return true;
    const poAlpha = po.replace(/[^a-z0-9]/g, "");
    if (poAlpha.length >= 4 && stripped.includes(poAlpha)) return true;

    // ── Product / style-code match ───────────────────────────────────────────
    // Product strings like "WOVEN DRESS" are often present verbatim in invoice
    // subjects. Require >= 6 chars to reduce generic-term false positives.
    const product = s.product.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (product.length >= 6 && raw.includes(product)) return true;

    // Also try stripped product token (removes spaces/hyphens for style codes)
    const productAlpha = product.replace(/\s+/g, "");
    if (productAlpha.length >= 6 && stripped.includes(productAlpha)) return true;

    return false;
  });

  // Only auto-link when there is exactly one confident match
  return hits.length === 1 ? hits[0].id : null;
}

// ─── Email routing context ────────────────────────────────────────────────────

interface EmailRoutingContext {
  /** Resolved supplier id from sender or forwarded-from email, or null */
  supplierId: number | null;
  /** Shipment id found by scanning subject/body for PO numbers, or null */
  preMatchedShipmentId: number | null;
  /**
   * Shipment ids the extraction pipeline is allowed to match against.
   * null = unresolvable sender; extraction receives an empty candidate list and
   *        cannot match any shipment (documents land in the unlinked queue).
   * number[] = account-scoped ids; extraction is restricted to these shipments.
   */
  routingShipmentIds: number[] | null;
  /** Email address of the original (forwarded-from) sender, if detectable */
  forwardedFromEmail: string | null;
  /** Whether the message body contains a forwarded-email section */
  isForwarded: boolean;
  /** Party type of the outer (forwarding) sender */
  outerSenderType: PartyType;
  /** Party type of the inner (original, forwarded-from) sender */
  innerSenderType: PartyType;
  /** True when the sender could not be matched to any known entity */
  unresolvable: boolean;
  /** Customer name matched from outer sender (the "account") */
  resolvedCustomerName: string | null;
  /** How the supplier was matched (null when no supplier was matched) */
  supplierMatchedBy: SupplierMatchMethod | null;
  /** Name of the matched supplier for logging purposes */
  matchedSupplierName: string | null;
}

async function resolveEmailRoutingContext(
  from: string | undefined,
  subject: string | undefined,
  textBody: string | undefined,
): Promise<EmailRoutingContext> {
  const [suppliers, allShipments] = await Promise.all([
    db
      .select({ id: suppliersTable.id, name: suppliersTable.name, contactEmail: suppliersTable.contactEmail })
      .from(suppliersTable),
    db
      .select({
        id: shipmentsTable.id,
        poNumber: shipmentsTable.poNumber,
        product: shipmentsTable.product,
        customerName: shipmentsTable.customerName,
        supplierId: shipmentsTable.supplierId,
      })
      .from(shipmentsTable),
  ]);

  // ── 1. Resolve outer sender (the forwarder) ─────────────────────────────────
  let outerSenderType: PartyType = "unknown";
  let resolvedCustomerName: string | null = null;
  let supplierId: number | null = null;
  let supplierMatchedBy: SupplierMatchMethod | null = null;
  let matchedSupplierName: string | null = null;

  if (from) {
    const outerMatch = matchEmailToSupplier(from, suppliers);
    if (outerMatch) {
      outerSenderType = "supplier";
      supplierId = outerMatch.supplier.id;
      supplierMatchedBy = outerMatch.matchedBy;
      matchedSupplierName = outerMatch.supplier.name;
    } else {
      const matchedCustomer = matchEmailToBuyer(from, allShipments);
      if (matchedCustomer) {
        outerSenderType = "buyer";
        resolvedCustomerName = matchedCustomer;
      }
    }
  }

  // ── 2. Extract and resolve the forwarded-from sender ───────────────────────
  const forwardedFromEmail = textBody ? extractForwardedFrom(textBody) : null;
  const isForwarded = forwardedFromEmail !== null;
  let innerSenderType: PartyType = "unknown";

  if (forwardedFromEmail) {
    const innerMatch = matchEmailToSupplier(forwardedFromEmail, suppliers);
    if (innerMatch) {
      innerSenderType = "supplier";
      // If we didn't get a supplier from the outer sender, derive it from the inner
      if (supplierId === null) {
        supplierId = innerMatch.supplier.id;
        supplierMatchedBy = innerMatch.matchedBy;
        matchedSupplierName = innerMatch.supplier.name;
      }
    } else {
      const matchedInnerCustomer = matchEmailToBuyer(forwardedFromEmail, allShipments);
      if (matchedInnerCustomer) {
        innerSenderType = "buyer";
        if (resolvedCustomerName === null) resolvedCustomerName = matchedInnerCustomer;
      }
    }
  }

  // ── 3. Determine resolvability before any auto-linking ──────────────────────
  const unresolvable = outerSenderType === "unknown" && innerSenderType === "unknown";

  // ── 4. Account-scoped shipment candidates + reference scanning ───────────────
  // IMPORTANT: when sender is unresolvable, skip PO scanning entirely AND record
  // null as routingShipmentIds so the extraction pipeline also receives an empty
  // candidate list and cannot auto-link to any shipment.
  let preMatchedShipmentId: number | null = null;
  let routingShipmentIds: number[] | null = null; // null = unresolvable

  if (!unresolvable) {
    // Scope candidates to the resolved account to avoid cross-account links
    let candidateShipments: ShipmentRecord[] = allShipments;
    if (resolvedCustomerName) {
      candidateShipments = allShipments.filter(
        (s) => s.customerName.toLowerCase() === resolvedCustomerName!.toLowerCase(),
      );
    } else if (supplierId !== null) {
      candidateShipments = allShipments.filter((s) => s.supplierId === supplierId);
    }

    // Record the scoped ids — extraction is restricted to this set
    routingShipmentIds = candidateShipments.map((s) => s.id);

    preMatchedShipmentId = scanForShipmentMatch(
      subject ?? "",
      textBody ?? "",
      candidateShipments,
    );
  }

  return {
    supplierId,
    preMatchedShipmentId,
    routingShipmentIds,
    forwardedFromEmail,
    isForwarded,
    outerSenderType,
    innerSenderType,
    unresolvable,
    resolvedCustomerName,
    supplierMatchedBy,
    matchedSupplierName,
  };
}

// ─── Core ingestion ───────────────────────────────────────────────────────────

async function ingestDocumentFromBase64({
  fileName,
  mimeType,
  base64Content,
  sourceChannel,
  supplierId,
  preMatchedShipmentId,
  routingShipmentIds,
}: {
  fileName: string;
  mimeType: string;
  base64Content: string;
  sourceChannel: string;
  supplierId?: number | null;
  preMatchedShipmentId?: number | null;
  /**
   * Account-scoped shipment ids the extraction pipeline may consider.
   * null  → unresolvable sender; extraction receives empty candidates;
   *          document will always land as "unmatched" regardless of AI output.
   * array → restrict matching to these ids only (cross-account boundary enforced).
   * undefined → not called from the email webhook; use all shipments (legacy path).
   */
  routingShipmentIds?: number[] | null;
}): Promise<number> {
  const fileBuffer = Buffer.from(base64Content, "base64");
  const fileType = getMimeFileType(mimeType);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      shipmentId: preMatchedShipmentId ?? null,
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
      const [allShipmentRows, corrections] = await Promise.all([
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

      // Enforce routing guardrails: scope the shipments visible to the AI.
      // - routingShipmentIds === null  → unresolvable sender; empty candidate list
      // - routingShipmentIds is array  → restrict to account-scoped shipments
      // - routingShipmentIds === undefined → legacy / direct-upload path; no restriction
      const idSet = routingShipmentIds === undefined
        ? null
        : routingShipmentIds === null
          ? new Set<number>() // empty — AI cannot match any shipment
          : new Set(routingShipmentIds);

      const extractionShipments = idSet === null
        ? allShipmentRows.map((r) => ({ ...r.shipment, supplierName: r.supplierName }))
        : allShipmentRows
            .filter((r) => idSet.has(r.shipment.id))
            .map((r) => ({ ...r.shipment, supplierName: r.supplierName }));

      const result = await runExtraction({
        doc,
        fileBuffer,
        shipments: extractionShipments,
        corrections,
        supplierId: supplierId ?? undefined,
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

      // For unresolvable senders (routingShipmentIds === null), never auto-link
      // regardless of what the AI returned — document stays in the unlinked queue.
      const allowAiMatch = routingShipmentIds !== null;
      const resolvedShipmentId = allowAiMatch
        ? (result.matchedShipmentId ?? preMatchedShipmentId ?? null)
        : null;
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

// ─── Email webhook route ──────────────────────────────────────────────────────

router.post("/webhooks/email", async (req, res) => {
  const parsed = InboundEmailWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const { From, Subject, TextBody, Attachments } = parsed.data;

  // Resolve routing context before processing any attachments
  const ctx = await resolveEmailRoutingContext(From, Subject, TextBody);

  if (ctx.unresolvable) {
    req.log.warn(
      { from: From, subject: Subject },
      "email-webhook: unresolvable sender — no matching supplier or customer; documents will land in unlinked queue",
    );
  } else {
    req.log.info(
      {
        from: From,
        outerSenderType: ctx.outerSenderType,
        forwardedFrom: ctx.forwardedFromEmail,
        innerSenderType: ctx.innerSenderType,
        supplierId: ctx.supplierId,
        supplierMatchedBy: ctx.supplierMatchedBy,
        resolvedCustomer: ctx.resolvedCustomerName,
        preMatchedShipmentId: ctx.preMatchedShipmentId,
      },
      "email-webhook: routing context resolved",
    );

    if (ctx.supplierMatchedBy === "fuzzy-name") {
      req.log.warn(
        {
          from: From,
          supplierId: ctx.supplierId,
          supplierName: ctx.matchedSupplierName,
        },
        "email-webhook: supplier matched via fuzzy name heuristic — consider setting contactEmail on this supplier to make routing deterministic",
      );
    }
  }

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
      // Distinguish forwarded emails from direct uploads; photos use the same path
      sourceChannel: "email-forward",
      supplierId: ctx.supplierId,
      preMatchedShipmentId: ctx.preMatchedShipmentId,
      // Enforce account boundary in extraction — null = unresolvable, array = scoped
      routingShipmentIds: ctx.routingShipmentIds,
    });
    documentIds.push(docId);
  }

  res.json({ accepted: true, documentIds });
});

export default router;
