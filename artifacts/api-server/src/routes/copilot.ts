import { Router, type IRouter } from "express";
import { db, copilotProposalsTable, autonomyPoliciesTable, shipmentsTable, messagesTable, suppliersTable, paymentsTable } from "@workspace/db";
import { asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  CreateCopilotProposalBody,
  UpdateCopilotProposalBody,
  UpsertAutonomyPolicyBody,
  ListCopilotProposalsQueryParams,
} from "@workspace/api-zod";
import { runTriggerEngine } from "../lib/copilot-trigger";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod";

const router: IRouter = Router();

// ─── Edit-distance helpers ────────────────────────────────────────────────────
function wordLevenshtein(a: string, b: string): number {
  const aW = a.trim().split(/\s+/);
  const bW = b.trim().split(/\s+/);
  const m = aW.length;
  const n = bW.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aW[i - 1] === bW[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 0 : dp[m][n] / maxLen;
}

function normalizedEditDistance(original: string, edited: string): number {
  if (!original && !edited) return 0;
  if (!original || !edited) return 1;
  if (original === edited) return 0;
  return Math.min(1, wordLevenshtein(original, edited));
}

// ─── Draft-quality helpers ────────────────────────────────────────────────────
const ACTION_TYPE_LABELS: Record<string, string> = {
  reply: "Draft Reply",
  nudge: "Follow-up Nudge",
  payment_reminder: "Payment Reminder",
  doc_request: "Doc Request",
  escalation: "Escalation",
  stage_advance: "Advance Stage",
};

function actionLabel(t: string) {
  return ACTION_TYPE_LABELS[t] ?? t;
}

// ─── List proposals ──────────────────────────────────────────────────────────
router.get("/copilot/proposals", async (req, res) => {
  const query = ListCopilotProposalsQueryParams.parse(req.query);

  let rows = await db
    .select()
    .from(copilotProposalsTable)
    .orderBy(desc(copilotProposalsTable.createdAt));

  if (query.status) rows = rows.filter(r => r.status === query.status);
  if (query.shipmentId) rows = rows.filter(r => r.shipmentId === query.shipmentId);

  res.json(rows);
});

// ─── Create proposal (manual) ─────────────────────────────────────────────────
router.post("/copilot/proposals", async (req, res) => {
  const input = CreateCopilotProposalBody.parse(req.body);
  const [inserted] = await db
    .insert(copilotProposalsTable)
    .values({
      shipmentId: input.shipmentId,
      triggerType: input.triggerType,
      triggerRef: input.triggerRef ?? null,
      actionType: input.actionType,
      payload: input.payload as Record<string, unknown>,
      reasoning: input.reasoning,
      confidence: input.confidence ?? 0.8,
      status: "pending",
      auditTrail: [{ at: new Date().toISOString(), actor: "user", action: "created" }],
    })
    .returning();
  res.status(201).json(inserted);
});

// ─── Update proposal (approve / reject / snooze / edit) ──────────────────────
router.patch("/copilot/proposals/:id", async (req, res) => {
  const id = Number(req.params.id);
  const input = UpdateCopilotProposalBody.parse(req.body);

  const [existing] = await db
    .select()
    .from(copilotProposalsTable)
    .where(eq(copilotProposalsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const auditEntry = {
    at: new Date().toISOString(),
    actor: "user",
    action: input.status ?? "edited",
  };

  const currentTrail = Array.isArray(existing.auditTrail) ? existing.auditTrail as object[] : [];

  const updateData: Partial<typeof copilotProposalsTable.$inferInsert> = {
    auditTrail: [...currentTrail, auditEntry],
  };

  if (input.status) updateData.status = input.status;
  if (input.editedPayload) {
    updateData.editedPayload = input.editedPayload as Record<string, unknown>;
    if (!input.status) updateData.status = "edited";

    // Compute edit distance between original draftBody and edited draftBody
    const origPayload = existing.payload as Record<string, unknown>;
    const editedPayload = input.editedPayload as Record<string, unknown>;
    const originalBody = typeof origPayload.draftBody === "string" ? origPayload.draftBody : "";
    const editedBody = typeof editedPayload.draftBody === "string" ? editedPayload.draftBody : "";

    if (originalBody || editedBody) {
      const dist = normalizedEditDistance(originalBody, editedBody);
      updateData.editDistance = dist;
      // Store the final user-edited text for few-shot retrieval later
      updateData.userEditedContent = editedBody || null;
    }
  }
  if (input.snoozedUntil) {
    updateData.snoozedUntil = new Date(input.snoozedUntil);
    updateData.status = "snoozed";
  }

  const [updated] = await db
    .update(copilotProposalsTable)
    .set(updateData)
    .where(eq(copilotProposalsTable.id, id))
    .returning();

  res.json(updated);
});

// ─── Trigger engine ───────────────────────────────────────────────────────────
router.post("/copilot/trigger", async (_req, res) => {
  const result = await runTriggerEngine();
  res.json(result);
});

// ─── Daily summary ────────────────────────────────────────────────────────────
router.get("/copilot/summary", async (_req, res) => {
  const allProposals = await db
    .select()
    .from(copilotProposalsTable)
    .orderBy(desc(copilotProposalsTable.createdAt));

  const pending      = allProposals.filter(p => p.status === "pending").length;
  const autoExecuted = allProposals.filter(p => p.status === "auto_executed").length;
  const snoozed      = allProposals.filter(p => p.status === "snoozed").length;
  const rejected     = allProposals.filter(p => p.status === "rejected").length;
  const watched      = allProposals.filter(p => ["pending", "snoozed"].includes(p.status)).length;

  const highlights: string[] = [];
  if (pending > 0) highlights.push(`${pending} proposal${pending > 1 ? "s" : ""} awaiting your approval`);
  if (autoExecuted > 0) highlights.push(`${autoExecuted} action${autoExecuted > 1 ? "s" : ""} auto-executed while you were away`);
  if (snoozed > 0) highlights.push(`${snoozed} item${snoozed > 1 ? "s" : ""} snoozed for later review`);

  // ── Draft-quality metrics ──────────────────────────────────────────────────
  const editedProposals = allProposals.filter(
    p => p.editDistance !== null && p.editDistance !== undefined && p.userEditedContent !== null
  );

  const byActionType: Record<string, number[]> = {};
  for (const p of editedProposals) {
    if (!byActionType[p.actionType]) byActionType[p.actionType] = [];
    byActionType[p.actionType].push(p.editDistance as number);
  }

  const draftQuality = Object.entries(byActionType)
    .map(([actionType, distances]) => ({
      actionType,
      avgEditDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
      sampleCount: distances.length,
    }))
    .sort((a, b) => b.avgEditDistance - a.avgEditDistance);

  // Surface action types where users significantly diverge from AI drafts (>30% change)
  const highEditTypes = draftQuality.filter(q => q.avgEditDistance > 0.3);
  for (const q of highEditTypes) {
    highlights.push(
      `${actionLabel(q.actionType)} drafts are edited heavily on average (${Math.round(q.avgEditDistance * 100)}% change) — copilot is learning from ${q.sampleCount} edit${q.sampleCount > 1 ? "s" : ""}`
    );
  }

  const recentActions = allProposals
    .filter(p => p.status === "auto_executed" || p.status === "approved")
    .slice(0, 5);

  res.json({ pending, autoExecuted, snoozed, rejected, watched, highlights, recentActions, draftQuality });
});

// ─── Autonomy policies ────────────────────────────────────────────────────────
router.get("/copilot/policies", async (_req, res) => {
  const rows = await db
    .select()
    .from(autonomyPoliciesTable)
    .orderBy(asc(autonomyPoliciesTable.id));
  res.json(rows);
});

router.put("/copilot/policies", async (req, res) => {
  const input = UpsertAutonomyPolicyBody.parse(req.body);

  const all = await db.select().from(autonomyPoliciesTable);
  const existing = all.find(p =>
    (p.supplierName ?? null) === (input.supplierName ?? null) &&
    (p.actionType ?? null) === (input.actionType ?? null)
  );

  if (existing) {
    const [updated] = await db
      .update(autonomyPoliciesTable)
      .set({ policy: input.policy })
      .where(eq(autonomyPoliciesTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [inserted] = await db
      .insert(autonomyPoliciesTable)
      .values({
        supplierName: input.supplierName ?? null,
        actionType: input.actionType ?? null,
        policy: input.policy,
      })
      .returning();
    res.json(inserted);
  }
});

// ─── AI Chat ──────────────────────────────────────────────────────────────────
const CopilotChatBody = z.object({
  message: z.string().min(1).max(2000),
  contextHint: z.string().max(500).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
});

router.post("/copilot/chat", async (req, res) => {
  const input = CopilotChatBody.parse(req.body);

  // Pull live context: active shipments + recent messages + payments
  const shipments = await db
    .select({
      id: shipmentsTable.id,
      poNumber: shipmentsTable.poNumber,
      product: shipmentsTable.product,
      supplierName: suppliersTable.name,
      status: shipmentsTable.status,
      currentStageId: shipmentsTable.currentStageId,
      dueDate: shipmentsTable.dueDate,
      exFactoryDate: shipmentsTable.exFactoryDate,
    })
    .from(shipmentsTable)
    .leftJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .where(inArray(shipmentsTable.status, ["on-track", "at-risk", "delayed"]));

  const recentMessages = await db
    .select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.receivedAt))
    .limit(20);

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.paid, false));

  const TODAY = "2026-05-18";

  const shipmentContext = shipments.map(s => {
    const msgs = recentMessages.filter(m => m.shipmentId === s.id);
    const pmts = payments.filter(p => p.shipmentId === s.id);
    const stage = s.currentStageId.replace(/_/g, " ");
    const overduePayments = pmts.filter(p => new Date(p.dueDate) < new Date(TODAY));
    return [
      `• ${s.poNumber} (${s.product}) — supplier: ${s.supplierName ?? "unknown"}, status: ${s.status}, stage: ${stage}, ex-factory: ${s.exFactoryDate}`,
      overduePayments.length > 0
        ? `  ⚠ Overdue payments: ${overduePayments.map(p => `${p.label} $${p.amountUsd} (due ${p.dueDate})`).join(", ")}`
        : "",
      msgs.length > 0 && msgs[0].unread
        ? `  📩 Unread message from ${msgs[0].sender} (${msgs[0].channel}): "${msgs[0].snippet}"`
        : "",
    ].filter(Boolean).join("\n");
  }).join("\n");

  const contextSection = input.contextHint
    ? `\nCURRENT PAGE CONTEXT: ${input.contextHint}\n`
    : "";

  const systemPrompt = `You are FlowForge Copilot, an AI assistant for a supply-chain buyer managing international purchase orders. Today is ${TODAY}.
${contextSection}
ACTIVE SHIPMENTS:
${shipmentContext || "No active shipments."}

Your role:
- Answer questions about shipments, suppliers, payments, and logistics
- Draft concise, professional supplier replies when asked
- Suggest actions for overdue payments, delays, and stage transitions
- Be direct and specific — use PO numbers and supplier names from the data above
- Keep replies short and actionable (2-4 sentences max unless drafting a message)
- When drafting supplier messages, output just the message text in quotes

If asked to draft a reply, write a clear, professional message the buyer can send directly.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...(input.history ?? []),
    { role: "user", content: input.message },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages,
  });

  const content = completion.choices[0]?.message?.content;
  const reply = (content && content.trim()) ? content.trim() : "I couldn't generate a response. Please try again.";
  res.json({ reply });
});

export default router;
