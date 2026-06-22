import {
  db,
  shipmentsTable,
  suppliersTable,
  paymentsTable,
  messagesTable,
  shipmentPredictionsTable,
} from "@workspace/db";
import { and, desc, eq, asc } from "drizzle-orm";

const TODAY = new Date("2026-05-18T00:00:00Z");

const STAGE_ORDER: Record<string, number> = {
  spec: 0, quotes: 1, sample_ord: 2, sample_apr: 3, po_issued: 4,
  production: 5, qc: 6, ex_factory: 7, in_transit: 8, payment: 9, delivered: 10,
};

const STAGE_TYPICAL_DAYS: Record<string, number> = {
  spec: 7, quotes: 10, sample_ord: 14, sample_apr: 7, po_issued: 3,
  production: 35, qc: 5, ex_factory: 2, in_transit: 25, payment: 5, delivered: 0,
};

const KNOWN_HIGH_RISK_ROUTES = ["Tianjin", "Shanghai", "Ningbo", "Guangzhou"];
const RISK_ROUTE_SCORE: Record<string, number> = {
  "Tianjin": 12, "Shanghai": 8, "Ningbo": 6, "Guangzhou": 5,
};

export interface ContributingSignal {
  signal: string;
  description: string;
  weight: number;
  direction: "risk-up" | "risk-down" | "neutral";
}

export interface RecommendedMitigation {
  action: string;
  rationale: string;
  estimatedCostUsd: number | null;
  recoveryDays: number | null;
}

export interface PredictionResult {
  riskScore: number;
  predictedEtaMin: Date;
  predictedEtaMax: Date;
  confidence: number;
  contributingSignals: ContributingSignal[];
  recommendedMitigations: RecommendedMitigation[];
}

export async function computePrediction(shipmentId: number): Promise<PredictionResult> {
  const [row] = await db
    .select({ shipment: shipmentsTable, supplierName: suppliersTable.name })
    .from(shipmentsTable)
    .innerJoin(suppliersTable, eq(shipmentsTable.supplierId, suppliersTable.id))
    .where(eq(shipmentsTable.id, shipmentId));

  if (!row) throw new Error("Shipment not found");

  const { shipment, supplierName } = row;

  const payments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.shipmentId, shipmentId))
    .orderBy(asc(paymentsTable.sortOrder));

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.shipmentId, shipmentId))
    .orderBy(desc(messagesTable.receivedAt));

  const signals: ContributingSignal[] = [];
  let riskAccumulator = 0;

  const dueDate = new Date(shipment.dueDate);
  const daysUntilDue = Math.round((dueDate.getTime() - TODAY.getTime()) / 86_400_000);
  const stageIdx = STAGE_ORDER[shipment.currentStageId] ?? 5;
  const totalStages = 11;
  const stageProgress = stageIdx / (totalStages - 1);

  const expectedProgressByDue = Math.max(0, Math.min(1,
    1 - (daysUntilDue > 0 ? daysUntilDue / 90 : 0)
  ));

  const progressGap = expectedProgressByDue - stageProgress;

  if (progressGap > 0.2) {
    const w = Math.min(30, Math.round(progressGap * 80));
    riskAccumulator += w;
    signals.push({
      signal: "schedule_lag",
      description: `Shipment is ${Math.round(progressGap * 100)}% behind expected schedule progress`,
      weight: w,
      direction: "risk-up",
    });
  } else if (progressGap < -0.1) {
    const w = Math.min(10, Math.round(Math.abs(progressGap) * 20));
    riskAccumulator -= w;
    signals.push({
      signal: "ahead_of_schedule",
      description: "Shipment is tracking ahead of schedule",
      weight: w,
      direction: "risk-down",
    });
  }

  if (shipment.status === "delayed") {
    riskAccumulator += 25;
    signals.push({
      signal: "active_delay",
      description: "Shipment is currently tagged as delayed",
      weight: 25,
      direction: "risk-up",
    });
  } else if (shipment.status === "at-risk") {
    riskAccumulator += 15;
    signals.push({
      signal: "at_risk_status",
      description: "Shipment is currently flagged at-risk",
      weight: 15,
      direction: "risk-up",
    });
  }

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    const w = Math.min(20, overdueDays * 2);
    riskAccumulator += w;
    signals.push({
      signal: "past_due_date",
      description: `Target date passed ${overdueDays} day(s) ago`,
      weight: w,
      direction: "risk-up",
    });
  } else if (daysUntilDue <= 7 && stageIdx < 8) {
    const w = 12;
    riskAccumulator += w;
    signals.push({
      signal: "tight_window",
      description: `Only ${daysUntilDue} days until due date but still at ${shipment.currentStageId.replace(/_/g, " ")} stage`,
      weight: w,
      direction: "risk-up",
    });
  }

  const depositPmt = payments.find(p => p.sortOrder === 0);
  const balancePmt = payments.find(p => p.sortOrder === 1);

  if (depositPmt && !depositPmt.paid) {
    const depositDue = new Date(depositPmt.dueDate);
    const depositOverdue = Math.round((TODAY.getTime() - depositDue.getTime()) / 86_400_000);
    if (depositOverdue > 0) {
      const w = Math.min(15, depositOverdue * 2);
      riskAccumulator += w;
      signals.push({
        signal: "deposit_overdue",
        description: `Deposit payment overdue by ${depositOverdue} day(s) — factory may pause production`,
        weight: w,
        direction: "risk-up",
      });
    }
  } else if (depositPmt?.paid) {
    signals.push({
      signal: "deposit_paid",
      description: "Deposit payment confirmed — factory proceeding",
      weight: 3,
      direction: "risk-down",
    });
    riskAccumulator -= 3;
  }

  if (balancePmt && !balancePmt.paid && stageIdx >= 7) {
    const balanceDue = new Date(balancePmt.dueDate);
    const balanceOverdue = Math.round((TODAY.getTime() - balanceDue.getTime()) / 86_400_000);
    if (balanceOverdue > 0) {
      const w = Math.min(18, balanceOverdue * 3);
      riskAccumulator += w;
      signals.push({
        signal: "balance_overdue",
        description: `Balance payment overdue by ${balanceOverdue} day(s) — container may not be released`,
        weight: w,
        direction: "risk-up",
      });
    }
  }

  const routeRisk = KNOWN_HIGH_RISK_ROUTES.find(r =>
    supplierName.includes(r) || shipment.destination.includes(r) || shipment.via.includes(r)
  );
  if (routeRisk) {
    const w = RISK_ROUTE_SCORE[routeRisk] ?? 5;
    riskAccumulator += w;
    signals.push({
      signal: "route_congestion",
      description: `${routeRisk} port is a known congestion hotspot`,
      weight: w,
      direction: "risk-up",
    });
  }

  const recentMessages = messages.slice(0, 10);
  const unreadCount = recentMessages.filter(m => m.unread).length;
  const totalRecent = recentMessages.length;

  if (totalRecent > 0 && unreadCount >= 2) {
    const w = Math.min(10, unreadCount * 4);
    riskAccumulator += w;
    signals.push({
      signal: "unanswered_messages",
      description: `${unreadCount} unanswered supplier message(s) — communication gap`,
      weight: w,
      direction: "risk-up",
    });
  } else if (totalRecent > 0 && unreadCount === 0) {
    riskAccumulator -= 4;
    signals.push({
      signal: "communication_current",
      description: "All supplier messages have been read and addressed",
      weight: 4,
      direction: "risk-down",
    });
  }

  const lastMessage = messages[0];
  if (lastMessage) {
    const lastMsgAge = Math.round((TODAY.getTime() - new Date(lastMessage.receivedAt).getTime()) / 86_400_000);
    if (lastMsgAge > 7 && stageIdx >= 4 && stageIdx < 9) {
      const w = Math.min(10, lastMsgAge);
      riskAccumulator += w;
      signals.push({
        signal: "supplier_silence",
        description: `No supplier communication in ${lastMsgAge} day(s) during active production phase`,
        weight: w,
        direction: "risk-up",
      });
    }
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(riskAccumulator)));

  const baseEta = new Date(dueDate);
  const delayBuffer = riskScore > 70 ? 14 : riskScore > 45 ? 7 : riskScore > 20 ? 3 : 0;
  const spreadDays = riskScore > 60 ? 10 : riskScore > 30 ? 5 : 2;

  const predictedEtaMin = new Date(baseEta);
  predictedEtaMin.setDate(predictedEtaMin.getDate() + Math.max(0, delayBuffer - spreadDays));

  const predictedEtaMax = new Date(baseEta);
  predictedEtaMax.setDate(predictedEtaMax.getDate() + delayBuffer + spreadDays);

  const confidence = riskScore > 70 ? 0.55 : riskScore > 40 ? 0.65 : 0.78;

  signals.sort((a, b) => b.weight - a.weight);
  const topSignals = signals.slice(0, 5);

  const mitigations: RecommendedMitigation[] = [];

  if (riskScore >= 60) {
    mitigations.push({
      action: "Escalate to air freight for critical portion",
      rationale: `High risk (score ${riskScore}) — air freight recovers ~12 days vs ocean`,
      estimatedCostUsd: 2800,
      recoveryDays: 12,
    });
  }

  if (signals.some(s => s.signal === "deposit_overdue" || s.signal === "balance_overdue")) {
    mitigations.push({
      action: "Process outstanding payment immediately",
      rationale: "Overdue payment is blocking production or container release",
      estimatedCostUsd: null,
      recoveryDays: 2,
    });
  }

  if (signals.some(s => s.signal === "unanswered_messages" || s.signal === "supplier_silence")) {
    mitigations.push({
      action: "Request urgent status update from supplier",
      rationale: "Communication gap increases uncertainty — direct call recommended",
      estimatedCostUsd: null,
      recoveryDays: null,
    });
  }

  if (signals.some(s => s.signal === "route_congestion")) {
    mitigations.push({
      action: "Contact freight forwarder for alternate port routing",
      rationale: "Port congestion on current route; alternative berth may reduce delay by 4-6 days",
      estimatedCostUsd: 400,
      recoveryDays: 5,
    });
  }

  if (riskScore >= 40 && stageIdx < 8) {
    mitigations.push({
      action: "Notify buyer of revised ETA now",
      rationale: "Proactive buyer communication reduces commercial impact and builds trust",
      estimatedCostUsd: null,
      recoveryDays: null,
    });
  }

  return {
    riskScore,
    predictedEtaMin,
    predictedEtaMax,
    confidence,
    contributingSignals: topSignals,
    recommendedMitigations: mitigations,
  };
}

export async function computeAndStorePrediction(shipmentId: number, orgId?: number) {
  let resolvedOrgId = orgId;
  if (resolvedOrgId === undefined) {
    const [row] = await db.select({ orgId: shipmentsTable.orgId }).from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId));
    resolvedOrgId = row?.orgId ?? 1;
  }
  const result = await computePrediction(shipmentId);

  const [stored] = await db
    .insert(shipmentPredictionsTable)
    .values({
      shipmentId,
      orgId: resolvedOrgId,
      riskScore: result.riskScore,
      predictedEtaMin: result.predictedEtaMin,
      predictedEtaMax: result.predictedEtaMax,
      confidence: result.confidence,
      contributingSignals: result.contributingSignals,
      recommendedMitigations: result.recommendedMitigations,
      computedAt: new Date(),
    })
    .returning();

  return stored;
}

export async function getLatestPrediction(shipmentId: number, orgId?: number) {
  const cond = orgId !== undefined
    ? and(eq(shipmentPredictionsTable.shipmentId, shipmentId), eq(shipmentPredictionsTable.orgId, orgId))
    : eq(shipmentPredictionsTable.shipmentId, shipmentId);
  const [row] = await db
    .select()
    .from(shipmentPredictionsTable)
    .where(cond)
    .orderBy(desc(shipmentPredictionsTable.computedAt))
    .limit(1);
  return row ?? null;
}

export async function getAllPredictions(shipmentId: number, orgId?: number) {
  const cond = orgId !== undefined
    ? and(eq(shipmentPredictionsTable.shipmentId, shipmentId), eq(shipmentPredictionsTable.orgId, orgId))
    : eq(shipmentPredictionsTable.shipmentId, shipmentId);
  return db
    .select()
    .from(shipmentPredictionsTable)
    .where(cond)
    .orderBy(desc(shipmentPredictionsTable.computedAt));
}
