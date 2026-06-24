import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useCopilotHint } from "@/lib/CopilotContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListShipments,
  useListStages,
  useListMessages,
  useGetRiskRadar,
  useListBuyers,
  useUpdateBuyer,
  getListBuyersQueryKey,
} from "@workspace/api-client-react";
import type { Shipment, Stage, BuyerSummary } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search, Package, X, ArrowRight, Users,
  ChevronRight, AlertTriangle, MessageCircle,
  Mail, MessageSquare, User, Phone, Globe,
  Check, Pencil, DollarSign, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { shortDate } from "@/lib/adapters";

const statusCls = (status: string) =>
  status === "on-track"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : status === "delayed"
    ? "bg-red-50 text-red-700 border border-red-100"
    : "bg-amber-50 text-amber-700 border border-amber-100";

type SortCol = "name" | "activePOs" | "atRisk" | "spend" | "onTime";
type SortDir = "asc" | "desc";

interface BuyerWithStats extends BuyerSummary {
  activePOs: number;
  atRiskCount: number;
  totalSpendUsd: number;
  onTimePct: number | null;
  spendThisYearUsd: number;
  shipments: Shipment[];
}

const CURRENT_YEAR = new Date().getUTCFullYear();

function buildBuyerStats(buyers: BuyerSummary[], shipments: Shipment[]): BuyerWithStats[] {
  return buyers.map(buyer => {
    const all = shipments.filter(s => s.buyerId != null ? s.buyerId === buyer.id : s.customerName === buyer.name);
    const active = all.filter(s => s.status !== "delivered");
    const atRisk = active.filter(s => s.status === "delayed" || s.status === "at-risk");
    const shipmentSpend = (s: Shipment) =>
      s.payments.reduce((acc, p) => acc + p.amountUsd, 0);
    const totalSpendUsd = all.reduce((sum, s) => sum + shipmentSpend(s), 0);
    const onCount = all.filter(s => s.status === "on-track").length;
    const onTimePct = all.length > 0 ? Math.round((onCount / all.length) * 100) : null;
    const spendThisYearUsd = all
      .filter(s => new Date(s.dueDate).getUTCFullYear() === CURRENT_YEAR)
      .reduce((sum, s) => sum + shipmentSpend(s), 0);
    return { ...buyer, activePOs: active.length, atRiskCount: atRisk.length, totalSpendUsd, onTimePct, spendThisYearUsd, shipments: all };
  });
}

function fmtUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Inline-editable field (mirrors SupplierDetailPanel's EditableField)
// ---------------------------------------------------------------------------
interface EditableFieldProps {
  label: string;
  value: string;
  icon: React.ElementType;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  onSave: (val: string) => void;
}

function EditableField({ label, value, icon: Icon, placeholder, type = "text", onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); setDraft(value); }
  }

  return (
    <div className="group">
      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="flex-1 h-7 text-[12px] px-2 border border-[#9000FF]/40 rounded-md outline-none focus:ring-1 focus:ring-[#9000FF]/20 bg-white text-[#212833]"
          />
          <button onClick={commit} className="text-[#9000FF] hover:text-[#7A00D9]">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setDraft(value); }} className="text-[#9E9FAE] hover:text-[#5E687B]">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="w-full flex items-center justify-between h-7 px-2 rounded-md border border-transparent hover:border-[#E5EAF0] hover:bg-[#FAFBFC] text-left transition-colors"
        >
          <span className={`text-[12px] truncate ${value ? "text-[#212833]" : "text-[#9E9FAE] italic"}`}>
            {value || placeholder || "—"}
          </span>
          <Pencil className="w-3 h-3 text-[#9E9FAE] opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buyer detail panel
// ---------------------------------------------------------------------------
interface DetailPanelProps {
  buyer: BuyerWithStats;
  stages: Stage[];
  onClose: () => void;
  onFieldSave: (field: "contactName" | "email" | "phone" | "region", value: string) => void;
}

function BuyerDetailPanel({ buyer, stages, onClose, onFieldSave }: DetailPanelProps) {
  const [, navigate] = useLocation();
  const { data: messagesData } = useListMessages();
  const now = useMemo(() => new Date(), []);

  const stageLabel = useMemo(() => {
    const map = new Map(stages.map(st => [st.id, st.label]));
    return (id: string) => map.get(id) ?? id;
  }, [stages]);

  const active = useMemo(
    () =>
      buyer.shipments
        .filter(s => s.status !== "delivered")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [buyer.shipments],
  );

  const recent = useMemo(
    () =>
      buyer.shipments
        .filter(s => s.status === "delivered")
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 3),
    [buyer.shipments],
  );

  const buyerShipmentIds = useMemo(
    () => new Set(buyer.shipments.map(s => s.id)),
    [buyer.shipments],
  );

  const recentMessages = useMemo(() => {
    if (!messagesData) return [];
    return messagesData
      .filter(m => m.shipmentId != null && buyerShipmentIds.has(m.shipmentId))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 5);
  }, [messagesData, buyerShipmentIds]);

  const channelIcon = (ch: string) => {
    if (ch === "whatsapp") return <MessageCircle className="w-3 h-3 text-emerald-500 shrink-0" />;
    if (ch === "email" || ch === "gmail") return <Mail className="w-3 h-3 text-blue-500 shrink-0" />;
    return <MessageSquare className="w-3 h-3 text-[#9E9FAE] shrink-0" />;
  };

  return (
    <div className="w-[360px] border-l border-[#E5EAF0] bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9000FF]/10 to-[#9000FF]/20 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-[#9000FF]" />
          </div>
          <span className="text-sm font-semibold text-[#212833] truncate">{buyer.name}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-[#9E9FAE] hover:text-[#212833] hover:bg-[#F0F4F8] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3">
              <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1">Active POs</div>
              <div className="text-xl font-bold text-[#212833]">{active.length}</div>
            </div>
            <div className={`border rounded-lg p-3 ${buyer.atRiskCount > 0 ? "bg-red-50 border-red-100" : "bg-[#FAFBFC] border-[#E5EAF0]"}`}>
              <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1">At Risk</div>
              <div className={`text-xl font-bold ${buyer.atRiskCount > 0 ? "text-red-600" : "text-[#9E9FAE]"}`}>
                {buyer.atRiskCount}
              </div>
            </div>
            <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3">
              <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1">Spend This Year</div>
              <div className="text-xl font-bold text-[#212833]">
                {buyer.spendThisYearUsd > 0 ? fmtUsd(buyer.spendThisYearUsd) : <span className="text-[#9E9FAE]">—</span>}
              </div>
            </div>
            <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3">
              <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1">On-Time %</div>
              <div className={`text-xl font-bold ${
                buyer.onTimePct === null ? "text-[#9E9FAE]"
                : buyer.onTimePct >= 70 ? "text-emerald-600"
                : buyer.onTimePct >= 40 ? "text-amber-600"
                : "text-red-600"
              }`}>
                {buyer.onTimePct !== null ? `${buyer.onTimePct}%` : "—"}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact details — editable inline, persisted via API */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-3">Contact Details</div>
            <div className="space-y-3">
              <EditableField
                label="Contact Name"
                value={buyer.contactName ?? ""}
                icon={User}
                placeholder="Add contact name"
                onSave={v => onFieldSave("contactName", v)}
              />
              <EditableField
                label="Email"
                value={buyer.email ?? ""}
                icon={Mail}
                placeholder="Add email address"
                type="email"
                onSave={v => onFieldSave("email", v)}
              />
              <EditableField
                label="Phone"
                value={buyer.phone ?? ""}
                icon={Phone}
                placeholder="Add phone number"
                type="tel"
                onSave={v => onFieldSave("phone", v)}
              />
              <EditableField
                label="Region"
                value={buyer.region ?? ""}
                icon={Globe}
                placeholder="e.g. North America"
                onSave={v => onFieldSave("region", v)}
              />
            </div>
          </div>

          <Separator />

          {/* Active shipments */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-2 flex items-center gap-1.5">
              <Package className="w-3 h-3" />
              Active POs
              <span className="text-[#9E9FAE] font-normal">({active.length})</span>
            </div>
            {active.length === 0 ? (
              <p className="text-xs text-[#9E9FAE]">No active purchase orders.</p>
            ) : (
              <div className="space-y-1.5">
                {active.map(s => {
                  const days = Math.ceil((new Date(s.dueDate).getTime() - now.getTime()) / 86_400_000);
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col gap-1.5 p-2 rounded-lg border border-[#E5EAF0] hover:border-[#9000FF]/30 hover:bg-[#FAFBFC] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="font-mono text-[10px] text-[#5E687B] bg-[#F0F4F8] px-1.5 py-0.5 rounded">
                            {s.poNumber}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusCls(s.status)}`}>
                            {s.status === "on-track" ? "On Track" : s.status === "delayed" ? "Delayed" : "At Risk"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#212833] font-medium truncate">{s.product}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[#7A00D9] bg-[#9000FF]/8 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                            {stageLabel(s.currentStageId)}
                          </span>
                          <span className="text-[10px] text-[#9E9FAE]">
                            Due {shortDate(s.dueDate)}{days < 0 ? ` · ${Math.abs(days)}d late` : days <= 7 ? ` · ${days}d` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/inbox?shipment=${s.id}`)}
                          className="flex items-center gap-1 text-[10px] font-medium text-white bg-[#9000FF] hover:bg-[#7A00D9] px-2 py-0.5 rounded-full transition-colors"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                          Inbox
                        </button>
                        <button
                          onClick={() => navigate(`/orders?po=${encodeURIComponent(s.poNumber)}`)}
                          className="flex items-center gap-1 text-[10px] font-medium text-[#5E687B] bg-[#F0F4F8] hover:bg-[#E5EAF0] px-2 py-0.5 rounded-full transition-colors"
                        >
                          <Package className="w-2.5 h-2.5" />
                          Orders
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {recent.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-2">Recent POs</div>
                <div className="space-y-1">
                  {recent.map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#FAFBFC] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] text-[#5E687B] truncate block">{s.product}</span>
                        <span className="text-[10px] text-[#9E9FAE]">{shortDate(s.dueDate)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => navigate(`/inbox?shipment=${s.id}`)}
                          className="flex items-center gap-1 text-[10px] font-medium text-white bg-[#9000FF] hover:bg-[#7A00D9] px-2 py-0.5 rounded-full transition-colors"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                          Inbox
                        </button>
                        <button
                          onClick={() => navigate(`/orders?po=${encodeURIComponent(s.poNumber)}`)}
                          className="flex items-center gap-1 text-[10px] font-medium text-[#5E687B] bg-[#F0F4F8] hover:bg-[#E5EAF0] px-2 py-0.5 rounded-full transition-colors"
                        >
                          <Package className="w-2.5 h-2.5" />
                          Orders
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {recentMessages.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B]">Recent Messages</div>
                  <button
                    onClick={() => navigate(`/inbox?buyerId=${buyer.id}`)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#9000FF] hover:text-[#7000CC] transition-colors"
                  >
                    View all in Inbox
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentMessages.map(m => (
                    <button
                      key={m.id}
                      onClick={() => m.shipmentId != null && navigate(`/inbox?shipment=${m.shipmentId}`)}
                      className="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-[#FAFBFC] group transition-colors"
                    >
                      {channelIcon(m.channel)}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#212833] truncate">{m.subject || m.snippet || "—"}</p>
                        <p className="text-[10px] text-[#9E9FAE]">{shortDate(m.receivedAt)}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function Buyers() {
  useCopilotHint("Browse buyers and their active orders", [
    "Which buyer has the most at-risk orders?",
    "Show me all active POs for Marlowe & Sons",
    "Which buyers have delayed shipments?",
  ]);

  const queryClient = useQueryClient();
  const { data: buyersData } = useListBuyers();
  const { data: shipmentsData } = useListShipments();
  const { data: stagesData } = useListStages();
  const { data: radarData } = useGetRiskRadar();
  const updateBuyer = useUpdateBuyer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBuyersQueryKey() });
      },
    },
  });

  const rawBuyers: BuyerSummary[] = buyersData ?? [];
  const shipments: Shipment[] = shipmentsData ?? [];
  const stages: Stage[] = stagesData ?? [];

  const buyers = useMemo(() => buildBuyerStats(rawBuyers, shipments), [rawBuyers, shipments]);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = !q ? buyers : buyers.filter(b => b.name.toLowerCase().includes(q));
    const mul = sortDir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      if (sortCol === "name") return mul * a.name.localeCompare(b.name);
      if (sortCol === "activePOs") return mul * (a.activePOs - b.activePOs);
      if (sortCol === "atRisk") return mul * (a.atRiskCount - b.atRiskCount);
      if (sortCol === "spend") return mul * (a.totalSpendUsd - b.totalSpendUsd);
      if (sortCol === "onTime") return mul * ((a.onTimePct ?? -1) - (b.onTimePct ?? -1));
      return 0;
    });
  }, [buyers, search, sortCol, sortDir]);

  const selectedBuyer = buyers.find(b => b.id === selectedId) ?? null;

  function handleFieldSave(buyerId: number, field: "contactName" | "email" | "phone" | "region", value: string) {
    updateBuyer.mutate({ id: buyerId, data: { [field]: value || null } });
  }

  function SortableHeader({ label, col }: { label: string; col: SortCol }) {
    const active = sortCol === col;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        onClick={() => handleSort(col)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#5E687B] hover:text-[#212833] transition-colors group"
      >
        {label}
        <Icon className={`w-3 h-3 transition-colors ${active ? "text-[#9000FF]" : "text-[#9E9FAE] group-hover:text-[#5E687B]"}`} />
      </button>
    );
  }

  return (
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex flex-col" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <GlobalHeader breadcrumb="Buyers" />

      <div className="flex-1 flex overflow-hidden">
        <NavSidebar
          showBrand={false}
          counts={{
            riskRadar: radarData ? radarData.items.filter(i => i.riskScore >= 70).length : null,
          }}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Toolbar */}
              <div className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-5 shrink-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-sm font-bold text-[#212833]">Buyers</h1>
                  <span className="text-[10px] text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-0.5 rounded-full">
                    {filtered.length} of {buyers.length}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9FAE]" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search buyers…"
                    className="h-8 pl-8 pr-3 text-[12px] bg-[#F0F4F8] border border-transparent focus:border-[#9000FF]/30 focus:bg-white rounded-md outline-none w-52 transition-all placeholder:text-[#9E9FAE]"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9E9FAE] hover:text-[#5E687B]">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                  <ScrollArea className="flex-1">
                    <div className="min-w-[640px]">
                      {/* Table header */}
                      <div className="sticky top-0 z-10 bg-[#F7F9FA] border-b border-[#E5EAF0] grid grid-cols-[2fr_1fr_1fr_1.2fr_1fr_auto] px-5 py-2">
                        <SortableHeader label="Buyer" col="name" />
                        <SortableHeader label="Active POs" col="activePOs" />
                        <SortableHeader label="At Risk" col="atRisk" />
                        <SortableHeader label="Total Spend" col="spend" />
                        <SortableHeader label="On-Time %" col="onTime" />
                        <span />
                      </div>

                      {/* Rows */}
                      {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Users className="w-8 h-8 text-[#D6E3EB] mb-3" />
                          <p className="text-sm text-[#5E687B] font-medium">No buyers found</p>
                          <p className="text-xs text-[#9E9FAE] mt-1">Try adjusting your search.</p>
                        </div>
                      ) : (
                        filtered.map(b => {
                          const isSelected = selectedId === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedId(isSelected ? null : b.id)}
                              className={`grid grid-cols-[2fr_1fr_1fr_1.2fr_1fr_auto] px-5 py-3 border-b border-[#F0F4F8] cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-[#9000FF]/5 border-l-2 border-l-[#9000FF]"
                                  : "hover:bg-[#FAFBFC]"
                              }`}
                            >
                              {/* Name */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9000FF]/10 to-[#9000FF]/20 flex items-center justify-center text-[#9000FF] font-bold text-[10px] shrink-0">
                                  {b.name.slice(0, 2).toUpperCase()}
                                </div>
                                <p className="text-[13px] font-semibold text-[#212833] truncate">{b.name}</p>
                              </div>

                              {/* Active POs */}
                              <div className="flex items-center">
                                {b.activePOs > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#212833]">
                                    <Package className="w-3 h-3 text-[#9000FF]" />
                                    {b.activePOs}
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#9E9FAE]">—</span>
                                )}
                              </div>

                              {/* At risk */}
                              <div className="flex items-center">
                                {b.atRiskCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    {b.atRiskCount}
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-emerald-600 font-medium">—</span>
                                )}
                              </div>

                              {/* Total Spend */}
                              <div className="flex items-center">
                                {b.totalSpendUsd > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#212833]">
                                    <DollarSign className="w-3 h-3 text-[#9000FF]" />
                                    {fmtUsd(b.totalSpendUsd)}
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#9E9FAE]">—</span>
                                )}
                              </div>

                              {/* On-Time % */}
                              <div className="flex items-center">
                                {b.onTimePct !== null ? (
                                  <span className={`text-[12px] font-semibold ${
                                    b.onTimePct >= 70 ? "text-emerald-600"
                                    : b.onTimePct >= 40 ? "text-amber-600"
                                    : "text-red-600"
                                  }`}>
                                    {b.onTimePct}%
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-[#9E9FAE]">—</span>
                                )}
                              </div>

                              {/* Chevron */}
                              <div className="flex items-center pl-2">
                                <ChevronRight className={`w-3.5 h-3.5 text-[#9000FF] transition-transform ${isSelected ? "opacity-100" : "opacity-0"}`} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Detail panel */}
                {selectedBuyer && (
                  <BuyerDetailPanel
                    buyer={selectedBuyer}
                    stages={stages}
                    onClose={() => setSelectedId(null)}
                    onFieldSave={(field, value) => handleFieldSave(selectedBuyer.id, field, value)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
