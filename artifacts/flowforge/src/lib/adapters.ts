import type {
  Stage as ApiStage,
  Shipment as ApiShipment,
  Message as ApiMessage,
  Task as ApiTask,
} from "@workspace/api-client-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return String(iso);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function relativeAge(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const now = new Date("2026-05-18T00:00:00Z");
  const diffMs = now.getTime() - d.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getUTCDay()];
  return `${days}d ago`;
}

export interface UiPayment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; rawPaymentDueDate: string; paymentId: number; paidAt: string | null; paidMethod: string | null; intermediaryAdvanceUsd: number | null; intermediaryRecoveredUsd: number | null; invoiceNumber: string | null; intermediarySupplierPaidUsd: number | null; intermediarySupplierPaidAt: string | null; }
export interface UiFactoryQuote { factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean; quoteId: number; validityDate?: string | null; notes?: string | null; }
export interface UiDealAdjustment { id: number; label: string; type: "flat" | "percent"; value: number; }
export type UiShipmentStatus = "on-track" | "at-risk" | "delayed";

export interface UiShipment {
  id: string;
  shipmentId: number;
  po: string;
  buyerPoNumber: string | null;
  buyerPoNumbers: string[];
  product: string;
  category: string;
  supplier: string;
  supplierId: number;
  customer: string;
  buyerId: number | null;
  status: UiShipmentStatus;
  currentStageId: string;
  currentStage: string; // label, for Atelier
  dueDate: string;
  rawDueDate: string;
  rawExFactoryDate: string;
  destination: string;
  via: string;
  notes: string | null;
  quantity: number | null;
  unitCostUsd: number | null;
  payments: UiPayment[];
  quotes?: UiFactoryQuote[];
  buyerUnitPrice: number | null;
  buyerQuantity: number | null;
  spreadUsd: number | null;
  spreadPct: number | null;
  targetSpreadPct: number | null;
  adjustmentsUsd: number | null;
  adjustments: UiDealAdjustment[];
  assigneeId: string | null;
  assigneeName: string | null;
  archivedAt: string | null;
}

export interface UiMessage {
  id: string;
  messageId: number;
  sender: string;
  channel: "gmail" | "whatsapp" | "wechat" | "imessage" | "sms" | "sheets" | "pdf";
  timestamp: string;
  snippet: string;
  fullBody: string;
  unread: boolean;
  isFlagged: boolean;
  aiTags: string[];
  shipmentId: string;
  supplierId: string;
  aiDraft?: string;
  aiAction?: string;
  routingStatus?: "routed" | "needs-review";
  routingConfidence?: number | null;
  rawSenderEmail?: string | null;
  matchMethod?: string | null;
  rawChatText?: string | null;
  routedToUserName?: string | null;
}

export interface UiTask {
  id: string;
  taskId: number;
  title: string;
  source: string;
  sourceAge: string;
  urgency: "high" | "medium" | "low";
  shipmentId: string;
  messageId?: string;
  action: string;
  done: boolean;
}

export interface UiStage { id: string; label: string; }

// Spread badge color: target-driven when a target spread % is set, else 25/10 fallback.
export function spreadBadgeClass(pct: number, target: number | null | undefined): string {
  if (target !== null && target !== undefined) {
    if (pct >= target) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (pct >= target - 5) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (pct >= 25) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 10) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function adaptStages(rows: ApiStage[]): UiStage[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder).map(s => ({ id: s.id, label: s.label }));
}

export function adaptShipments(rows: ApiShipment[], stages: UiStage[]): UiShipment[] {
  const labelById = new Map(stages.map(s => [s.id, s.label]));
  return rows.map(s => ({
    id: `s${s.id}`,
    shipmentId: s.id,
    po: s.poNumber,
    buyerPoNumber: s.buyerPoNumber ?? null,
    buyerPoNumbers: s.buyerPoNumbers ?? [],
    product: s.product,
    category: s.category,
    supplier: s.supplierName,
    supplierId: s.supplierId,
    customer: s.customerName,
    buyerId: s.buyerId ?? null,
    status: (s.status as UiShipmentStatus),
    currentStageId: s.currentStageId,
    currentStage: labelById.get(s.currentStageId) ?? s.currentStageId,
    dueDate: shortDate(s.dueDate),
    rawDueDate: s.dueDate,
    rawExFactoryDate: s.exFactoryDate,
    destination: s.destination,
    via: s.via,
    notes: s.notes ?? null,
    quantity: s.quantity ?? null,
    unitCostUsd: s.unitCostUsd ?? null,
    assigneeId: s.assigneeId ?? null,
    assigneeName: s.assigneeName ?? null,
    payments: s.payments.length === 0
      ? [
          { label: "Deposit (30%)", percent: 30, amountUsd: 0, paid: false, dueDate: "—", rawPaymentDueDate: "", paymentId: 0, paidAt: null, paidMethod: null, intermediaryAdvanceUsd: null, intermediaryRecoveredUsd: null, invoiceNumber: null, intermediarySupplierPaidUsd: null, intermediarySupplierPaidAt: null },
          { label: "Balance (70%)", percent: 70, amountUsd: 0, paid: false, dueDate: "—", rawPaymentDueDate: "", paymentId: 0, paidAt: null, paidMethod: null, intermediaryAdvanceUsd: null, intermediaryRecoveredUsd: null, invoiceNumber: null, intermediarySupplierPaidUsd: null, intermediarySupplierPaidAt: null },
        ]
      : s.payments.map(p => ({ label: p.label, percent: p.percent, amountUsd: p.amountUsd, paid: p.paid, dueDate: shortDate(p.dueDate), rawPaymentDueDate: p.dueDate, paymentId: p.id, paidAt: p.paidAt ?? null, paidMethod: p.method ?? null, intermediaryAdvanceUsd: p.intermediaryAdvanceUsd ?? null, intermediaryRecoveredUsd: p.intermediaryRecoveredUsd ?? null, invoiceNumber: p.invoiceNumber ?? null, intermediarySupplierPaidUsd: p.intermediarySupplierPaidUsd ?? null, intermediarySupplierPaidAt: p.intermediarySupplierPaidAt ?? null })) as [UiPayment, UiPayment],
    quotes: s.quotes.length === 0 ? undefined : s.quotes.map((q: ApiShipment["quotes"][number]) => ({
      factory: q.factory, country: q.country, unitPrice: q.unitPrice, leadDays: q.leadDays, moq: q.moq, selected: q.selected, quoteId: q.id, validityDate: q.validityDate, notes: q.notes,
    })),
    buyerUnitPrice: s.buyerUnitPrice ?? null,
    buyerQuantity: s.buyerQuantity ?? null,
    spreadUsd: s.spreadUsd ?? null,
    spreadPct: s.spreadPct ?? null,
    targetSpreadPct: s.targetSpreadPct ?? null,
    adjustmentsUsd: s.adjustmentsUsd ?? null,
    adjustments: (s.adjustments ?? []).map(a => ({
      id: a.id, label: a.label, type: a.type, value: a.value,
    })),
    archivedAt: s.archivedAt ?? null,
  }));
}

export function adaptMessages(rows: ApiMessage[], shipments: UiShipment[]): UiMessage[] {
  const shipMap = new Map(shipments.map(s => [s.shipmentId, s]));
  return rows.map(m => {
    const ship = m.shipmentId != null ? shipMap.get(m.shipmentId) : undefined;
    return {
      id: `m${m.id}`,
      messageId: m.id,
      sender: m.sender,
      channel: m.channel as UiMessage["channel"],
      timestamp: relativeAge(m.receivedAt),
      snippet: m.snippet,
      fullBody: m.fullBody,
      unread: m.unread,
      isFlagged: m.isFlagged,
      aiTags: m.aiTags ?? [],
      shipmentId: ship ? ship.id : m.shipmentId != null ? `s${m.shipmentId}` : "unrouted",
      supplierId: ship?.supplier ?? "",
      aiDraft: m.aiDraft || undefined,
      aiAction: m.aiAction || undefined,
      routingStatus: m.routingStatus as UiMessage["routingStatus"],
      routingConfidence: m.routingConfidence,
      rawSenderEmail: m.rawSenderEmail,
      matchMethod: m.matchMethod,
      rawChatText: m.rawChatText ?? null,
      routedToUserName: m.routedToUserName,
    };
  });
}

export function adaptTasks(rows: ApiTask[], shipments: UiShipment[]): UiTask[] {
  const shipMap = new Map(shipments.map(s => [s.shipmentId, s]));
  return rows.map(t => {
    const ship = shipMap.get(t.shipmentId);
    return {
      id: `t${t.id}`,
      taskId: t.id,
      title: t.title,
      source: t.source,
      sourceAge: t.sourceAge,
      urgency: t.urgency as UiTask["urgency"],
      shipmentId: ship ? ship.id : `s${t.shipmentId}`,
      messageId: t.messageId == null ? undefined : `m${t.messageId}`,
      action: t.action,
      done: t.done,
    };
  });
}
