import React, { useState, useEffect } from "react";
import { useListShipments, useListStages, useListTasks, updateTask, updateShipment, useGetRiskRadar } from "@workspace/api-client-react";
import { adaptShipments, adaptStages, adaptTasks, type UiShipment, type UiStage, type UiTask } from "@/lib/adapters";
import {
  Search, Bell, Plus, Inbox, LayoutGrid,
  MessageCircle, Mail, FileText, CheckCircle2, Circle,
  Sparkles, AlertCircle, Clock, ChevronRight, Hash, X,
  Wand2, Send, Paperclip, MoreHorizontal, ChevronDown,
  DollarSign, CreditCard, CalendarClock, ListTodo, Zap,
  MapPin, Filter, SlidersHorizontal, Calendar, ShieldAlert, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Shared data (mirrors ConversationHub)
// ---------------------------------------------------------------------------
const STAGES = [
  "Spec Sheet", "Factory Quotes", "Sample Order", "Sample Approval",
  "PO Issued", "Production", "QC Inspection", "Ex-Factory",
  "In Transit", "Payment Clearance", "Delivered",
];

type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Payment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; }

interface Shipment {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; currentStage: string; dueDate: string;
  payments: [Payment, Payment];
}

const SHIPMENTS: Shipment[] = [
  {
    id: "s1", po: "PO-2026-0142", product: "Stainless Serving Fork — Brushed Nickel",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "at-risk", currentStage: "Sample Approval", dueDate: "May 17",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 3840,  paid: true,  dueDate: "Apr 02" },
      { label: "Balance (70%)", percent: 70, amountUsd: 8960,  paid: false, dueDate: "May 15" },
    ],
  },
  {
    id: "s2", po: "PO-2026-0157", product: "LED Display Cabinet Light — Warm White",
    supplier: "Shenzhen LEDPro", customer: "Northbound Outfitters",
    status: "delayed", currentStage: "Production", dueDate: "May 18",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 5100,  paid: true,  dueDate: "Mar 28" },
      { label: "Balance (70%)", percent: 70, amountUsd: 11900, paid: false, dueDate: "May 18" },
    ],
  },
  {
    id: "s3", po: "PO-2026-0160", product: "Engineered Oak Flooring — Herringbone",
    supplier: "Hangzhou Timber Co.", customer: "Pioneer Goods Co.",
    status: "on-track", currentStage: "QC Inspection", dueDate: "May 22",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 9300,  paid: true,  dueDate: "Apr 10" },
      { label: "Balance (70%)", percent: 70, amountUsd: 21700, paid: false, dueDate: "May 22" },
    ],
  },
  {
    id: "s4", po: "PO-2026-0165", product: "Chrome Retail Hanger — Heavy Duty",
    supplier: "Tianjin Wire Works", customer: "Marlowe & Sons",
    status: "at-risk", currentStage: "Ex-Factory", dueDate: "Jun 02",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 1620,  paid: true,  dueDate: "Apr 18" },
      { label: "Balance (70%)", percent: 70, amountUsd: 3780,  paid: false, dueDate: "Jun 02" },
    ],
  },
  {
    id: "s5", po: "PO-2026-0168", product: "Powder-Coat Grid Panel Display",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "on-track", currentStage: "Factory Quotes", dueDate: "Jun 10",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 2250,  paid: false, dueDate: "Jun 01" },
      { label: "Balance (70%)", percent: 70, amountUsd: 5250,  paid: false, dueDate: "Jun 25" },
    ],
  },
];

const CUSTOMERS = [
  { id: "c1", name: "Vellum Studio",         count: 2 },
  { id: "c2", name: "Northbound Outfitters", count: 1 },
  { id: "c3", name: "Pioneer Goods Co.",     count: 1 },
  { id: "c4", name: "Marlowe & Sons",        count: 1 },
];

interface Task {
  id: string; title: string; source: string; sourceAge: string;
  urgency: "high" | "medium" | "low"; done: boolean;
}

const INIT_TASKS: Task[] = [
  { id: "t1", title: "Approve 2-day delay — Guangzhou Metalworks (PO-0142)",      source: "WhatsApp",  sourceAge: "2h ago",    urgency: "high",   done: false },
  { id: "t2", title: "Balance payment overdue — PO-0142 ($8,960 due May 15)",    source: "Tracker",   sourceAge: "Today",     urgency: "high",   done: false },
  { id: "t3", title: "Port congestion reply needed — Tianjin Wire Works (PO-0165)", source: "WhatsApp", sourceAge: "Yesterday", urgency: "high",   done: false },
  { id: "t4", title: "Select factory quote — PO-0168 (Grid Panel Display)",       source: "Sheets",    sourceAge: "2d ago",    urgency: "medium", done: false },
  { id: "t5", title: "Book QC inspection — Shenzhen LEDPro entering final assembly", source: "Gmail",  sourceAge: "Yesterday", urgency: "medium", done: false },
  { id: "t6", title: "Arrange balance wire $21,700 — Hangzhou Timber (PO-0160)", source: "PDF / SGS", sourceAge: "Mon",       urgency: "medium", done: false },
];

// AI chat turns
const CHAT: { role: "user" | "ai"; text: React.ReactNode }[] = [
  { role: "user", text: "What's most urgent today?" },
  {
    role: "ai",
    text: (
      <span>
        <span className="font-semibold text-[#212833]">3 high-priority items</span> need decisions before end of day.
        <div className="mt-2 p-2 bg-[#FAFBFC] border border-[#E5EAF0] rounded-md space-y-1.5">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
            <span className="text-[11px]"><span className="font-medium text-[#212833]">PO-0142</span> — balance $8,960 overdue + supplier requesting 2d delay</span>
          </div>
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-[11px]"><span className="font-medium text-[#212833]">PO-0165</span> — Tianjin port congestion, 4d delay needs approval</span>
          </div>
        </div>
        <p className="mt-2 text-[12px]">Want me to draft replies for both?</p>
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusCls = (s: ShipmentStatus) =>
  s === "on-track" ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
  : s === "delayed"  ? "bg-red-50 text-red-700 border border-red-100"
  : "bg-amber-50 text-amber-700 border border-amber-100";

const urgencyDot = (u: Task["urgency"]) =>
  u === "high" ? "bg-red-500" : u === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]";

function stageIndex(stage: string) {
  return STAGES.indexOf(stage);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Atelier() {
  const { data: apiStages }    = useListStages();
  const { data: apiShipments } = useListShipments();
  const { data: apiTasks }     = useListTasks();
  const { data: radarData }    = useGetRiskRadar();
  const [shipments, setShipments] = useState<UiShipment[]>([]);
  const [stages, setStages] = useState<UiStage[]>([]);
  const [tasks, setTasks] = useState<UiTask[]>([]);
  useEffect(() => {
    if (!apiStages || !apiShipments) return;
    const adapted = adaptStages(apiStages);
    const ships = adaptShipments(apiShipments, adapted);
    setStages(adapted);
    setShipments(ships);
    if (apiTasks) setTasks(adaptTasks(apiTasks, ships));
  }, [apiStages, apiShipments, apiTasks]);

  const advanceStage = (shipmentId: string) => {
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return;
    const idx = stages.findIndex(st => st.id === target.currentStageId);
    const next = stages[Math.min(idx + 1, stages.length - 1)];
    if (!next || next.id === target.currentStageId) return;
    setShipments(prev => prev.map(s =>
      s.id === shipmentId ? { ...s, currentStageId: next.id, currentStage: next.label, status: "on-track" } : s,
    ));
    updateShipment(target.shipmentId, { currentStageId: next.id, status: "on-track" }).catch(() => {});
  };

  const riskByShipmentId = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const item of radarData?.items ?? []) {
      map.set(item.shipmentId, item.riskScore);
    }
    return map;
  }, [radarData]);

  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");

  const toggleTask = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const nextDone = !t.done;
    setTasks(prev => prev.map(x => x.id === id ? { ...x, done: nextDone } : x));
    updateTask(t.taskId, { done: nextDone }).catch(() => {});
  };

  const CUSTOMERS = (() => {
    const counts = new Map<string, number>();
    for (const s of shipments) counts.set(s.customer, (counts.get(s.customer) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, count], i) => ({ id: `c${i + 1}`, name, count }));
  })();

  const visibleShipments = shipments.filter(s => {
    if (customerFilter && s.customer !== customerFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const highCount  = tasks.filter(t => t.urgency === "high"   && !t.done).length;
  const doneCount  = tasks.filter(t => t.done).length;

  return (
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex flex-col" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      {/* TOP BAR */}
      <header className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 w-[260px]">
          <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
            <img src="/flowforge-logo.png" alt="FlowForge" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#9000FF]">flowforge</span>
          <span className="text-[#E5EAF0] mx-1">/</span>
          <span className="text-[#5E687B] font-medium text-xs">Command Center</span>
        </div>

        <div className="flex-1 flex justify-center max-w-lg">
          <div className="relative w-full group">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9000FF]" />
            <input type="text" placeholder="Ask FlowForge anything...  ⌘K"
              className="w-full h-8 bg-[#F0F4F8] hover:bg-[#E5EAF0] focus:bg-white border border-transparent focus:border-[#9000FF]/30 focus:ring-1 focus:ring-[#9000FF]/10 rounded-full pl-9 pr-4 text-xs outline-none transition-all placeholder:text-[#9E9FAE]" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-[260px] justify-end">
          <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8] transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
          </button>
          <Separator orientation="vertical" className="h-4" />
          <div className="w-7 h-7 rounded-md border border-[#E5EAF0] bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">AX</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANE — Nav + Tasks */}
        <div className="w-[268px] bg-[#F7F9FA] border-r border-[#E5EAF0] flex flex-col shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-3">

              {/* Nav links */}
              <div className="space-y-0.5 mb-5">
                {[
                  { icon: Inbox,       label: "Inbox",         count: "5",  active: false, href: null },
                  { icon: ListTodo,    label: "Today",         count: String(tasks.filter(t => !t.done).length), active: true, href: null },
                  { icon: LayoutGrid,  label: "All Shipments", count: String(shipments.length), active: false, href: null },
                  { icon: Calendar,    label: "Calendar",      count: null, active: false, href: null },
                  { icon: ShieldAlert, label: "Risk Radar",    count: radarData ? String(radarData.items.filter(i => i.riskScore >= 70).length) : null, active: false, href: `${import.meta.env.BASE_URL}risk-radar` },
                  { icon: BarChart3,  label: "Reports",       count: null, active: false, href: `${import.meta.env.BASE_URL}reports` },
                ].map(({ icon: Icon, label, count, active, href }) => (
                  <button key={label}
                    onClick={() => { if (href) window.location.assign(href); }}
                    className={`w-full flex items-center justify-between px-2 h-8 rounded-md text-sm transition-colors ${active ? "bg-[#E5EAF0] text-[#212833] font-semibold" : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                    <span className="flex items-center gap-2"><Icon className={`w-4 h-4 ${active ? "text-[#9000FF]" : label === "Risk Radar" ? "text-[#9000FF]" : ""}`} />{label}</span>
                    {count && (
                      <span className={`text-[10px] px-1.5 rounded-full font-bold ${active ? "bg-[#9000FF] text-white" : "bg-[#E5EAF0] text-[#5E687B]"}`}>{count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Customers */}
              <div className="mb-1.5 px-2 flex items-center justify-between group">
                <span className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase">Buyers</span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-[#E5EAF0] rounded">
                  <Plus className="w-3 h-3 text-[#5E687B]" />
                </button>
              </div>
              <div className="space-y-0.5 mb-5">
                {CUSTOMERS.map(c => (
                  <button key={c.id} onClick={() => setCustomerFilter(customerFilter === c.name ? null : c.name)}
                    className={`w-full group flex items-center justify-between px-2 h-7 rounded-md text-sm transition-colors ${customerFilter === c.name ? "bg-white border border-[#9000FF]/20 text-[#9000FF] font-semibold" : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"}`}>
                    <span className="flex items-center gap-1.5 truncate">
                      <Hash className="w-3 h-3 opacity-50 shrink-0" />
                      <span className="truncate text-xs">{c.name}</span>
                    </span>
                    <span className="text-[10px] bg-[#E5EAF0] px-1.5 rounded shrink-0 ml-1">{c.count}</span>
                  </button>
                ))}
                {customerFilter && (
                  <button onClick={() => setCustomerFilter(null)}
                    className="w-full text-[10px] text-[#9000FF] hover:underline flex items-center gap-1 px-2 mt-1">
                    <X className="w-3 h-3" /> Clear filter
                  </button>
                )}
              </div>

              <Separator className="mb-4" />

              {/* Task list */}
              <div className="px-2 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-[#5E687B] uppercase flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#9000FF]" /> Today's Focus
                </span>
                <span className="text-[9px] text-[#5E687B]">{doneCount}/{tasks.length} done</span>
              </div>

              <div className="space-y-1">
                {tasks.map(task => (
                  <div key={task.id}
                    className={`group flex items-start gap-2 p-2 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-[#E5EAF0] cursor-pointer transition-all ${task.done ? "opacity-50" : ""}`}>
                    <button onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 shrink-0 transition-colors ${task.done ? "text-[#9000FF]" : "text-[#D6E3EB] hover:text-[#9000FF]"}`}>
                      {task.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDot(task.urgency)}`} />
                        <p className={`text-[12px] font-medium text-[#212833] leading-snug line-clamp-2 ${task.done ? "line-through text-[#5E687B]" : ""}`}>{task.title}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#5E687B] pl-3">
                        <CalendarClock className="w-2.5 h-2.5" />
                        <span>{task.source}</span>
                        <span className="opacity-40">·</span>
                        <span className={task.urgency === "high" && !task.done ? "text-red-500 font-semibold" : ""}>{task.sourceAge}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* CENTER PANE — Shipment Command Horizon */}
        <div className="flex-1 bg-white flex flex-col min-w-0">
          <div className="h-12 border-b border-[#E5EAF0] flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-[#212833]">Command Horizon</h1>
              <span className="text-[10px] text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-0.5 rounded-full">
                {visibleShipments.length} of {shipments.length} POs
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Status filter chips */}
              {(["all", "on-track", "at-risk", "delayed"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${statusFilter === s
                    ? s === "all" ? "bg-[#212833] text-white border-[#212833]"
                      : s === "on-track" ? "bg-emerald-500 text-white border-emerald-500"
                      : s === "at-risk"  ? "bg-amber-500 text-white border-amber-500"
                      : "bg-red-500 text-white border-red-500"
                    : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#D6E3EB]"
                  }`}>
                  {s === "all" ? "All" : s === "on-track" ? "On Track" : s === "at-risk" ? "At Risk" : "Delayed"}
                </button>
              ))}
              <Separator orientation="vertical" className="h-5 mx-1" />
              <button className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-[#9000FF] hover:bg-[#7A00D9] px-3 py-1.5 rounded-md transition-colors">
                <Plus className="w-3.5 h-3.5" /> New PO
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-4">
              {visibleShipments.map(shipment => {
                const stageIdx  = stageIndex(shipment.currentStage);
                const stagePct  = STAGES.length > 1 ? (stageIdx / (STAGES.length - 1)) * 100 : 0;
                const isActive  = activeShipmentId === shipment.id;
                const balanceOverdue = !shipment.payments[1].paid && new Date(`${shipment.payments[1].dueDate} 2026`) < new Date();

                return (
                  <div key={shipment.id}
                    onClick={() => setActiveShipmentId(isActive ? null : shipment.id)}
                    className={`border rounded-xl p-4 transition-all cursor-pointer ${isActive ? "border-[#9000FF]/30 shadow-md bg-[#FAFBFF]" : "border-[#E5EAF0] bg-white hover:border-[#D6E3EB] hover:shadow-sm"}`}>

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${isActive ? "bg-[#9000FF]/10 text-[#9000FF] border-[#9000FF]/20" : "bg-[#FAFBFC] text-[#5E687B] border-[#E5EAF0]"}`}>
                              {shipment.po}
                            </span>
                            <span className="text-[10px] bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] px-1.5 py-0.5 rounded font-medium">
                              {shipment.customer}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[#212833]">{shipment.product}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5E687B]">
                          <div className="w-4 h-4 rounded bg-[#F0F4F8] flex items-center justify-center text-[9px] font-bold text-[#5E687B]">
                            {shipment.supplier.charAt(0)}
                          </div>
                          {shipment.supplier}
                        </div>
                        <span className="text-[#D6E3EB]">·</span>
                        <div className="flex items-center gap-1 text-[10px] text-[#5E687B]">
                          <Clock className="w-3 h-3" />{shipment.dueDate}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls(shipment.status)}`}>
                          {shipment.status === "at-risk" ? "At Risk" : shipment.status === "delayed" ? "Delayed" : "On Track"}
                        </span>
                        {riskByShipmentId.has(shipment.shipmentId) && (() => {
                          const score = riskByShipmentId.get(shipment.shipmentId)!;
                          return (
                            <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${score >= 70 ? "bg-red-50 text-red-600 border-red-100" : score >= 45 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                              <ShieldAlert className="w-2.5 h-2.5" />{score}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Visual stage timeline */}
                    <div className="relative py-3 mb-3">
                      {/* Track */}
                      <div className="absolute top-[18px] left-0 w-full h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${stagePct}%`,
                            background: shipment.status === "delayed" ? "#EF4444"
                              : shipment.status === "at-risk" ? "#F59E0B"
                              : "linear-gradient(to right, #9000FF, #B040FF)"
                          }} />
                      </div>

                      {/* Stage dots */}
                      <div className="relative flex justify-between">
                        {STAGES.map((stage, idx) => {
                          const isPast    = idx < stageIdx;
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
                                    : "border-[#D6E3EB]"}`}
                              />
                              {isCurrent && (
                                <span className={`absolute top-6 text-[8px] font-bold whitespace-nowrap -translate-x-1/2 left-1/2 ${
                                  shipment.status === "delayed" ? "text-red-500"
                                  : shipment.status === "at-risk" ? "text-amber-600"
                                  : "text-[#9000FF]"}`}>
                                  {stage}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stage labels — compact, only boundaries */}
                    <div className="flex justify-between text-[8px] text-[#9E9FAE] mb-3 px-0.5">
                      <span>{STAGES[0]}</span>
                      <span>{STAGES[Math.floor(STAGES.length / 2)]}</span>
                      <span>{STAGES[STAGES.length - 1]}</span>
                    </div>

                    {/* Payment chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {shipment.payments.map((p, i) => {
                        const overdue = !p.paid && new Date(`${p.dueDate} 2026`) < new Date();
                        return (
                          <div key={i} className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full border ${
                            p.paid   ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : overdue ? "bg-red-50 text-red-600 border-red-100 animate-pulse"
                            : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                            {p.paid ? <CheckCircle2 className="w-2.5 h-2.5" /> : overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                            {p.label}: ${p.amountUsd.toLocaleString()} {p.paid ? "paid" : overdue ? "OVERDUE" : `due ${p.dueDate}`}
                          </div>
                        );
                      })}

                      {/* Next stage hint */}
                      {stageIdx < STAGES.length - 1 && (
                        <div className="ml-auto flex items-center gap-1 text-[9px] text-[#9E9FAE]">
                          <span>Next:</span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="font-medium text-[#5E687B]">{STAGES[stageIdx + 1]}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded detail row */}
                    {isActive && (
                      <div className="mt-3 pt-3 border-t border-[#E5EAF0] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button className="text-[10px] bg-[#9000FF] text-white px-3 py-1.5 rounded-md font-semibold hover:bg-[#7A00D9] transition-colors flex items-center gap-1.5">
                            <MessageCircle className="w-3 h-3" /> Open Threads
                          </button>
                          <button className="text-[10px] bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md font-medium hover:bg-[#F0F4F8] transition-colors flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> View Docs
                          </button>
                          <button onClick={()=>advanceStage(shipment.id)} className="text-[10px] bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md font-medium hover:bg-[#F0F4F8] transition-colors flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" /> Advance Stage
                          </button>
                        </div>
                        <button className="text-[#5E687B] hover:text-[#212833] p-1"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANE — FlowForge AI */}
        <div className="w-[340px] bg-white border-l border-[#E5EAF0] flex flex-col shrink-0">
          <div className="h-12 border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0 bg-[#FAFBFC]">
            <div className="flex items-center gap-2 text-[#9000FF]">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">FlowForge AI</span>
            </div>
            <button className="h-7 w-7 flex items-center justify-center rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 bg-gradient-to-b from-[#FAFBFC] to-white">
            <div className="p-4 space-y-4">

              {/* Briefing card */}
              <div className="bg-white border border-[#E5EAF0] shadow-sm rounded-xl p-3.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#9000FF] rounded-l-xl" />
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-3.5 h-3.5 text-[#9000FF]" />
                  <span className="text-[10px] font-bold text-[#212833] uppercase tracking-wider">Daily Briefing — May 15</span>
                </div>
                <p className="text-[12px] text-[#5E687B] leading-relaxed">
                  <span className="font-semibold text-red-500">2 overdue items</span> across 5 active POs.{" "}
                  <span className="font-medium text-[#212833]">PO-0142</span> balance of $8,960 missed its due date and Guangzhou is requesting a delay.{" "}
                  <span className="font-medium text-[#212833]">PO-0160</span> QC has passed — balance wire of $21,700 needed to release the container.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button className="text-[9px] bg-[#9000FF] text-white px-2.5 py-1 rounded-full font-semibold hover:bg-[#7A00D9] transition-colors">
                    Draft all replies
                  </button>
                  <button className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-2.5 py-1 rounded-full font-medium hover:bg-[#E5EAF0] transition-colors">
                    Show payment plan
                  </button>
                </div>
              </div>

              {/* Chat history */}
              {CHAT.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                      <Sparkles className="w-3 h-3 text-[#9000FF]" />
                    </div>
                  )}
                  <div className={`max-w-[88%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#F0F4F8] text-[#212833] rounded-tr-sm"
                      : "bg-white border border-[#E5EAF0] shadow-sm text-[#212833] rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Action chips */}
              <div className="flex flex-wrap gap-2 ml-8">
                {["Draft reply to Guangzhou", "Approve Tianjin delay", "Initiate wire $21,700", "Show PO-0168 quotes"].map(c => (
                  <button key={c} className="text-[9px] bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/15 transition-colors font-semibold">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* AI input */}
          <div className="p-3 bg-white border-t border-[#E5EAF0]">
            <div className="flex items-center bg-[#F0F4F8] rounded-xl border border-transparent focus-within:border-[#9000FF]/30 focus-within:bg-white transition-colors">
              <button className="h-9 w-9 flex items-center justify-center shrink-0 text-[#5E687B] hover:text-[#212833]">
                <Paperclip className="w-4 h-4" />
              </button>
              <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
                placeholder="Ask about a shipment, supplier..."
                className="flex-1 bg-transparent text-xs h-10 focus:outline-none placeholder:text-[#A0ABB8]" />
              <button className={`h-7 w-7 rounded-lg mr-1 shrink-0 flex items-center justify-center transition-colors ${aiInput.trim() ? "bg-[#9000FF] hover:bg-[#7A00D9]" : "bg-[#E5EAF0]"}`}>
                <Send className={`w-3.5 h-3.5 ${aiInput.trim() ? "text-white" : "text-[#9E9FAE]"}`} />
              </button>
            </div>
            <div className="mt-1.5 text-center">
              <span className="text-[9px] text-[#A0ABB8]">
                Press <kbd className="font-mono bg-[#F0F4F8] px-1 rounded border border-[#E5EAF0]">⌘</kbd> + <kbd className="font-mono bg-[#F0F4F8] px-1 rounded border border-[#E5EAF0]">K</kbd> to open command bar
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
