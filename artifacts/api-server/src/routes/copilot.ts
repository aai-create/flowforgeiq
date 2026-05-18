import { Router, type IRouter } from "express";
import { db, copilotProposalsTable, autonomyPoliciesTable } from "@workspace/db";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  CreateCopilotProposalBody,
  UpdateCopilotProposalBody,
  UpsertAutonomyPolicyBody,
  ListCopilotProposalsQueryParams,
} from "@workspace/api-zod";
import { runTriggerEngine } from "../lib/copilot-trigger";

const router: IRouter = Router();

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

  const recentActions = allProposals
    .filter(p => p.status === "auto_executed" || p.status === "approved")
    .slice(0, 5);

  res.json({ pending, autoExecuted, snoozed, rejected, watched, highlights, recentActions });
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

export default router;
