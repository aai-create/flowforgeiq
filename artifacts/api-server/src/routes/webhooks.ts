import { Router, type IRouter } from "express";
import {
  db,
  documentsTable,
  extractionsTable,
  shipmentsTable,
  suppliersTable,
  extractionCorrectionsTable,
  messagesTable,
  buyerEmailsTable,
  teamUsersTable,
} from "@workspace/db";
import { InboundEmailWebhookBody } from "@workspace/api-zod";
import { and, asc, eq, or, isNull } from "drizzle-orm";
import { runExtraction, extractFromChatText } from "../lib/extraction";
import { normaliseChat } from "../lib/chatNormalise";
import { detectChatForward, CHAT_ROUTING_THRESHOLD } from "../lib/chatDetect";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const ROUTING_NEEDS_REVIEW_THRESHOLD = 0.65;

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

function domainToken(email: string): string {
  const domain = (email.split("@")[1] ?? "").toLowerCase();
  const parts = domain.split(".");
  const keepParts = parts.length > 2 ? parts.slice(0, parts.length - 2) : parts.slice(0, 1);
  return normaliseName(keepParts.join("-"));
}

function tokenOverlaps(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// ─── Forwarded-email parsing ───────────────────────────────────────────────────

function extractForwardedFrom(textBody: string): string | null {
  if (!textBody) return null;

  const EMAIL_RE = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/;

  const sectionMatch = textBody.match(
    /(?:---------- Forwarded message ---------|-{3,}\s*Original Message\s*-{3,}|Begin forwarded message)/i,
  );
  const searchText = sectionMatch ? textBody.slice(sectionMatch.index!) : textBody;

  const fromLine = searchText.match(
    /^(?:From|De|Von):\s+(?:[^<\n]+<)?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/im,
  );
  if (fromLine?.[1]) return fromLine[1].toLowerCase();

  if (sectionMatch) {
    const m = searchText.match(EMAIL_RE);
    if (m?.[1]) return m[1].toLowerCase();
  }

  return null;
}

// ─── Party type resolution ─────────────────────────────────────────────────────

type PartyType = "supplier" | "buyer" | "unknown";
type SupplierMatchMethod = "exact-email" | "exact-domain" | "fuzzy-name";
type MatchMethod = SupplierMatchMethod | "buyer-learned" | "ai-inferred" | "unresolvable";

interface SupplierRecord { id: number; name: string; contactEmail: string | null }
interface ShipmentRecord { id: number; poNumber: string; product: string; customerName: string; supplierId: number; exFactoryDate: Date; dueDate: Date; }

interface SupplierMatch {
  supplier: SupplierRecord;
  matchedBy: SupplierMatchMethod;
}

function matchEmailToSupplier(email: string, suppliers: SupplierRecord[]): SupplierMatch | null {
  const senderEmail = email.toLowerCase();
  const senderDomain = (senderEmail.split("@")[1] ?? "").toLowerCase();

  for (const s of suppliers) {
    if (s.contactEmail && s.contactEmail.toLowerCase() === senderEmail) {
      return { supplier: s, matchedBy: "exact-email" };
    }
  }

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

  const token = domainToken(email);
  if (!token || token.length < 3) return null;
  for (const s of suppliers) {
    if (tokenOverlaps(token, normaliseName(s.name))) {
      return { supplier: s, matchedBy: "fuzzy-name" };
    }
  }

  return null;
}

function matchEmailToBuyer(email: string, shipments: ShipmentRecord[]): string | null {
  const token = domainToken(email);
  if (!token || token.length < 3) return null;
  const names = [...new Set(shipments.map((s) => s.customerName))];
  for (const name of names) {
    if (tokenOverlaps(token, normaliseName(name))) return name;
  }
  return null;
}

function matchEmailToLearnedBuyer(
  email: string,
  buyerEmails: { senderEmail: string; buyerName: string; confirmed: boolean }[],
): { buyerName: string; confirmed: boolean } | null {
  const lower = email.toLowerCase();
  const exact = buyerEmails.find(b => b.senderEmail === lower);
  if (exact) return { buyerName: exact.buyerName, confirmed: exact.confirmed };
  return null;
}

// ─── PO / shipment reference scanning ─────────────────────────────────────────

function scanForShipmentMatch(
  subject: string,
  body: string,
  candidates: ShipmentRecord[],
): number | null {
  const raw = `${subject} ${body}`.toLowerCase();
  const stripped = raw.replace(/[^a-z0-9]/g, "");

  const hits = candidates.filter((s) => {
    const po = s.poNumber.toLowerCase();
    if (raw.includes(po)) return true;
    const poAlpha = po.replace(/[^a-z0-9]/g, "");
    if (poAlpha.length >= 4 && stripped.includes(poAlpha)) return true;

    const product = s.product.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (product.length >= 6 && raw.includes(product)) return true;

    const productAlpha = product.replace(/\s+/g, "");
    if (productAlpha.length >= 6 && stripped.includes(productAlpha)) return true;

    return false;
  });

  return hits.length === 1 ? hits[0].id : null;
}

// ─── AI shipment inference ────────────────────────────────────────────────────

interface AiRoutingGuess {
  buyerName: string | null;
  shipmentId: number | null;
  confidence: number;
  reasoning: string;
}

async function inferShipmentWithAI(
  subject: string,
  body: string,
  senderEmail: string,
  candidates: ShipmentRecord[],
): Promise<AiRoutingGuess | null> {
  if (!candidates.length) return null;

  const today = new Date("2026-05-18");
  const shipmentSummaries = candidates
    .slice(0, 40)
    .map(s => {
      const daysToEx = Math.round((new Date(s.exFactoryDate).getTime() - today.getTime()) / 86_400_000);
      return `ID:${s.id} PO:${s.poNumber} Product:"${s.product}" Customer:"${s.customerName}" ExFactory:${daysToEx}d`;
    })
    .join("\n");

  const prompt = `You are a supply-chain email router. Match the inbound email to the most likely shipment.

Active shipments:
${shipmentSummaries}

Inbound email:
Sender: ${senderEmail}
Subject: ${subject || "(no subject)"}
Body:
${body?.slice(0, 1500) || "(empty)"}

Reply with JSON only (no markdown):
{
  "shipmentId": <integer id or null if no confident match>,
  "buyerName": "<customer name from shipment or null>",
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence>"
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 200,
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(clean) as AiRoutingGuess;

    if (typeof parsed.shipmentId !== "number" && parsed.shipmentId !== null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ─── AI reply drafting ────────────────────────────────────────────────────────

async function draftReplyWithAI(
  emailBody: string,
  subject: string,
  shipment: ShipmentRecord | null,
): Promise<string> {
  const shipmentCtx = shipment
    ? `Shipment context: PO ${shipment.poNumber}, Product: "${shipment.product}", Customer: ${shipment.customerName}.`
    : "No shipment context available.";

  const prompt = `You are an AI supply-chain trade assistant. Draft a professional, concise reply to this inbound email.

${shipmentCtx}

Inbound email:
Subject: ${subject || "(no subject)"}
Body:
${emailBody?.slice(0, 2000) || "(empty)"}

Write only the reply body — no greeting line needed, just the content. Keep it under 120 words.`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });
    return resp.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

// ─── Structured field extraction from email body ──────────────────────────────

async function extractFieldsFromEmail(
  body: string,
  subject: string,
  shipmentId: number,
  messageId: number,
): Promise<void> {
  const prompt = `Extract shipment-relevant fields from this email body. Return JSON only.

Email:
Subject: ${subject || "(no subject)"}
Body:
${body?.slice(0, 2000)}

Extract these fields if clearly mentioned (leave null otherwise):
{
  "exFactoryDate": "<ISO date or null>",
  "quantity": <integer or null>,
  "delayDays": <integer or null>,
  "newStatus": "<on-track|at-risk|delayed or null>",
  "confidence": <0.0-1.0>
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 200,
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(clean) as {
      exFactoryDate?: string | null;
      quantity?: number | null;
      delayDays?: number | null;
      newStatus?: string | null;
      confidence?: number;
    };

    const conf = parsed.confidence ?? 0;

    if (conf >= 0.85) {
      const patch: Record<string, unknown> = {};
      if (parsed.newStatus && ["on-track", "at-risk", "delayed"].includes(parsed.newStatus)) {
        patch.status = parsed.newStatus;
      }
      if (parsed.exFactoryDate) {
        const d = new Date(parsed.exFactoryDate);
        if (!isNaN(d.getTime())) patch.exFactoryDate = d;
      }
      if (parsed.quantity && parsed.quantity > 0) {
        patch.quantity = parsed.quantity;
      }
      if (Object.keys(patch).length > 0) {
        await db.update(shipmentsTable).set(patch).where(eq(shipmentsTable.id, shipmentId));
      }
    } else if (conf >= 0.45) {
      await db.update(messagesTable).set({
        pendingExtractionFields: {
          exFactoryDate: parsed.exFactoryDate ?? null,
          quantity: parsed.quantity ?? null,
          delayDays: parsed.delayDays ?? null,
          newStatus: parsed.newStatus ?? null,
          confidence: conf,
        },
      }).where(eq(messagesTable.id, messageId));
    }
  } catch {
    // field extraction is best-effort; never throw
  }
}

// ─── Email routing context ────────────────────────────────────────────────────

interface EmailRoutingContext {
  supplierId: number | null;
  preMatchedShipmentId: number | null;
  routingShipmentIds: number[] | null;
  forwardedFromEmail: string | null;
  isForwarded: boolean;
  outerSenderType: PartyType;
  innerSenderType: PartyType;
  unresolvable: boolean;
  resolvedCustomerName: string | null;
  supplierMatchedBy: SupplierMatchMethod | null;
  matchedSupplierName: string | null;
  confidence: number;
  matchMethod: MatchMethod;
  effectiveSenderEmail: string;
  candidateShipments: ShipmentRecord[];
  /** The Clerk user ID this email was scoped to via plus-token, carried through for attribution */
  scopedClerkUserId: string | null;
}

async function resolveEmailRoutingContext(
  from: string | undefined,
  subject: string | undefined,
  textBody: string | undefined,
  scopedClerkUserId: string | null = null,
  orgId: number = 1,
): Promise<EmailRoutingContext> {
  // buyer_emails are scoped to the resolved user when a plus-token is present:
  // entries with clerkUserId = scopedClerkUserId (personal) OR clerkUserId IS NULL (workspace-global).
  // When no token was resolved (scopedClerkUserId = null), only workspace-global entries are used.
  // Shipments and suppliers are all scoped to the resolved orgId.
  const buyerEmailsQuery = db
    .select({ senderEmail: buyerEmailsTable.senderEmail, buyerName: buyerEmailsTable.buyerName, confirmed: buyerEmailsTable.confirmed })
    .from(buyerEmailsTable)
    .where(
      and(
        eq(buyerEmailsTable.orgId, orgId),
        scopedClerkUserId !== null
          ? or(eq(buyerEmailsTable.clerkUserId, scopedClerkUserId), isNull(buyerEmailsTable.clerkUserId))
          : isNull(buyerEmailsTable.clerkUserId),
      ),
    );

  const [suppliers, allShipments, allBuyerEmails] = await Promise.all([
    db
      .select({ id: suppliersTable.id, name: suppliersTable.name, contactEmail: suppliersTable.contactEmail })
      .from(suppliersTable)
      .where(eq(suppliersTable.orgId, orgId)),
    db
      .select({
        id: shipmentsTable.id,
        poNumber: shipmentsTable.poNumber,
        product: shipmentsTable.product,
        customerName: shipmentsTable.customerName,
        supplierId: shipmentsTable.supplierId,
        exFactoryDate: shipmentsTable.exFactoryDate,
        dueDate: shipmentsTable.dueDate,
      })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.orgId, orgId)),
    buyerEmailsQuery,
  ]);

  let outerSenderType: PartyType = "unknown";
  let resolvedCustomerName: string | null = null;
  let supplierId: number | null = null;
  let supplierMatchedBy: SupplierMatchMethod | null = null;
  let matchedSupplierName: string | null = null;
  let confidence = 0;
  let matchMethod: MatchMethod = "unresolvable";

  const fromEmail = (from ?? "").toLowerCase();

  if (from) {
    // 1. Check learned buyer email mappings first
    const learnedBuyer = matchEmailToLearnedBuyer(fromEmail, allBuyerEmails);
    if (learnedBuyer) {
      outerSenderType = "buyer";
      resolvedCustomerName = learnedBuyer.buyerName;
      confidence = learnedBuyer.confirmed ? 0.92 : 0.70;
      matchMethod = "buyer-learned";
    } else {
      const outerMatch = matchEmailToSupplier(from, suppliers);
      if (outerMatch) {
        outerSenderType = "supplier";
        supplierId = outerMatch.supplier.id;
        supplierMatchedBy = outerMatch.matchedBy;
        matchedSupplierName = outerMatch.supplier.name;
        confidence =
          outerMatch.matchedBy === "exact-email" ? 1.0 :
          outerMatch.matchedBy === "exact-domain" ? 0.90 :
          0.72;
        matchMethod = outerMatch.matchedBy;
      } else {
        const matchedCustomer = matchEmailToBuyer(from, allShipments);
        if (matchedCustomer) {
          outerSenderType = "buyer";
          resolvedCustomerName = matchedCustomer;
          confidence = 0.68;
          matchMethod = "fuzzy-name";
        }
      }
    }
  }

  // 2. Extract and resolve the forwarded-from sender
  const forwardedFromEmail = textBody ? extractForwardedFrom(textBody) : null;
  const isForwarded = forwardedFromEmail !== null;
  let innerSenderType: PartyType = "unknown";

  if (forwardedFromEmail) {
    const innerLearnedBuyer = matchEmailToLearnedBuyer(forwardedFromEmail, allBuyerEmails);
    if (innerLearnedBuyer && resolvedCustomerName === null) {
      innerSenderType = "buyer";
      resolvedCustomerName = innerLearnedBuyer.buyerName;
      if (confidence < (innerLearnedBuyer.confirmed ? 0.92 : 0.70)) {
        confidence = innerLearnedBuyer.confirmed ? 0.92 : 0.70;
        matchMethod = "buyer-learned";
      }
    } else {
      const innerMatch = matchEmailToSupplier(forwardedFromEmail, suppliers);
      if (innerMatch) {
        innerSenderType = "supplier";
        if (supplierId === null) {
          supplierId = innerMatch.supplier.id;
          supplierMatchedBy = innerMatch.matchedBy;
          matchedSupplierName = innerMatch.supplier.name;
          const innerConf =
            innerMatch.matchedBy === "exact-email" ? 1.0 :
            innerMatch.matchedBy === "exact-domain" ? 0.90 :
            0.72;
          if (innerConf > confidence) {
            confidence = innerConf;
            matchMethod = innerMatch.matchedBy;
          }
        }
      } else {
        const matchedInnerCustomer = matchEmailToBuyer(forwardedFromEmail, allShipments);
        if (matchedInnerCustomer) {
          innerSenderType = "buyer";
          if (resolvedCustomerName === null) {
            resolvedCustomerName = matchedInnerCustomer;
            if (confidence < 0.68) { confidence = 0.68; matchMethod = "fuzzy-name"; }
          }
        }
      }
    }
  }

  const unresolvable = outerSenderType === "unknown" && innerSenderType === "unknown";
  if (unresolvable) {
    confidence = 0;
    matchMethod = "unresolvable";
  }

  // 3. Account-scoped shipment candidates + reference scanning
  let preMatchedShipmentId: number | null = null;
  let routingShipmentIds: number[] | null = null;
  let candidateShipments: ShipmentRecord[] = [];

  if (!unresolvable) {
    let candidates: ShipmentRecord[] = allShipments;
    if (resolvedCustomerName) {
      candidates = allShipments.filter(
        (s) => s.customerName.toLowerCase() === resolvedCustomerName!.toLowerCase(),
      );
    } else if (supplierId !== null) {
      candidates = allShipments.filter((s) => s.supplierId === supplierId);
    }

    candidateShipments = candidates;
    routingShipmentIds = candidates.map((s) => s.id);

    preMatchedShipmentId = scanForShipmentMatch(
      subject ?? "",
      textBody ?? "",
      candidates,
    );

    if (preMatchedShipmentId) {
      confidence = Math.max(confidence, 0.88);
    }
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
    confidence,
    matchMethod,
    effectiveSenderEmail: fromEmail,
    candidateShipments,
    scopedClerkUserId,
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
  orgId = 1,
}: {
  fileName: string;
  mimeType: string;
  base64Content: string;
  sourceChannel: string;
  supplierId?: number | null;
  preMatchedShipmentId?: number | null;
  routingShipmentIds?: number[] | null;
  orgId?: number;
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
      orgId,
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
      orgId,
    })
    .returning();

  setImmediate(async () => {
    try {
      const [allShipmentRows, corrections] = await Promise.all([
        db
          .select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
          .from(shipmentsTable)
          .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
          .where(eq(shipmentsTable.orgId, orgId))
          .orderBy(asc(shipmentsTable.id)),
        db
          .select()
          .from(extractionCorrectionsTable)
          .where(eq(extractionCorrectionsTable.orgId, orgId))
          .orderBy(asc(extractionCorrectionsTable.createdAt)),
      ]);

      const idSet = routingShipmentIds === undefined
        ? null
        : routingShipmentIds === null
          ? new Set<number>()
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

  const { From, Subject, TextBody, Attachments, To, OriginalRecipient } = parsed.data;

  // ── Per-user routing via plus-token in the To/OriginalRecipient header ───────
  const toAddress = OriginalRecipient ?? To ?? "";
  const plusTokenMatch = toAddress.match(/\+([^@+]+)@/);
  const plusToken = plusTokenMatch?.[1] ?? null;

  let scopedClerkUserId: string | null = null;
  let scopedOrgId = 1;
  if (plusToken) {
    // Try clean handle first, fall back to legacy hex token
    let tokenRow = await db
      .select({ clerkUserId: teamUsersTable.clerkUserId, orgId: teamUsersTable.orgId })
      .from(teamUsersTable)
      .where(eq(teamUsersTable.inboundHandle, plusToken))
      .then(r => r[0] ?? null);
    if (!tokenRow) {
      tokenRow = await db
        .select({ clerkUserId: teamUsersTable.clerkUserId, orgId: teamUsersTable.orgId })
        .from(teamUsersTable)
        .where(eq(teamUsersTable.inboundToken, plusToken))
        .then(r => r[0] ?? null);
    }
    scopedClerkUserId = tokenRow?.clerkUserId ?? null;
    scopedOrgId = tokenRow?.orgId ?? 1;
  }

  // Emails with no plus-token route to unscoped needs-review immediately
  if (!plusToken) {
    req.log.info({ to: toAddress }, "email-webhook: no plus-token, routing to unscoped needs-review");
    const rawBody = TextBody ?? "";
    const snippet = rawBody.replace(/\s+/g, " ").trim().slice(0, 200);
    await db.insert(messagesTable).values({
      shipmentId: null,
      supplierId: null,
      sender: From ?? "Unknown Sender",
      channel: "gmail",
      subject: Subject ?? null,
      direction: "inbound",
      snippet: snippet || "(empty email)",
      fullBody: rawBody,
      aiDraft: "",
      aiAction: "",
      aiTags: [],
      unread: true,
      isFlagged: false,
      routingStatus: "needs-review",
      routingConfidence: 0,
      matchMethod: "unresolvable",
      rawSenderEmail: From ?? null,
      aiRoutingGuess: null,
      receivedAt: new Date(),
      routedToClerkUserId: null,
      orgId: scopedOrgId,
    });
    res.json({ accepted: true, documentIds: [] });
    return;
  }

  // If the plus-token was present but doesn't match any user, treat as unscoped needs-review
  if (!scopedClerkUserId) {
    req.log.warn({ plusToken, to: toAddress }, "email-webhook: plus-token unresolved, routing to unscoped needs-review");
    const rawBody = TextBody ?? "";
    const snippet = rawBody.replace(/\s+/g, " ").trim().slice(0, 200);
    await db.insert(messagesTable).values({
      shipmentId: null,
      supplierId: null,
      sender: From ?? "Unknown Sender",
      channel: "gmail",
      subject: Subject ?? null,
      direction: "inbound",
      snippet: snippet || "(empty email)",
      fullBody: rawBody,
      aiDraft: "",
      aiAction: "",
      aiTags: [],
      unread: true,
      isFlagged: false,
      routingStatus: "needs-review",
      routingConfidence: 0,
      matchMethod: "unresolvable",
      rawSenderEmail: From ?? null,
      aiRoutingGuess: null,
      receivedAt: new Date(),
      routedToClerkUserId: null,
      orgId: scopedOrgId,
    });
    res.json({ accepted: true, documentIds: [] });
    return;
  }

  req.log.info({ plusToken, scopedClerkUserId }, "email-webhook: plus-token resolved to user");

  // ── Chat-forward detection: handle before normal email routing ──────────────
  const chatDetection = detectChatForward(Subject, TextBody);
  if (chatDetection.isChat && chatDetection.chatBody && chatDetection.channel) {
    try {
      const normalised = normaliseChat(chatDetection.chatBody, chatDetection.channel, undefined);
      const shipmentRows = await db
        .select({
          id: shipmentsTable.id,
          poNumber: shipmentsTable.poNumber,
          product: shipmentsTable.product,
          customerName: shipmentsTable.customerName,
          supplierName: suppliersTable.name,
          status: shipmentsTable.status,
          currentStageId: shipmentsTable.currentStageId,
        })
        .from(shipmentsTable)
        .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
        .where(eq(shipmentsTable.orgId, scopedOrgId));

      const extracted = await extractFromChatText(normalised.fullText, shipmentRows, normalised.primarySender);
      const routingStatus = extracted.confidence >= CHAT_ROUTING_THRESHOLD && extracted.shipmentId != null ? "routed" : "needs-review";
      const snippet = normalised.fullText.replace(/\s+/g, " ").trim().slice(0, 200);

      await db.insert(messagesTable).values({
        shipmentId: routingStatus === "routed" ? (extracted.shipmentId ?? null) : null,
        supplierId: null,
        sender: normalised.primarySender,
        recipient: toAddress || null,
        channel: chatDetection.channel,
        direction: "inbound",
        snippet: snippet || "(empty chat)",
        fullBody: chatDetection.chatBody,
        rawChatText: chatDetection.chatBody,
        aiDraft: extracted.aiDraft,
        aiAction: extracted.aiAction,
        aiTags: extracted.aiTags,
        unread: true,
        isFlagged: false,
        routingStatus,
        routingConfidence: extracted.confidence,
        matchMethod: extracted.matchMethod,
        rawSenderEmail: From ?? null,
        receivedAt: new Date(),
        routedToClerkUserId: scopedClerkUserId,
        orgId: scopedOrgId,
      });

      req.log.info({ channel: chatDetection.channel, confidence: extracted.confidence, routingStatus, scopedClerkUserId }, "email-webhook: chat forward ingested");
      res.json({ accepted: true, documentIds: [] });
      return;
    } catch (err) {
      req.log.error({ err }, "email-webhook: chat forward processing failed, falling through to normal handling");
    }
  }

  const ctx = await resolveEmailRoutingContext(From, Subject, TextBody, scopedClerkUserId, scopedOrgId);

  let finalShipmentId = ctx.preMatchedShipmentId;
  let finalConfidence = ctx.confidence;
  let finalMatchMethod = ctx.matchMethod;
  let aiGuess: { buyerName: string | null; shipmentId: number | null; confidence: number; reasoning: string } | null = null;

  // AI inference: run when confidence is below threshold OR when sender is known but no specific
  // shipment was resolved via reference scan (multiple candidates — need AI to pick one).
  const needsAiInference = !ctx.unresolvable && ctx.candidateShipments.length > 0 &&
    (finalConfidence < ROUTING_NEEDS_REVIEW_THRESHOLD || finalShipmentId === null);
  if (needsAiInference) {
    try {
      const guess = await inferShipmentWithAI(
        Subject ?? "",
        TextBody ?? "",
        ctx.effectiveSenderEmail,
        ctx.candidateShipments,
      );
      if (guess) {
        aiGuess = guess;
        if (guess.shipmentId && guess.confidence >= 0.75) {
          finalShipmentId = guess.shipmentId;
          finalConfidence = Math.max(finalConfidence, guess.confidence * 0.9);
          finalMatchMethod = "ai-inferred";
        } else if (guess.confidence > finalConfidence) {
          finalConfidence = guess.confidence * 0.8;
          finalMatchMethod = "ai-inferred";
        }
      }
    } catch {
      // AI inference is best-effort
    }
  }

  // For completely unresolvable senders, also attempt AI inference against ALL shipments
  if (ctx.unresolvable && ctx.candidateShipments.length === 0) {
    try {
      const allShipments = await db
        .select({
          id: shipmentsTable.id,
          poNumber: shipmentsTable.poNumber,
          product: shipmentsTable.product,
          customerName: shipmentsTable.customerName,
          supplierId: shipmentsTable.supplierId,
          exFactoryDate: shipmentsTable.exFactoryDate,
          dueDate: shipmentsTable.dueDate,
        })
        .from(shipmentsTable)
        .where(eq(shipmentsTable.orgId, scopedOrgId));
      const guess = await inferShipmentWithAI(
        Subject ?? "",
        TextBody ?? "",
        ctx.effectiveSenderEmail,
        allShipments,
      );
      if (guess) {
        aiGuess = guess;
        finalConfidence = guess.confidence * 0.6;
        if (guess.shipmentId && guess.confidence >= 0.8) {
          finalShipmentId = guess.shipmentId;
          finalMatchMethod = "ai-inferred";
        }
      }
    } catch {
      // best-effort
    }
  }

  // Require BOTH sufficient confidence AND a resolved shipment ID to auto-route.
  // A high-confidence sender with multiple unresolved candidates still goes to Needs Review.
  const routingStatus = (finalConfidence >= ROUTING_NEEDS_REVIEW_THRESHOLD && finalShipmentId !== null) ? "routed" : "needs-review";

  // Build a concise snippet from the email body
  const rawBody = TextBody ?? "";
  const snippet = rawBody.replace(/\s+/g, " ").trim().slice(0, 200);
  const senderLabel =
    ctx.matchedSupplierName ??
    ctx.resolvedCustomerName ??
    From ??
    "Unknown Sender";

  req.log.info(
    {
      from: From,
      finalConfidence,
      finalMatchMethod,
      routingStatus,
      finalShipmentId,
      scopedClerkUserId: ctx.scopedClerkUserId,
    },
    "email-webhook: routing resolved",
  );

  // Create the message record
  // recipient stores the plus-addressed delivery address (iq+token@flowforgeiq.com),
  // preserving which user's inbound token received this email for attribution.
  const [msg] = await db
    .insert(messagesTable)
    .values({
      shipmentId: routingStatus === "routed" ? finalShipmentId : null,
      supplierId: ctx.supplierId,
      sender: senderLabel,
      recipient: toAddress || null,
      channel: "gmail",
      subject: Subject ?? null,
      direction: "inbound",
      snippet: snippet || "(empty email)",
      fullBody: rawBody,
      aiDraft: "",
      aiAction: "",
      aiTags: [],
      unread: true,
      isFlagged: false,
      routingStatus,
      routingConfidence: finalConfidence,
      matchMethod: finalMatchMethod,
      rawSenderEmail: (ctx.forwardedFromEmail ?? ctx.effectiveSenderEmail) || null,
      aiRoutingGuess: aiGuess ?? null,
      receivedAt: new Date(),
      routedToClerkUserId: ctx.scopedClerkUserId,
      orgId: scopedOrgId,
    })
    .returning();

  // Async: AI reply draft + field extraction
  setImmediate(async () => {
    try {
      const shipment = finalShipmentId
        ? (await db.select({
            id: shipmentsTable.id,
            poNumber: shipmentsTable.poNumber,
            product: shipmentsTable.product,
            customerName: shipmentsTable.customerName,
            supplierId: shipmentsTable.supplierId,
            exFactoryDate: shipmentsTable.exFactoryDate,
            dueDate: shipmentsTable.dueDate,
          }).from(shipmentsTable).where(eq(shipmentsTable.id, finalShipmentId)))[0] ?? null
        : null;

      const [draft, aiTags] = await Promise.all([
        draftReplyWithAI(rawBody, Subject ?? "", shipment ?? null),
        buildAiTags(rawBody, Subject ?? ""),
      ]);

      const patch: Record<string, unknown> = { aiDraft: draft };
      if (aiTags.length) patch.aiTags = aiTags;
      await db.update(messagesTable).set(patch).where(eq(messagesTable.id, msg.id));

      if (finalShipmentId && routingStatus === "routed") {
        await extractFieldsFromEmail(rawBody, Subject ?? "", finalShipmentId, msg.id);
      }
    } catch {
      // best-effort
    }
  });

  // Ingest attachments
  const documentIds: number[] = [];

  if (Attachments && Attachments.length > 0) {
    for (const attachment of Attachments) {
      if (!attachment.Content) continue;
      const docId = await ingestDocumentFromBase64({
        fileName: attachment.Name,
        mimeType: attachment.ContentType,
        base64Content: attachment.Content,
        sourceChannel: "email-forward",
        supplierId: ctx.supplierId,
        preMatchedShipmentId: finalShipmentId,
        routingShipmentIds: ctx.routingShipmentIds,
        orgId: scopedOrgId,
      });
      documentIds.push(docId);
    }
  }

  res.json({ accepted: true, documentIds });
});

async function buildAiTags(body: string, subject: string): Promise<string[]> {
  const text = `${subject} ${body}`.toLowerCase();
  const tags: string[] = [];

  if (/delay|late|push|congestion|backlog|behind/i.test(text)) tags.push("risk: delay");
  if (/balance|payment|wire|deposit|due/i.test(text)) tags.push("payment");
  if (/qc|inspection|audit|sample|approved|reject/i.test(text)) tags.push("milestone: QC");
  if (/ex.?factory|shipped|dispatch|etd|eta/i.test(text)) tags.push("milestone: ex-factory");
  if (/quote|rfq|price|cost|usd|unit price/i.test(text)) tags.push("quote");

  return tags.slice(0, 3);
}

export default router;
