import { Router, type IRouter } from "express";
import { db, messagesTable, suppliersTable, buyersTable, shipmentsTable, contactRoutingRulesTable } from "@workspace/db";
import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireDeviceTokenAuth } from "../middlewares/requireDeviceTokenAuth";
import { requireAiResult, runAi } from "../lib/ai-gateway";
import {
  captureInboundEventKey,
  deterministicShipmentMatch,
  triageInboundEmail,
} from "../lib/inbound-triage";
import { makeReviewDecision, needsHumanReview } from "../lib/decision-review";

const router: IRouter = Router();

const MobileCapturePayload = z.object({
  senderRaw: z.string().min(1),
  messageText: z.string().min(1),
  channel: z.enum(["whatsapp", "wechat", "imessage", "sms", "email", "other"]),
  contactType: z.enum(["supplier", "buyer"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  capturedAt: z.string().datetime().optional(),
  appPackage: z.string().optional(),
  deviceId: z.string().optional(),
});

type MobileCapturePayload = z.infer<typeof MobileCapturePayload>;

// ─── Contact resolution ────────────────────────────────────────────────────────

type ResolvedContact = {
  resolvedContactType: "supplier" | "buyer" | null;
  resolvedContactId: number | null;
  routingStatus: "routed" | "needs_review";
  supplierId: number | null;
};

async function resolveContact(senderRaw: string, orgId: number): Promise<ResolvedContact> {
  const term = `%${senderRaw}%`;

  const [suppliers, buyers] = await Promise.all([
    db
      .select({ id: suppliersTable.id, name: suppliersTable.name, whatsAppNumber: suppliersTable.whatsAppNumber })
      .from(suppliersTable)
      .where(
        and(
          eq(suppliersTable.orgId, orgId),
          or(
            ilike(suppliersTable.name, term),
            ilike(suppliersTable.contactEmail, term),
            ilike(suppliersTable.whatsAppNumber, term),
          ),
        ),
      ),
    db
      .select({ id: buyersTable.id, name: buyersTable.name })
      .from(buyersTable)
      .where(
        and(
          eq(buyersTable.orgId, orgId),
          or(
            ilike(buyersTable.name, term),
            ilike(buyersTable.email, term),
            ilike(buyersTable.phone, term),
          ),
        ),
      ),
  ]);

  const matchedSuppliers = suppliers;
  const matchedBuyers = buyers;

  // Conflict: matches both supplier and buyer → needs_review
  if (matchedSuppliers.length > 0 && matchedBuyers.length > 0) {
    return {
      resolvedContactType: null,
      resolvedContactId: null,
      routingStatus: "needs_review",
      supplierId: null,
    };
  }

  if (matchedSuppliers.length === 1) {
    return {
      resolvedContactType: "supplier",
      resolvedContactId: matchedSuppliers[0]!.id,
      routingStatus: "routed",
      supplierId: matchedSuppliers[0]!.id,
    };
  }

  if (matchedSuppliers.length > 1) {
    return {
      resolvedContactType: "supplier",
      resolvedContactId: null,
      routingStatus: "needs_review",
      supplierId: null,
    };
  }

  if (matchedBuyers.length === 1) {
    return {
      resolvedContactType: "buyer",
      resolvedContactId: matchedBuyers[0]!.id,
      routingStatus: "needs_review",
      supplierId: null,
    };
  }

  // No match
  return {
    resolvedContactType: null,
    resolvedContactId: null,
    routingStatus: "needs_review",
    supplierId: null,
  };
}

// ─── Contact routing rule lookup ──────────────────────────────────────────────

type RuleMatch = {
  shipmentId: number;
  ruleId: number;
} | null;

async function lookupContactRoutingRule(
  channel: string,
  senderRaw: string,
  orgId: number,
): Promise<RuleMatch> {
  const normalised = senderRaw.trim();
  if (!normalised) return null;

  const [rule] = await db
    .select({ id: contactRoutingRulesTable.id, shipmentId: contactRoutingRulesTable.shipmentId })
    .from(contactRoutingRulesTable)
    .where(
      and(
        eq(contactRoutingRulesTable.orgId, orgId),
        eq(contactRoutingRulesTable.channel, channel),
        eq(contactRoutingRulesTable.senderId, normalised),
        eq(contactRoutingRulesTable.active, true),
      ),
    )
    .limit(1);

  if (!rule) return null;

  // Defence-in-depth: verify the shipment still belongs to this org
  const [guardRow] = await db
    .select({ id: shipmentsTable.id })
    .from(shipmentsTable)
    .where(and(eq(shipmentsTable.id, rule.shipmentId), eq(shipmentsTable.orgId, orgId)))
    .limit(1);

  if (!guardRow) {
    // Shipment no longer in org — deactivate the rule
    await db
      .update(contactRoutingRulesTable)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(contactRoutingRulesTable.id, rule.id));
    return null;
  }

  return { shipmentId: rule.shipmentId, ruleId: rule.id };
}

// ─── Async AI enrichment ───────────────────────────────────────────────────────

async function enrichMessageWithAI(
  messageId: number,
  orgId: number,
  senderRaw: string,
  messageText: string,
  supplierId: number | null,
  correlationId?: string,
): Promise<void> {
  try {
    const shipments = await db
      .select({
        id: shipmentsTable.id,
        poNumber: shipmentsTable.poNumber,
        product: shipmentsTable.product,
        customerName: shipmentsTable.customerName,
        supplierId: shipmentsTable.supplierId,
      })
      .from(shipmentsTable)
      .where(
        and(
          eq(shipmentsTable.orgId, orgId),
          ...(supplierId ? [eq(shipmentsTable.supplierId, supplierId)] : []),
        ),
      )
      .limit(40);

    const shipmentSummaries = shipments
      .map(s => `ID:${s.id} PO:${s.poNumber} Product:"${s.product}" Customer:"${s.customerName}"`)
      .join("\n");

    const prompt = `You are a supply-chain message analyst. Analyze this mobile-captured message and extract structured info.

Sender: ${senderRaw}
Message:
${messageText.slice(0, 1500)}

${shipmentSummaries ? `Active shipments:\n${shipmentSummaries}\n` : ""}

Reply with JSON only (no markdown):
{
  "intent": "<one of: order-update, payment-request, delay-notice, quality-issue, general-inquiry, other>",
  "extractedDates": ["<ISO date strings>"],
  "extractedAmounts": [<numbers in USD>],
  "shipmentId": <matched integer id or null>,
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence>"
}`;

    const parsed = requireAiResult(await runAi<{
      intent?: string;
      extractedDates?: string[];
      extractedAmounts?: number[];
      shipmentId?: number | null;
      confidence?: number;
      reasoning?: string;
    }>({
      metadata: {
        orgId,
        workflow: "mobile_capture",
        event: "message_enrichment",
        conversationId: String(messageId),
        ...(correlationId ? { correlationId } : {}),
      },
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      maxCompletionTokens: 300,
      responseFormat: { type: "json_object" },
      output: "json",
    }));

    const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence! : 0;
    const resolvedShipmentId =
      parsed.shipmentId != null &&
      shipments.some(s => s.id === parsed.shipmentId)
        ? parsed.shipmentId
        : null;

    const patch: Record<string, unknown> = {
      aiTags: [parsed.intent ?? "other"],
      pendingExtractionFields: {
        intent: parsed.intent ?? null,
        extractedDates: parsed.extractedDates ?? [],
        extractedAmounts: parsed.extractedAmounts ?? [],
        confidence,
        reasoning: parsed.reasoning ?? null,
      },
      reviewDecision: makeReviewDecision(
        "extraction",
        confidence,
        parsed.reasoning ?? "AI extracted operational details from a mobile capture.",
        {
          shipmentId: resolvedShipmentId,
          intent: parsed.intent ?? null,
          extractedDates: parsed.extractedDates ?? [],
          extractedAmounts: parsed.extractedAmounts ?? [],
        },
      ),
      reviewStatus: "pending",
    };

    // Only a clear routing match can be auto-confirmed. Extracted operational
    // facts remain in the review queue regardless of model confidence.
    if (resolvedShipmentId && !needsHumanReview("routing", confidence)) {
      patch.shipmentId = resolvedShipmentId;
      patch.routingStatus = "routed";
    }

    await db
      .update(messagesTable)
      .set(patch)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.orgId, orgId)));
  } catch (err) {
    // enrichment is best-effort; log and continue
    // Note: we can't use req.log here (outside request scope), use console.warn
    console.warn("[capture/mobile] AI enrichment failed for messageId=%d: %s", messageId, String(err));
  }
}

// ─── POST /capture/mobile ──────────────────────────────────────────────────────

router.post("/capture/mobile", requireDeviceTokenAuth, async (req, res) => {
  // Normalise incoming body before validation:
  // - channel: trim whitespace + lowercase so "WhatsApp " → "whatsapp"
  // - messageText: if iOS passes an object/array, coerce to string
  const raw = req.body as Record<string, unknown>;
  const normalised = {
    ...raw,
    channel: typeof raw.channel === "string" ? raw.channel.trim().toLowerCase() : raw.channel,
    messageText:
      typeof raw.messageText === "string"
        ? raw.messageText
        : raw.messageText != null
          ? String(raw.messageText)
          : raw.messageText,
    senderRaw:
      typeof raw.senderRaw === "string"
        ? raw.senderRaw
        : raw.senderRaw != null
          ? String(raw.senderRaw)
          : raw.senderRaw,
  };

  let input: MobileCapturePayload;
  try {
    input = MobileCapturePayload.parse(normalised);
  } catch (err) {
    req.log.warn({ body: raw, err: String(err) }, "capture/mobile: invalid payload");
    res.status(400).json({ error: "Invalid payload", details: String(err) });
    return;
  }

  const orgId = req.orgId;
  const userId = req.userId!;

  // ─── Canonical fallback identity ───────────────────────────────────────────
  // Mobile providers do not supply a stable event ID. The shared key uses a
  // five-minute bucket so retried captures coalesce atomically, while a later
  // identical operational update remains a distinct message.
  const receivedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();
  const contentTriage = triageInboundEmail("", input.messageText);
  const inboundEventKey = captureInboundEventKey({
    userId,
    channel: input.channel,
    sender: input.senderRaw,
    normalizedBody: contentTriage.normalizedBody,
    receivedAt,
  });

  const recentRows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.orgId, orgId),
        eq(messagesTable.routedToClerkUserId, userId),
        eq(messagesTable.inboundEventKey, inboundEventKey),
      ),
    )
    .limit(20);

  const dupeRow = recentRows[0];

  if (dupeRow) {
    req.log.info({ messageId: dupeRow.id, senderRaw: input.senderRaw }, "capture/mobile: duplicate suppressed");
    res.status(200).json({
      status: "duplicate",
      messageId: dupeRow.id,
      routingStatus: null,
      resolvedContactId: null,
      resolvedContactType: null,
    });
    return;
  }

  // ─── Contact routing rule check (fires before contact resolution & AI) ───────
  let ruleMatch: RuleMatch = null;
  try {
    ruleMatch = await lookupContactRoutingRule(input.channel, input.senderRaw, orgId);
  } catch (err) {
    req.log.warn({ err }, "capture/mobile: contact routing rule lookup failed, continuing without rule match");
  }

  // ─── Contact resolution ───────────────────────────────────────────────────────
  let contact: ResolvedContact = { resolvedContactType: null, resolvedContactId: null, routingStatus: "needs_review", supplierId: null };
  try {
    contact = await resolveContact(input.senderRaw, orgId);
  } catch (err) {
    req.log.warn({ err }, "capture/mobile: contact resolution failed, defaulting to needs_review");
  }

  // ─── Deterministic shipment matching before AI ──────────────────────────────
  let directShipmentId: number | null = null;
  if (!ruleMatch && contact.supplierId) {
    const candidateShipments = await db
      .select({
        id: shipmentsTable.id,
        poNumber: shipmentsTable.poNumber,
        product: shipmentsTable.product,
      })
      .from(shipmentsTable)
      .where(and(eq(shipmentsTable.orgId, orgId), eq(shipmentsTable.supplierId, contact.supplierId)));
    directShipmentId = deterministicShipmentMatch("", contentTriage.normalizedBody, candidateShipments);
  }

  // ─── Insert message ─────────────────────────────────────────────────────────
  const snippet = contentTriage.normalizedBody.slice(0, 200);

  // If a routing rule matched, route directly; otherwise fall back to contact resolution
  const finalShipmentId = ruleMatch?.shipmentId ?? directShipmentId;
  const routingStatus = finalShipmentId !== null
    ? "routed"
    : ruleMatch
    ? "routed"
    : contact.routingStatus === "needs_review"
      ? "needs-review"
      : "routed";
  const matchMethod = ruleMatch ? "contact-rule" : directShipmentId !== null ? "po-reference" : null;

  let inserted: (typeof messagesTable.$inferSelect) | undefined;
  try {
    const rows = await db
      .insert(messagesTable)
      .values({
        sender: input.senderRaw,
        channel: input.channel,
        direction: "inbound",
        snippet,
        fullBody: input.messageText,
        aiDraft: "",
        aiAction: "",
        aiTags: [],
        unread: true,
        isFlagged: false,
        shipmentId: finalShipmentId,
        routingStatus,
        routingConfidence: ruleMatch ? 1.0 : null,
        matchMethod,
        supplierId: contact.supplierId,
        rawChatText: input.messageText,
        normalizedBody: contentTriage.normalizedBody,
        normalizationVersion: contentTriage.normalizationVersion,
        suppressionReason: contentTriage.suppressionReason,
        inboundEventKey,
        routedToClerkUserId: userId,
        receivedAt,
        orgId,
      })
      .onConflictDoNothing()
      .returning();
    inserted = rows[0];
  } catch (err) {
    req.log.error({ err }, "capture/mobile: db insert failed");
    res.set("Retry-After", "30");
    res.status(503).json({ error: "Service temporarily unavailable — please retry" });
    return;
  }

  if (!inserted) {
    const [existing] = await db
      .select({ id: messagesTable.id })
      .from(messagesTable)
      .where(and(eq(messagesTable.orgId, orgId), eq(messagesTable.inboundEventKey, inboundEventKey)))
      .limit(1);
    res.status(200).json({
      status: "duplicate",
      messageId: existing?.id ?? null,
      routingStatus: null,
      resolvedContactId: null,
      resolvedContactType: null,
    });
    return;
  }

  req.log.info(
    {
      messageId: inserted.id,
      senderRaw: input.senderRaw,
      channel: input.channel,
      routingStatus,
      ruleMatched: ruleMatch != null,
      shipmentId: finalShipmentId,
    },
    "capture/mobile: inserted",
  );

  // ─── Respond 201 then enrich async (skip if rule already resolved the shipment) ─
  res.status(201).json({
    status: "captured",
    messageId: inserted.id,
    routingStatus: ruleMatch ? "routed" : contact.routingStatus,
    resolvedContactId: contact.resolvedContactId,
    resolvedContactType: contact.resolvedContactType,
  });

  if (!ruleMatch && directShipmentId === null && !contentTriage.suppressionReason) {
    const requestId = req.headers["x-request-id"];
    const correlationId = typeof requestId === "string" && requestId.trim() ? requestId : undefined;
    setImmediate(() => {
      enrichMessageWithAI(
        inserted.id,
        orgId,
        input.senderRaw,
        input.messageText,
        contact.supplierId,
        correlationId,
      );
    });
  }
});

export default router;
