import { db, shipmentsTable, messagesTable, paymentsTable, copilotProposalsTable, autonomyPoliciesTable } from "@workspace/db";
import { desc, eq, and, inArray, isNull, sql } from "drizzle-orm";

export type ProposalCandidate = {
  shipmentId: number;
  poNumber: string;
  supplierName: string;
  triggerType: string;
  triggerRef: string | null;
  actionType: string;
  payload: Record<string, unknown>;
  reasoning: string;
  confidence: number;
};

const TODAY = new Date("2026-05-18");

function daysSince(d: Date): number {
  return Math.floor((TODAY.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(d: Date): number {
  return Math.floor((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

export async function generateProposals(): Promise<ProposalCandidate[]> {
  const shipments = await db
    .select({
      id: shipmentsTable.id,
      poNumber: shipmentsTable.poNumber,
      product: shipmentsTable.product,
      supplierId: shipmentsTable.supplierId,
      status: shipmentsTable.status,
      currentStageId: shipmentsTable.currentStageId,
      dueDate: shipmentsTable.dueDate,
      exFactoryDate: shipmentsTable.exFactoryDate,
    })
    .from(shipmentsTable)
    .where(
      inArray(shipmentsTable.status, ["on-track", "at-risk", "delayed"])
    );

  const allMessages = await db
    .select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.receivedAt));

  const allPayments = await db
    .select()
    .from(paymentsTable);

  const candidates: ProposalCandidate[] = [];

  for (const s of shipments) {
    const shipMessages = allMessages.filter(m => m.shipmentId === s.id);
    const shipPayments = allPayments.filter(p => p.shipmentId === s.id);
    const supplierName = `Supplier #${s.supplierId}`;

    // 1. Unread messages that have an AI draft ready
    for (const msg of shipMessages.filter(m => m.unread && m.aiDraft)) {
      candidates.push({
        shipmentId: s.id,
        poNumber: s.poNumber,
        supplierName,
        triggerType: "message_received",
        triggerRef: `message:${msg.id}`,
        actionType: "reply",
        payload: {
          draftBody: msg.aiDraft,
          channel: msg.channel,
          sender: msg.sender,
          messageSnippet: msg.snippet,
          aiAction: msg.aiAction,
        },
        reasoning: `Unread message from ${msg.sender} via ${msg.channel} requires a response. AI has drafted a reply based on the message content and current shipment stage (${s.currentStageId}).`,
        confidence: 0.85,
      });
    }

    // 2. Overdue payments
    for (const pmt of shipPayments.filter(p => !p.paid)) {
      const due = daysUntil(new Date(pmt.dueDate));
      if (due <= 0) {
        candidates.push({
          shipmentId: s.id,
          poNumber: s.poNumber,
          supplierName,
          triggerType: "payment_overdue",
          triggerRef: `payment:${pmt.id}`,
          actionType: "payment_reminder",
          payload: {
            paymentLabel: pmt.label,
            amountUsd: pmt.amountUsd,
            dueDate: pmt.dueDate,
            daysOverdue: Math.abs(due),
          },
          reasoning: `${pmt.label} of $${pmt.amountUsd.toLocaleString()} was due ${Math.abs(due)} day(s) ago for ${s.poNumber}. Payment needs to be arranged to avoid release hold.`,
          confidence: 0.95,
        });
      } else if (due <= 3) {
        candidates.push({
          shipmentId: s.id,
          poNumber: s.poNumber,
          supplierName,
          triggerType: "payment_overdue",
          triggerRef: `payment:${pmt.id}`,
          actionType: "payment_reminder",
          payload: {
            paymentLabel: pmt.label,
            amountUsd: pmt.amountUsd,
            dueDate: pmt.dueDate,
            daysUntilDue: due,
          },
          reasoning: `${pmt.label} of $${pmt.amountUsd.toLocaleString()} for ${s.poNumber} is due in ${due} day(s). Proactive reminder recommended to ensure on-time payment.`,
          confidence: 0.88,
        });
      }
    }

    // 3. Stage idle — shipment in same stage for too long without activity
    const lastMsg = shipMessages[0];
    if (lastMsg) {
      const daysSinceLastMsg = daysSince(new Date(lastMsg.receivedAt));
      if (daysSinceLastMsg >= 3 && s.status !== "delivered") {
        const stageLabel = s.currentStageId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        candidates.push({
          shipmentId: s.id,
          poNumber: s.poNumber,
          supplierName,
          triggerType: "no_response_48h",
          triggerRef: `message:${lastMsg.id}`,
          actionType: "nudge",
          payload: {
            daysSilent: daysSinceLastMsg,
            currentStage: s.currentStageId,
            draftBody: `Hi, following up on ${s.poNumber} — could you provide an update on the current ${stageLabel} stage? We want to ensure we're on track for the ex-factory date.`,
            channel: lastMsg.channel,
          },
          reasoning: `No communication on ${s.poNumber} for ${daysSinceLastMsg} days while at ${stageLabel} stage. A follow-up nudge will keep the shipment moving forward.`,
          confidence: 0.75,
        });
      }
    }

    // 4. At-risk or delayed shipments need escalation notice
    if (s.status === "delayed") {
      const daysToExFactory = daysUntil(new Date(s.exFactoryDate));
      if (daysToExFactory <= 7) {
        candidates.push({
          shipmentId: s.id,
          poNumber: s.poNumber,
          supplierName,
          triggerType: "port_delay",
          triggerRef: null,
          actionType: "escalation",
          payload: {
            daysToExFactory,
            currentStage: s.currentStageId,
            draftBody: `URGENT: ${s.poNumber} is currently delayed with only ${daysToExFactory} days to ex-factory. Immediate action required to mitigate impact on customer delivery.`,
          },
          reasoning: `${s.poNumber} is marked delayed with ex-factory in ${daysToExFactory} day(s). Escalation draft prepared for management review.`,
          confidence: 0.92,
        });
      }
    }

    // 5. Shipments nearing ex-factory that haven't advanced to ex_factory stage
    if (s.currentStageId === "qc" || s.currentStageId === "production") {
      const daysToExFactory = daysUntil(new Date(s.exFactoryDate));
      if (daysToExFactory <= 5 && daysToExFactory > 0) {
        candidates.push({
          shipmentId: s.id,
          poNumber: s.poNumber,
          supplierName,
          triggerType: "stage_idle",
          triggerRef: null,
          actionType: "doc_request",
          payload: {
            currentStage: s.currentStageId,
            daysToExFactory,
            requiredDocs: ["Commercial Invoice", "Packing List", "Certificate of Origin", "B/L Draft"],
            draftBody: `With ex-factory approaching in ${daysToExFactory} days for ${s.poNumber}, please begin preparing: Commercial Invoice, Packing List, Certificate of Origin, and B/L Draft.`,
          },
          reasoning: `${s.poNumber} is ${daysToExFactory} day(s) from ex-factory but still at ${s.currentStageId.replace(/_/g, " ")} stage. Shipping documents need to be requested proactively.`,
          confidence: 0.82,
        });
      }
    }
  }

  return candidates;
}

export async function getPolicy(
  supplierName: string,
  actionType: string
): Promise<string> {
  const policies = await db
    .select()
    .from(autonomyPoliciesTable)
    .orderBy(desc(autonomyPoliciesTable.id));

  // Most specific match first: supplier + action type
  const specific = policies.find(
    p => p.supplierName === supplierName && p.actionType === actionType
  );
  if (specific) return specific.policy;

  // Supplier-level match
  const supplierLevel = policies.find(
    p => p.supplierName === supplierName && !p.actionType
  );
  if (supplierLevel) return supplierLevel.policy;

  // Action-type level match
  const actionLevel = policies.find(
    p => !p.supplierName && p.actionType === actionType
  );
  if (actionLevel) return actionLevel.policy;

  // Global default
  const global = policies.find(p => !p.supplierName && !p.actionType);
  if (global) return global.policy;

  return "always_ask";
}

export async function runTriggerEngine(): Promise<{
  scanned: number;
  created: number;
  autoExecuted: number;
  proposals: (typeof copilotProposalsTable.$inferSelect)[];
}> {
  const allShipments = await db.select().from(shipmentsTable);
  const candidates = await generateProposals();

  // De-duplicate: don't create a new proposal if one already exists pending for
  // the same shipment + triggerRef combination
  const existingPending = await db
    .select()
    .from(copilotProposalsTable)
    .where(
      inArray(copilotProposalsTable.status, ["pending", "snoozed"])
    );

  const existingKeys = new Set(
    existingPending.map(p => `${p.shipmentId}:${p.triggerRef ?? p.actionType}`)
  );

  const toInsert = candidates.filter(c => {
    const key = `${c.shipmentId}:${c.triggerRef ?? c.actionType}`;
    return !existingKeys.has(key);
  });

  if (toInsert.length === 0) {
    return {
      scanned: allShipments.length,
      created: 0,
      autoExecuted: 0,
      proposals: [],
    };
  }

  const created: (typeof copilotProposalsTable.$inferSelect)[] = [];
  let autoExecuted = 0;

  for (const candidate of toInsert) {
    const policy = await getPolicy(candidate.supplierName, candidate.actionType);
    const isAutoExec = policy === "full_auto" ||
      (policy === "auto_ack" && candidate.actionType === "reply" && candidate.confidence >= 0.9);

    const status = isAutoExec ? "auto_executed" : "pending";

    const auditEntry = {
      at: new Date().toISOString(),
      actor: isAutoExec ? "copilot:auto" : "copilot:trigger",
      action: isAutoExec ? "auto_executed" : "generated",
      note: `Policy: ${policy}. Confidence: ${candidate.confidence}`,
    };

    const [inserted] = await db
      .insert(copilotProposalsTable)
      .values({
        shipmentId: candidate.shipmentId,
        triggerType: candidate.triggerType,
        triggerRef: candidate.triggerRef,
        actionType: candidate.actionType,
        payload: candidate.payload,
        reasoning: candidate.reasoning,
        confidence: candidate.confidence,
        status,
        auditTrail: [auditEntry],
      })
      .returning();

    if (inserted) {
      created.push(inserted);
      if (isAutoExec) autoExecuted++;
    }
  }

  return {
    scanned: allShipments.length,
    created: created.length,
    autoExecuted,
    proposals: created,
  };
}
