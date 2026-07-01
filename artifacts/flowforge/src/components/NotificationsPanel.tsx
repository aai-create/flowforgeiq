import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueries } from "@tanstack/react-query";
import {
  Bell, Mail, MessageCircle, MessageSquare, FileText,
  DollarSign, ArrowRight, Inbox, X, FileSpreadsheet,
  Clock, AlertCircle,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useListMessages,
  useListDocuments,
  useListShipments,
  useListStages,
  getListShipmentStageEventsQueryOptions,
  type StageEvent,
} from "@workspace/api-client-react";
import { relativeAge } from "@/lib/adapters";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type NotifType = "message" | "document" | "payment" | "stage" | "payment-due" | "payment-overdue";

interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  timestamp: string;  // ISO
  href: string;       // deep-link navigation target
  channel?: string;   // for message rows
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers + cross-tab sync via BroadcastChannel
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = "ff_notifications_last_opened";
const BC_CHANNEL = "ff_notifications";

function getLastOpened(): Date {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) return new Date(v);
  } catch {}
  return new Date(0);
}

function persistLastOpened(): string {
  const iso = new Date().toISOString();
  try {
    localStorage.setItem(LS_KEY, iso);
  } catch {}
  return iso;
}

function getChannel(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(BC_CHANNEL);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel icon
// ─────────────────────────────────────────────────────────────────────────────
function ChannelIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  if (channel === "email" || channel === "gmail") return <Mail size={size} className="text-blue-500" />;
  if (channel === "whatsapp") return <MessageCircle size={size} className="text-emerald-500" />;
  if (channel === "wechat")   return <MessageSquare size={size} className="text-teal-500" />;
  if (channel === "imessage") return <MessageCircle size={size} className="text-blue-400" />;
  if (channel === "sms")      return <MessageCircle size={size} className="text-slate-400" />;
  if (channel === "sheets")   return <FileSpreadsheet size={size} className="text-green-600" />;
  return <FileText size={size} className="text-red-500" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon container colour per type
// ─────────────────────────────────────────────────────────────────────────────
function notifBg(type: NotifType): string {
  if (type === "message")          return "bg-blue-50";
  if (type === "document")         return "bg-violet-50";
  if (type === "payment")          return "bg-emerald-50";
  if (type === "payment-due")      return "bg-amber-50";
  if (type === "payment-overdue")  return "bg-red-50";
  return "bg-amber-50";
}

function NotifIconInner({ item }: { item: NotificationItem }) {
  if (item.type === "message" && item.channel)
    return <ChannelIcon channel={item.channel} size={14} />;
  if (item.type === "document")
    return <FileText size={14} className="text-violet-600" />;
  if (item.type === "payment")
    return <DollarSign size={14} className="text-emerald-600" />;
  if (item.type === "payment-due")
    return <Clock size={14} className="text-amber-600" />;
  if (item.type === "payment-overdue")
    return <AlertCircle size={14} className="text-red-600" />;
  return <ArrowRight size={14} className="text-amber-600" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build notifications from all existing API data — no new endpoint needed
// ─────────────────────────────────────────────────────────────────────────────
function useNotifications(): NotificationItem[] {
  const { data: messages  = [] } = useListMessages();
  const { data: documents = [] } = useListDocuments();
  const { data: shipments = [] } = useListShipments();
  const { data: stages    = [] } = useListStages();

  // Fetch stage events for every shipment in parallel (React Query dedupes & caches)
  const stageEventResults = useQueries({
    queries: shipments.map(s => getListShipmentStageEventsQueryOptions(s.id)),
  });

  return React.useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 3_600_000;
    const items: NotificationItem[] = [];

    // Stage label lookup (id → human-readable label)
    const stageLabelMap = new Map<string, string>();
    for (const s of stages) stageLabelMap.set(s.id, s.label);

    // Shipment lookup by numeric id
    const shipmentById = new Map(shipments.map(s => [s.id, s]));

    // ── 1. Unread inbound messages (within 7 days) ──────────────────────────
    const msgCutoff = now - 7 * DAY;
    for (const msg of messages) {
      if (!msg.unread || msg.direction !== "inbound") continue;
      if (new Date(msg.receivedAt).getTime() < msgCutoff) continue;

      const channelLabel =
        (msg.channel === "email" || msg.channel === "gmail") ? "Email" :
        msg.channel === "whatsapp" ? "WhatsApp" :
        msg.channel === "wechat"   ? "WeChat"   :
        msg.channel === "imessage" ? "iMessage" :
        msg.channel === "sms"      ? "SMS"      : msg.channel;

      const ship = msg.shipmentId != null ? shipmentById.get(msg.shipmentId) : undefined;
      const subtitle = ship
        ? `${ship.poNumber} · ${ship.supplierName}`
        : msg.snippet.slice(0, 55) + (msg.snippet.length > 55 ? "…" : "");

      const href = msg.shipmentId != null ? `/?shipment=${msg.shipmentId}` : "/";

      items.push({
        id: `msg-${msg.id}`,
        type: "message",
        title: `New ${channelLabel} from ${msg.sender}`,
        subtitle,
        timestamp: msg.receivedAt,
        href,
        channel: msg.channel,
      });
    }

    // ── 2. Stage advances (within 48 h) ─────────────────────────────────────
    const stageCutoff = now - 48 * 3_600_000;
    for (const result of stageEventResults) {
      const events: StageEvent[] = result.data ?? [];
      for (const ev of events) {
        if (new Date(ev.createdAt).getTime() < stageCutoff) continue;
        const toLabel = stageLabelMap.get(ev.toStageId) ?? ev.toStageId;
        const ship = shipmentById.get(ev.shipmentId);
        const subtitle = ship
          ? `${ship.poNumber} · ${ship.supplierName}`
          : `Shipment #${ev.shipmentId}`;

        items.push({
          id: `stage-${ev.id}`,
          type: "stage",
          title: `Stage advanced → ${toLabel}`,
          subtitle,
          timestamp: ev.createdAt,
          href: `/orders`,
        });
      }
    }

    // ── 3. Recent documents (within 72 h) ────────────────────────────────────
    const docCutoff = now - 72 * 3_600_000;
    for (const doc of documents) {
      if (new Date(doc.createdAt).getTime() < docCutoff) continue;

      const channelLabel =
        doc.sourceChannel === "email"    ? "email"    :
        doc.sourceChannel === "whatsapp" ? "WhatsApp" :
        doc.sourceChannel === "upload"   ? "upload"   : doc.sourceChannel;

      const ship = doc.shipmentId != null ? shipmentById.get(doc.shipmentId) : undefined;
      const subtitle = ship
        ? `${ship.poNumber} · ${ship.supplierName}`
        : doc.fileName;

      const href = doc.shipmentId != null
        ? `/?shipment=${doc.shipmentId}&tab=docs`
        : "/";

      items.push({
        id: `doc-${doc.id}`,
        type: "document",
        title: `Document received via ${channelLabel}`,
        subtitle,
        timestamp: doc.createdAt,
        href,
      });
    }

    // ── 4. Recently paid payments (within 7 days) ────────────────────────────
    const pmtCutoff = now - 7 * DAY;
    for (const ship of shipments) {
      for (const pmt of ship.payments) {
        if (!pmt.paidAt) continue;
        if (new Date(pmt.paidAt).getTime() < pmtCutoff) continue;

        items.push({
          id: `pmt-${pmt.id}`,
          type: "payment",
          title: `Payment recorded — $${pmt.amountUsd.toLocaleString()}`,
          subtitle: `${ship.poNumber} · ${ship.supplierName}`,
          timestamp: pmt.paidAt,
          href: `/orders`,
        });
      }
    }

    // ── 5. Payment due-date alerts (due soon or overdue) ─────────────────────
    const dueSoonWindow = now + 7 * DAY;
    for (const ship of shipments) {
      for (const pmt of ship.payments) {
        if (pmt.paidAt) continue; // already paid — skip
        const dueMs = new Date(pmt.dueDate).getTime();

        if (dueMs < now) {
          // Overdue
          const daysOverdue = Math.ceil((now - dueMs) / DAY);
          const label = daysOverdue === 1 ? "1 day ago" : `${daysOverdue} days ago`;
          items.push({
            id: `pmt-overdue-${pmt.id}`,
            type: "payment-overdue",
            title: `Overdue — $${pmt.amountUsd.toLocaleString()} was due ${label}`,
            subtitle: `${ship.poNumber} · ${ship.supplierName}`,
            timestamp: pmt.dueDate,
            href: `/orders?shipment=${ship.id}`,
          });
        } else if (dueMs <= dueSoonWindow) {
          // Due within 7 days
          const daysLeft = Math.ceil((dueMs - now) / DAY);
          const label = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
          items.push({
            id: `pmt-due-${pmt.id}`,
            type: "payment-due",
            title: `Balance due ${label} — $${pmt.amountUsd.toLocaleString()}`,
            subtitle: `${ship.poNumber} · ${ship.supplierName}`,
            timestamp: pmt.dueDate,
            href: `/orders?shipment=${ship.id}`,
          });
        }
      }
    }

    // Sort: overdue first, then due-soon, then the rest newest-first
    const urgencyScore = (item: NotificationItem): number => {
      if (item.type === "payment-overdue") return 2;
      if (item.type === "payment-due")     return 1;
      return 0;
    };
    items.sort((a, b) => {
      const ua = urgencyScore(a);
      const ub = urgencyScore(b);
      if (ua !== ub) return ub - ua;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return items.slice(0, 30);
  }, [messages, documents, shipments, stages, stageEventResults]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification row
// ─────────────────────────────────────────────────────────────────────────────
function NotifRow({
  item,
  isNew,
  onClick,
}: {
  item: NotificationItem;
  isNew: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors text-left"
    >
      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${notifBg(item.type)}`}>
        <NotifIconInner item={item} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug truncate ${isNew ? "font-semibold text-[#212833]" : "font-medium text-[#374151]"}`}>
          {item.title}
        </p>
        <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">{item.subtitle}</p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
        <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">
          {relativeAge(item.timestamp)}
        </span>
        {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF]" />}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bell button + popover panel
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [lastOpened, setLastOpenedState] = useState<Date>(() => getLastOpened());
  const [, navigate] = useLocation();

  const notifications = useNotifications();

  const newCount = notifications.filter(
    n => n.type === "payment-overdue" || new Date(n.timestamp).getTime() > lastOpened.getTime(),
  ).length;

  // Sync lastOpened across tabs via BroadcastChannel
  useEffect(() => {
    const bc = getChannel();
    if (!bc) return;
    bc.onmessage = (ev: MessageEvent<{ lastOpened: string }>) => {
      if (ev.data?.lastOpened) {
        setLastOpenedState(new Date(ev.data.lastOpened));
      }
    };
    return () => { bc.close(); };
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      const iso = persistLastOpened();
      setLastOpenedState(new Date(iso));
      const bc = getChannel();
      if (bc) {
        bc.postMessage({ lastOpened: iso });
        bc.close();
      }
    }
  }, []);

  const handleRowClick = useCallback((href: string) => {
    setOpen(false);
    navigate(href);
  }, [navigate]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8] transition-colors relative">
          <Bell className="w-4 h-4" />
          {newCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 p-0 shadow-lg border border-[#E5EAF0] rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F4F8]">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-[#5E687B]" />
            <span className="text-xs font-semibold text-[#212833]">Notifications</span>
            {newCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#9000FF] text-white min-w-[18px]">
                {newCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F0F4F8] text-[#9CA3AF] hover:text-[#374151] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
            <div className="w-10 h-10 rounded-full bg-[#F0F4F8] flex items-center justify-center">
              <Inbox className="w-5 h-5 text-[#C0C8D4]" />
            </div>
            <p className="text-xs font-medium text-[#374151]">You're all caught up</p>
            <p className="text-[11px] text-[#9CA3AF] text-center">
              No new activity in the last 7 days.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="divide-y divide-[#F0F4F8]">
              {notifications.map(item => (
                <NotifRow
                  key={item.id}
                  item={item}
                  isNew={
                    item.type === "payment-overdue" ||
                    new Date(item.timestamp).getTime() > lastOpened.getTime()
                  }
                  onClick={() => handleRowClick(item.href)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-[#F0F4F8] px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); navigate("/"); }}
              className="text-[11px] text-[#9000FF] hover:text-[#6000CC] font-medium transition-colors"
            >
              View all in inbox →
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
