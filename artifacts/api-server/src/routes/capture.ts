import { Router, type IRouter } from "express";
import { db, messagesTable, suppliersTable, buyersTable, shipmentsTable } from "@workspace/db";
import { and, eq, gte, ilike, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireDeviceTokenAuth } from "../middlewares/requireDeviceTokenAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const CAPTURE_DEDUP_WINDOW_MS = 5 * 60 * 1000;

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

// ─── Async AI enrichment ───────────────────────────────────────────────────────

async function enrichMessageWithAI(
  messageId: number,
  orgId: number,
  senderRaw: string,
  messageText: string,
  supplierId: number | null,
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

    const resp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 300,
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(clean) as {
      intent?: string;
      extractedDates?: string[];
      extractedAmounts?: number[];
      shipmentId?: number | null;
      confidence?: number;
      reasoning?: string;
    };

    const HIGH_CONFIDENCE = 0.65;
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
        confidence: parsed.confidence ?? 0,
        reasoning: parsed.reasoning ?? null,
      },
    };

    if (resolvedShipmentId && (parsed.confidence ?? 0) >= HIGH_CONFIDENCE) {
      patch.shipmentId = resolvedShipmentId;
      patch.routingStatus = "auto_routed";
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
  let input: MobileCapturePayload;
  try {
    input = MobileCapturePayload.parse(req.body);
  } catch (err) {
    res.status(400).json({ error: "Invalid payload", details: String(err) });
    return;
  }

  const orgId = req.orgId;
  const userId = req.userId!;

  // ─── Deduplication: same user + sender + first-60-char prefix within 5 min ──
  const fiveMinutesAgo = new Date(Date.now() - CAPTURE_DEDUP_WINDOW_MS);
  const textPrefix = input.messageText.slice(0, 60);

  const recentRows = await db
    .select({ id: messagesTable.id, snippet: messagesTable.snippet })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.orgId, orgId),
        eq(messagesTable.routedToClerkUserId, userId),
        eq(messagesTable.sender, input.senderRaw),
        gte(messagesTable.receivedAt, fiveMinutesAgo),
      ),
    )
    .limit(20);

  const dupeRow = recentRows.find(r => r.snippet.startsWith(textPrefix));

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

  // ─── Contact resolution ───────────────────────────────────────────────────────
  const contact = await resolveContact(input.senderRaw, orgId);

  // ─── Insert message ───────────────────────────────────────────────────────────
  const receivedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();
  const snippet = input.messageText.slice(0, 200);

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
        routingStatus: contact.routingStatus === "needs_review" ? "needs-review" : "routed",
        supplierId: contact.supplierId,
        rawChatText: input.messageText,
        routedToClerkUserId: userId,
        receivedAt,
        orgId,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    req.log.error({ err }, "capture/mobile: db insert failed");
    res.set("Retry-After", "30");
    res.status(503).json({ error: "Service temporarily unavailable — please retry" });
    return;
  }

  if (!inserted) {
    res.set("Retry-After", "30");
    res.status(503).json({ error: "Service temporarily unavailable — please retry" });
    return;
  }

  req.log.info(
    { messageId: inserted.id, senderRaw: input.senderRaw, channel: input.channel, routingStatus: contact.routingStatus },
    "capture/mobile: inserted",
  );

  // ─── Respond 201 then enrich async ────────────────────────────────────────────
  res.status(201).json({
    status: "captured",
    messageId: inserted.id,
    routingStatus: contact.routingStatus,
    resolvedContactId: contact.resolvedContactId,
    resolvedContactType: contact.resolvedContactType,
  });

  setImmediate(() => {
    enrichMessageWithAI(inserted.id, orgId, input.senderRaw, input.messageText, contact.supplierId);
  });
});

export default router;
