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

export interface UiPayment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; paymentId: number; }
export interface UiFactoryQuote { factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean; quoteId: number; }
export type UiShipmentStatus = "on-track" | "at-risk" | "delayed";

export interface UiShipment {
  id: string;
  shipmentId: number;
  po: string;
  product: string;
  supplier: string;
  customer: string;
  status: UiShipmentStatus;
  currentStageId: string;
  currentStage: string; // label, for Atelier
  dueDate: string;
  payments: [UiPayment, UiPayment];
  quotes?: UiFactoryQuote[];
}

export interface UiMessage {
  id: string;
  messageId: number;
  sender: string;
  channel: "gmail" | "whatsapp" | "sheets" | "pdf";
  timestamp: string;
  snippet: string;
  fullBody: string;
  unread: boolean;
  aiTags: string[];
  shipmentId: string;
  supplierId: string;
  aiDraft?: string;
  aiAction?: string;
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

export function adaptStages(rows: ApiStage[]): UiStage[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder).map(s => ({ id: s.id, label: s.label }));
}

export function adaptShipments(rows: ApiShipment[], stages: UiStage[]): UiShipment[] {
  const labelById = new Map(stages.map(s => [s.id, s.label]));
  return rows.map(s => ({
    id: `s${s.id}`,
    shipmentId: s.id,
    po: s.poNumber,
    product: s.product,
    supplier: s.supplierName,
    customer: s.customerName,
    status: (s.status as UiShipmentStatus),
    currentStageId: s.currentStageId,
    currentStage: labelById.get(s.currentStageId) ?? s.currentStageId,
    dueDate: shortDate(s.dueDate),
    payments: [
      { label: s.payments[0].label, percent: s.payments[0].percent, amountUsd: s.payments[0].amountUsd, paid: s.payments[0].paid, dueDate: shortDate(s.payments[0].dueDate), paymentId: s.payments[0].id },
      { label: s.payments[1].label, percent: s.payments[1].percent, amountUsd: s.payments[1].amountUsd, paid: s.payments[1].paid, dueDate: shortDate(s.payments[1].dueDate), paymentId: s.payments[1].id },
    ],
    quotes: s.quotes.length === 0 ? undefined : s.quotes.map((q: ApiShipment["quotes"][number]) => ({
      factory: q.factory, country: q.country, unitPrice: q.unitPrice, leadDays: q.leadDays, moq: q.moq, selected: q.selected, quoteId: q.id,
    })),
  }));
}

export function adaptMessages(rows: ApiMessage[], shipments: UiShipment[]): UiMessage[] {
  const shipMap = new Map(shipments.map(s => [s.shipmentId, s]));
  return rows.map(m => {
    const ship = shipMap.get(m.shipmentId);
    return {
      id: `m${m.id}`,
      messageId: m.id,
      sender: m.sender,
      channel: m.channel as UiMessage["channel"],
      timestamp: relativeAge(m.receivedAt),
      snippet: m.snippet,
      fullBody: m.fullBody,
      unread: m.unread,
      aiTags: m.aiTags ?? [],
      shipmentId: ship ? ship.id : `s${m.shipmentId}`,
      supplierId: ship?.supplier ?? "",
      aiDraft: m.aiDraft || undefined,
      aiAction: m.aiAction || undefined,
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
