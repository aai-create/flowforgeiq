/**
 * Today's Focus — Slideout Design Mockup
 *
 * Shows the redesigned My Orders (Atelier) page:
 *   • Left sidebar: no Today's Focus; only Filters + shipment list
 *   • No right AI pane; content fills full width
 *   • Top bar "Today's Focus" trigger (Zap icon + badge)
 *   • Slide-out drawer open from right edge (~340px) with:
 *       – human task items at top
 *       – "AI Suggestions" section (Sparkles + purple "AI" pill + dashed items)
 *
 * Access at: /__mockup/preview/flowforge/TodaysFocusSlideout
 */
import React, { useState } from "react";
import {
  Search, Bell, Layers, Filter, Sparkles, Zap,
  CheckCircle2, Circle, CalendarClock, AlertCircle,
  CreditCard, Clock, ChevronDown, ChevronRight,
  Plus, X, Hash, LayoutGrid, Inbox, ListTodo,
  ArrowRight, Wand2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const STAGES = [
  "Spec Sheet", "Factory Quotes", "Sample Order", "Sample Approval",
  "PO Issued", "Production", "QC Inspection", "Ex-Factory",
  "In Transit", "Payment Clearance", "Delivered",
];

type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Payment {
  label: string; percent: number; amountUsd: number;
  paid: boolean; dueDate: string;
}

interface Shipment {
  id: string; po: string; product: string; supplier: string;
  customer: string; status: ShipmentStatus; currentStage: string;
  dueDate: string; payments: [Payment, Payment];
}

const SHIPMENTS: Shipment[] = [
  {
    id: "s1", po: "PO-2026-0142", product: "Stainless Serving Fork — Brushed Nickel",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "at-risk", currentStage: "Sample Approval", dueDate: "May 17",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 3840, paid: true, dueDate: "Apr 02" },
      { label: "Balance (70%)", percent: 70, amountUsd: 8960, paid: false, dueDate: "May 15" },
    ],
  },
  {
    id: "s2", po: "PO-2026-0157", product: "LED Display Cabinet Light — Warm White",
    supplier: "Shenzhen LEDPro", customer: "Northbound Outfitters",
    status: "delayed", currentStage: "Production", dueDate: "May 18",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 5100, paid: true, dueDate: "Mar 28" },
      { label: "Balance (70%)", percent: 70, amountUsd: 11900, paid: false, dueDate: "May 18" },
    ],
  },
  {
    id: "s3", po: "PO-2026-0160", product: "Engineered Oak Flooring — Herringbone",
    supplier: "Hangzhou Timber Co.", customer: "Pioneer Goods Co.",
    status: "on-track", currentStage: "QC Inspection", dueDate: "May 22",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 9300, paid: true, dueDate: "Apr 10" },
      { label: "Balance (70%)", percent: 70, amountUsd: 21700, paid: false, dueDate: "May 22" },
    ],
  },
  {
    id: "s4", po: "PO-2026-0165", product: "Chrome Retail Hanger — Heavy Duty",
    supplier: "Tianjin Wire Works", customer: "Marlowe & Sons",
    status: "at-risk", currentStage: "Ex-Factory", dueDate: "Jun 02",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 1620, paid: true, dueDate: "Apr 18" },
      { label: "Balance (70%)", percent: 70, amountUsd: 3780, paid: false, dueDate: "Jun 02" },
    ],
  },
  {
    id: "s5", po: "PO-2026-0168", product: "Powder-Coat Grid Panel Display",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "on-track", currentStage: "Factory Quotes", dueDate: "Jun 10",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 2250, paid: false, dueDate: "Jun 01" },
      { label: "Balance (70%)", percent: 70, amountUsd: 5250, paid: false, dueDate: "Jun 25" },
    ],
  },
];

interface Task {
  id: string; title: string; source: string; sourceAge: string;
  urgency: "high" | "medium" | "low"; done: boolean;
}

const HUMAN_TASKS: Task[] = [
  { id: "t1", title: "Approve 2-day delay — Guangzhou Metalworks (PO-0142)", source: "WhatsApp", sourceAge: "2h ago", urgency: "high", done: false },
  { id: "t2", title: "Balance payment overdue — PO-0142 ($8,960 due May 15)", source: "Tracker", sourceAge: "Today", urgency: "high", done: false },
  { id: "t3", title: "Port congestion reply — Tianjin Wire Works (PO-0165)", source: "WhatsApp", sourceAge: "Yesterday", urgency: "high", done: false },
  { id: "t4", title: "Select factory quote — PO-0168 (Grid Panel Display)", source: "Sheets", sourceAge: "2d ago", urgency: "medium", done: true },
  { id: "t5", title: "Book QC inspection — Shenzhen LEDPro entering final assembly", source: "Gmail", sourceAge: "Yesterday", urgency: "medium", done: false },
];

interface AiSuggestion {
  id: string; text: string; shortLabel: string;
}

const AI_SUGGESTIONS: AiSuggestion[] = [
  { id: "a1", text: "Draft balance wire reminder for PO-0142 — Guangzhou Metalworks ($8,960 overdue)", shortLabel: "Draft wire reminder" },
  { id: "a2", text: "Follow up on QC pass for PO-0160 — Hangzhou Timber ready for balance wire ($21,700)", shortLabel: "Follow up QC pass" },
  { id: "a3", text: "Escalate port delay — Tianjin Wire Works congestion may push PO-0165 delivery by 4 days", shortLabel: "Escalate port delay" },
];

const CUSTOMERS = [
  { id: "c1", name: "Vellum Studio", count: 2 },
  { id: "c2", name: "Northbound Outfitters", count: 1 },
  { id: "c3", name: "Pioneer Goods Co.", count: 1 },
  { id: "c4", name: "Marlowe & Sons", count: 1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusCls = (s: ShipmentStatus) =>
  s === "on-track" ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : s === "delayed" ? "bg-red-50 text-red-700 border border-red-100"
      : "bg-amber-50 text-amber-700 border border-amber-100";

const urgencyDot = (u: Task["urgency"]) =>
  u === "high" ? "bg-red-500" : u === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]";

function stageIndex(stage: string) { return STAGES.indexOf(stage); }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function DrawerTaskItem({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <div className={`flex items-start gap-2 p-2 rounded-md border border-transparent hover:border-[#E5EAF0] hover:bg-[#FAFBFC] cursor-pointer transition-all ${task.done ? "opacity-50" : ""}`}>
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 shrink-0 transition-colors ${task.done ? "text-[#9000FF]" : "text-[#D6E3EB] hover:text-[#9000FF]"}`}
      >
        {task.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDot(task.urgency)}`} />
          <p className={`text-[12px] font-medium text-[#212833] leading-snug line-clamp-2 ${task.done ? "line-through text-[#5E687B]" : ""}`}>
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#5E687B] pl-3">
          <CalendarClock className="w-2.5 h-2.5" />
          <span>{task.source}</span>
          <span className="opacity-40">·</span>
          <span className={task.urgency === "high" && !task.done ? "text-red-500 font-semibold" : ""}>{task.sourceAge}</span>
        </div>
      </div>
    </div>
  );
}

function AiSuggestionItem({ suggestion }: { suggestion: AiSuggestion }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-dashed border-[#9000FF]/25 bg-[#9000FF]/[0.03] hover:bg-[#9000FF]/[0.06] cursor-pointer transition-all group">
      <div className="mt-0.5 shrink-0 w-4 h-4 rounded-full border border-dashed border-[#9000FF]/40 flex items-center justify-center">
        <Sparkles className="w-2.5 h-2.5 text-[#9000FF]/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#5E687B] leading-snug group-hover:text-[#212833] transition-colors">
          {suggestion.text}
        </p>
        <button className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#9000FF] hover:underline">
          {suggestion.shortLabel} <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function TodaysFocusSlideout() {
  const [tasks, setTasks] = useState<Task[]>(HUMAN_TASKS);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const toggleTask = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  const visibleShipments = SHIPMENTS.filter(s => {
    if (customerFilter && s.customer !== customerFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div
      className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex flex-col"
      style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}
    >

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-4 shrink-0 z-20 relative">
        {/* Logo + page */}
        <div className="flex items-center gap-2 w-[220px]">
          <div className="w-5 h-5 rounded-[4px] bg-[#9000FF] flex items-center justify-center">
            <Layers className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#9000FF]">flowforge</span>
          <span className="text-[#E5EAF0] mx-1">/</span>
          <span className="text-[#5E687B] font-medium text-xs">My Orders</span>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-center max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9FAE]" />
            <input
              type="text"
              placeholder="Search POs, suppliers, products…"
              className="w-full h-8 bg-[#F0F4F8] border border-transparent rounded-full pl-9 pr-4 text-xs outline-none placeholder:text-[#9E9FAE]"
            />
          </div>
        </div>

        {/* Right actions — including new Today's Focus trigger */}
        <div className="flex items-center gap-1.5 w-[220px] justify-end">
          {/* Today's Focus trigger — NEW */}
          <button
            onClick={() => setDrawerOpen(o => !o)}
            className={`relative flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all ${
              drawerOpen
                ? "bg-[#9000FF] text-white shadow-sm shadow-[#9000FF]/30"
                : "bg-[#F0F4F8] text-[#5E687B] hover:bg-[#E5EAF0] hover:text-[#212833]"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${drawerOpen ? "text-white" : "text-[#9000FF]"}`} />
            <span>Today's Focus</span>
            {pendingCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                drawerOpen ? "bg-white/20 text-white" : "bg-[#9000FF] text-white"
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
          </button>
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-[10px] font-bold">AX</div>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── LEFT SIDEBAR — Filters only (no Today's Focus) ─────────────── */}
        <div className="w-[220px] bg-[#F7F9FA] border-r border-[#E5EAF0] flex flex-col shrink-0 z-10">
          <ScrollArea className="flex-1">
            <div className="p-3">

              {/* Nav links */}
              <div className="space-y-0.5 mb-4">
                {[
                  { icon: Inbox, label: "Inbox", count: "5", active: false },
                  { icon: ListTodo, label: "Today", count: String(pendingCount), active: false },
                  { icon: LayoutGrid, label: "My Orders", count: String(SHIPMENTS.length), active: true },
                ].map(({ icon: Icon, label, count, active }) => (
                  <button key={label}
                    className={`w-full flex items-center justify-between px-2 h-8 rounded-md text-sm transition-colors ${
                      active ? "bg-[#E5EAF0] text-[#212833] font-semibold" : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"
                    }`}>
                    <span className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${active ? "text-[#9000FF]" : ""}`} />
                      {label}
                    </span>
                    {count && (
                      <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                        active ? "bg-[#9000FF] text-white" : "bg-[#E5EAF0] text-[#5E687B]"
                      }`}>{count}</span>
                    )}
                  </button>
                ))}
              </div>

              <Separator className="mb-3" />

              {/* Filters section */}
              <button
                onClick={() => setFiltersOpen(o => !o)}
                className="w-full px-2 mb-2 flex items-center justify-between group hover:bg-[#E5EAF0] rounded-md py-1 transition-colors"
              >
                <span className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase flex items-center gap-1.5">
                  <Filter className="w-3 h-3" /> Filters
                  {customerFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0" />}
                </span>
                {filtersOpen ? <ChevronDown className="w-3 h-3 text-[#9E9FAE]" /> : <ChevronRight className="w-3 h-3 text-[#9E9FAE]" />}
              </button>

              {filtersOpen && (
                <>
                  {/* Status filter */}
                  <div className="px-2 mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#9E9FAE] mb-1">Status</p>
                    <div className="space-y-0.5">
                      {(["all", "on-track", "at-risk", "delayed"] as const).map(s => (
                        <button key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                            statusFilter === s ? "bg-[#9000FF]/10 text-[#9000FF] font-semibold" : "text-[#5E687B] hover:bg-[#E5EAF0]"
                          }`}>
                          {s === "all" ? "All" : s === "on-track" ? "On Track" : s === "at-risk" ? "At Risk" : "Delayed"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buyer filter */}
                  <div className="px-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#9E9FAE] mb-1">Buyer</p>
                    <div className="space-y-0.5">
                      {CUSTOMERS.map(c => (
                        <button key={c.id}
                          onClick={() => setCustomerFilter(customerFilter === c.name ? null : c.name)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            customerFilter === c.name ? "bg-[#9000FF]/10 text-[#9000FF] font-semibold" : "text-[#5E687B] hover:bg-[#E5EAF0]"
                          }`}>
                          <span className="flex items-center gap-1.5 truncate">
                            <Hash className="w-3 h-3 opacity-40 shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="text-[9px] bg-[#E5EAF0] px-1.5 rounded shrink-0 ml-1 text-[#5E687B]">{c.count}</span>
                        </button>
                      ))}
                    </div>
                    {customerFilter && (
                      <button onClick={() => setCustomerFilter(null)}
                        className="mt-1 w-full text-[10px] text-[#9000FF] hover:underline flex items-center gap-1 px-2">
                        <X className="w-3 h-3" /> Clear filter
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── CENTER — Shipments grid (full width, no right AI pane) ──────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Sub-header */}
          <div className="h-11 border-b border-[#E5EAF0] flex items-center justify-between px-5 shrink-0 bg-[#FAFBFC]">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-[#212833]">My Orders</h1>
              <span className="text-[10px] text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-0.5 rounded-full">
                {visibleShipments.length} of {SHIPMENTS.length} POs
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(["all", "on-track", "at-risk", "delayed"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    statusFilter === s
                      ? s === "all" ? "bg-[#212833] text-white border-[#212833]"
                        : s === "on-track" ? "bg-emerald-500 text-white border-emerald-500"
                          : s === "at-risk" ? "bg-amber-500 text-white border-amber-500"
                            : "bg-red-500 text-white border-red-500"
                      : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#D6E3EB]"
                  }`}>
                  {s === "all" ? "All" : s === "on-track" ? "On Track" : s === "at-risk" ? "At Risk" : "Delayed"}
                </button>
              ))}
              <Separator orientation="vertical" className="h-4 mx-1" />
              <button className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-[#9000FF] hover:bg-[#7A00D9] px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> New PO
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-3">
              {visibleShipments.map(shipment => {
                const stageIdx = stageIndex(shipment.currentStage);
                const stagePct = STAGES.length > 1 ? (stageIdx / (STAGES.length - 1)) * 100 : 0;
                const overdueBal = !shipment.payments[1].paid && new Date(`${shipment.payments[1].dueDate} 2026`) < new Date();

                return (
                  <div key={shipment.id}
                    className="border border-[#E5EAF0] rounded-xl p-4 bg-white hover:border-[#D6E3EB] hover:shadow-sm transition-all cursor-pointer">

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border bg-[#FAFBFC] text-[#5E687B] border-[#E5EAF0]">
                            {shipment.po}
                          </span>
                          <span className="text-[10px] bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] px-1.5 py-0.5 rounded font-medium">
                            {shipment.customer}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#212833]">{shipment.product}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[11px] text-[#5E687B] flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-[#F0F4F8] flex items-center justify-center text-[9px] font-bold">
                            {shipment.supplier.charAt(0)}
                          </div>
                          {shipment.supplier}
                        </span>
                        <span className="text-[#D6E3EB]">·</span>
                        <div className="flex items-center gap-1 text-[10px] text-[#5E687B]">
                          <Clock className="w-3 h-3" />{shipment.dueDate}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls(shipment.status)}`}>
                          {shipment.status === "at-risk" ? "At Risk" : shipment.status === "delayed" ? "Delayed" : "On Track"}
                        </span>
                      </div>
                    </div>

                    {/* Stage timeline */}
                    <div className="relative py-3 mb-1">
                      <div className="absolute top-[18px] left-0 w-full h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${stagePct}%`,
                            background: shipment.status === "delayed" ? "#EF4444"
                              : shipment.status === "at-risk" ? "#F59E0B"
                                : "linear-gradient(to right, #9000FF, #B040FF)",
                          }} />
                      </div>
                      <div className="relative flex justify-between">
                        {STAGES.map((stage, idx) => {
                          const isPast = idx < stageIdx;
                          const isCurrent = idx === stageIdx;
                          return (
                            <div key={stage} className="flex flex-col items-center">
                              <div className={`w-2.5 h-2.5 rounded-full border-2 z-10 bg-white transition-all ${
                                isCurrent
                                  ? shipment.status === "delayed" ? "border-red-500 ring-4 ring-red-500/10"
                                    : shipment.status === "at-risk" ? "border-amber-500 ring-4 ring-amber-500/10"
                                      : "border-[#9000FF] ring-4 ring-[#9000FF]/10"
                                  : isPast
                                    ? shipment.status === "delayed" ? "border-red-400"
                                      : shipment.status === "at-risk" ? "border-amber-400"
                                        : "border-[#9000FF]"
                                    : "border-[#D6E3EB]"
                              }`} />
                              {isCurrent && (
                                <span className={`absolute top-6 text-[8px] font-bold whitespace-nowrap -translate-x-1/2 left-1/2 ${
                                  shipment.status === "delayed" ? "text-red-500"
                                    : shipment.status === "at-risk" ? "text-amber-600"
                                      : "text-[#9000FF]"
                                }`}>
                                  {stage}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stage boundary labels */}
                    <div className="flex justify-between text-[8px] text-[#9E9FAE] mb-3 px-0.5">
                      <span>{STAGES[0]}</span>
                      <span>{STAGES[Math.floor(STAGES.length / 2)]}</span>
                      <span>{STAGES[STAGES.length - 1]}</span>
                    </div>

                    {/* Payment chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {shipment.payments.map((p, i) => {
                        const od = !p.paid && new Date(`${p.dueDate} 2026`) < new Date();
                        return (
                          <div key={i} className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border ${
                            p.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : od ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"
                          }`}>
                            {p.paid ? <CheckCircle2 className="w-2.5 h-2.5" /> : od ? <AlertCircle className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                            {p.label}: ${p.amountUsd.toLocaleString()} {p.paid ? "paid" : od ? "OVERDUE" : `due ${p.dueDate}`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* ── TODAY'S FOCUS SLIDE-OUT DRAWER ──────────────────────────────── */}
        {/*
          Overlays the content from the right — does NOT push it.
          z-index sits above center content but below header.
        */}
        <div
          className={`absolute top-0 right-0 h-full w-[340px] bg-white border-l border-[#E5EAF0] shadow-xl flex flex-col z-10 transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Drawer header */}
          <div className="h-11 border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0 bg-[#FAFBFC]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#9000FF]" />
              <span className="font-semibold text-sm text-[#212833]">Today's Focus</span>
              <span className="text-[10px] font-bold bg-[#9000FF] text-white px-1.5 py-0.5 rounded-full leading-none">
                {pendingCount}
              </span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">

              {/* Done progress pill */}
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] text-[#5E687B]">
                  <span className="font-semibold text-emerald-600">{doneCount}</span> of {tasks.length} tasks done
                </span>
                <div className="w-24 h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${(doneCount / tasks.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Human tasks */}
              {tasks.map(task => (
                <DrawerTaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}

              {/* AI Suggestions divider */}
              <div className="pt-3 pb-1">
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 h-px bg-[#E5EAF0]" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3 h-3 text-[#9000FF]" />
                    <span className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase">AI Suggestions</span>
                    <span className="text-[9px] font-bold bg-[#9000FF] text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
                  </div>
                  <div className="flex-1 h-px bg-[#E5EAF0]" />
                </div>
                <p className="text-[10px] text-[#9E9FAE] text-center mt-1.5">
                  Generated by FlowForgeIQ · Tap to act
                </p>
              </div>

              {/* AI suggestion items */}
              <div className="space-y-2 pb-2">
                {AI_SUGGESTIONS.map(s => (
                  <AiSuggestionItem key={s.id} suggestion={s} />
                ))}
              </div>

              {/* "Generate more" hint */}
              <div className="pt-1 pb-3">
                <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-dashed border-[#9000FF]/20 text-[11px] text-[#9000FF]/70 hover:bg-[#9000FF]/[0.04] transition-colors">
                  <Wand2 className="w-3 h-3" />
                  Ask FlowForgeIQ for more suggestions
                </button>
              </div>

            </div>
          </ScrollArea>
        </div>

        {/* Scrim — subtle darkening when drawer is open */}
        {drawerOpen && (
          <div
            className="absolute inset-0 bg-[#212833]/5 z-[9] pointer-events-none"
            style={{ right: 340 }}
          />
        )}

      </div>
    </div>
  );
}

export default TodaysFocusSlideout;
