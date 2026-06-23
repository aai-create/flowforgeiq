/**
 * Variant C — Split Header
 * Each card has a two-cell header grid: Buyer PO + Supplier PO side-by-side.
 * Timeline bar moves below the header with milestone dots + short labels (no centre overlap).
 * Today's Focus lives in a collapsible right panel (toggle in toolbar).
 * AI panel is a slide-out drawer (same pattern as A/B).
 * Supplier name is explicitly labelled in the card header.
 */
import React, { useState } from "react";
import {
  Search, Plus, Zap, Sparkles, X, ChevronRight, ChevronLeft,
  CheckCircle2, Circle, AlertCircle, Send, MoreHorizontal,
  Inbox, LayoutGrid, Layers, Package, Mail, PanelRight,
} from "lucide-react";

type Status = "on-track" | "at-risk" | "delayed";
type Urgency = "high" | "medium" | "low";

interface PO {
  id: string;
  supplierPo: string;
  buyerPo: string;
  product: string;
  supplier: string;
  customer: string;
  status: Status;
  stage: string;
  stageIdx: number;
  eta: string;
  depPaid: boolean;
  balPaid: boolean;
  balOverdue: boolean;
  depAmt: number;
  balAmt: number;
}

interface Task {
  id: string;
  title: string;
  source: string;
  age: string;
  urgency: Urgency;
  done: boolean;
  poId: string;
}

interface Milestone {
  label: string;
  shortLabel: string;
  minIdx: number;
  maxIdx: number;
}

const MILESTONES: Milestone[] = [
  { label:"Factory Quote",  shortLabel:"Quote",  minIdx:0, maxIdx:1  },
  { label:"Production",     shortLabel:"Prod.",  minIdx:2, maxIdx:5  },
  { label:"Ex-Factory",     shortLabel:"Ship",   minIdx:6, maxIdx:8  },
  { label:"Delivered",      shortLabel:"Done",   minIdx:9, maxIdx:10 },
];

const POS: PO[] = [
  { id:"s1", supplierPo:"PO-0142", buyerPo:"BPO-2026-088", product:"Stainless Serving Fork — Brushed Nickel",  supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"at-risk",  stage:"Sample Approval", stageIdx:3, eta:"May 17", depPaid:true,  balPaid:false, balOverdue:true,  depAmt:3840,  balAmt:8960  },
  { id:"s2", supplierPo:"PO-0157", buyerPo:"BPO-2026-091", product:"LED Display Cabinet Light — Warm White",  supplier:"Shenzhen LEDPro",      customer:"Northbound Outfitters", status:"delayed",  stage:"Production",      stageIdx:5, eta:"May 18", depPaid:true,  balPaid:false, balOverdue:false, depAmt:5100,  balAmt:11900 },
  { id:"s3", supplierPo:"PO-0160", buyerPo:"BPO-2026-094", product:"Engineered Oak Flooring — Herringbone",   supplier:"Hangzhou Timber Co.",  customer:"Pioneer Goods Co.",     status:"on-track", stage:"QC Inspection",   stageIdx:6, eta:"May 22", depPaid:true,  balPaid:false, balOverdue:false, depAmt:9300,  balAmt:21700 },
  { id:"s4", supplierPo:"PO-0165", buyerPo:"BPO-2026-097", product:"Chrome Retail Hanger — Heavy Duty",       supplier:"Tianjin Wire Works",   customer:"Marlowe & Sons",        status:"at-risk",  stage:"Ex-Factory",      stageIdx:7, eta:"Jun 02", depPaid:true,  balPaid:false, balOverdue:false, depAmt:1620,  balAmt:3780  },
  { id:"s5", supplierPo:"PO-0168", buyerPo:"BPO-2026-101", product:"Powder-Coat Grid Panel Display",          supplier:"Guangzhou Metalworks", customer:"Vellum Studio",         status:"on-track", stage:"Factory Quotes",  stageIdx:1, eta:"Jun 10", depPaid:false, balPaid:false, balOverdue:false, depAmt:2250,  balAmt:5250  },
];

const TASKS: Task[] = [
  { id:"t1", title:"Approve 2-day delay — Guangzhou Metalworks (PO-0142)", source:"WhatsApp", age:"2h ago",    urgency:"high",   done:false, poId:"s1" },
  { id:"t2", title:"Balance payment overdue — PO-0142 ($8,960 due May 15)", source:"Tracker",  age:"Today",     urgency:"high",   done:false, poId:"s1" },
  { id:"t3", title:"Port congestion reply needed — Tianjin Wire Works",     source:"WhatsApp", age:"Yesterday", urgency:"high",   done:false, poId:"s4" },
  { id:"t4", title:"Select factory quote — PO-0168 (Grid Panel Display)",   source:"Sheets",   age:"2d ago",    urgency:"medium", done:false, poId:"s5" },
  { id:"t5", title:"Book QC inspection — Shenzhen LEDPro final assembly",   source:"Gmail",    age:"Yesterday", urgency:"medium", done:false, poId:"s2" },
  { id:"t6", title:"Arrange balance wire $21,700 — Hangzhou Timber",        source:"PDF/SGS",  age:"Mon",       urgency:"medium", done:false, poId:"s3" },
];

const AI_MESSAGES = [
  { role:"user" as const, text:"What's most urgent today?" },
  { role:"ai"   as const, text:"3 high-priority items need decisions before end of day: PO-0142 has an overdue balance ($8,960) plus a supplier delay request. PO-0165 has a 4-day port congestion delay pending approval. Want me to draft replies for both?" },
];

const getMilestoneState = (idx: number, m: Milestone): "done" | "active" | "upcoming" => {
  if (idx > m.maxIdx) return "done";
  if (idx >= m.minIdx) return "active";
  return "upcoming";
};

const statusPill = (s: Status) =>
  s === "delayed"  ? "bg-red-50 text-red-600 border border-red-100" :
  s === "at-risk"  ? "bg-amber-50 text-amber-600 border border-amber-100" :
                     "bg-emerald-50 text-emerald-600 border border-emerald-100";
const statusLabel = (s: Status) => s === "delayed" ? "Delayed" : s === "at-risk" ? "At Risk" : "On Track";
const urgencyDot = (u: Urgency) => u === "high" ? "bg-red-500" : u === "medium" ? "bg-amber-400" : "bg-gray-300";

export function OrdersLayoutC() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [tasks, setTasks] = useState(TASKS);
  const [focusPanelOpen, setFocusPanelOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiHistory, setAiHistory] = useState(AI_MESSAGES);

  const filtered = POS.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.supplierPo.toLowerCase().includes(q) || p.buyerPo.toLowerCase().includes(q) ||
             p.product.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingHigh = tasks.filter(t => t.urgency === "high" && !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  const toggleTask = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const sendAi = () => {
    if (!aiInput.trim()) return;
    setAiHistory(h => [...h,
      { role:"user" as const, text: aiInput.trim() },
      { role:"ai" as const, text:"Got it — drafting a response now." },
    ]);
    setAiInput("");
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAFBFC]" style={{ fontFamily:"Inter,sans-serif", fontSize:13 }}>

      {/* Nav Rail */}
      <div className="w-12 bg-white border-r border-[#E5EAF0] flex flex-col items-center py-3 gap-5 shrink-0">
        <div className="w-6 h-6 bg-[#9000FF] rounded-md flex items-center justify-center text-white font-bold text-[10px]">f</div>
        <Inbox size={16} className="text-[#5E687B]" />
        <LayoutGrid size={16} className="text-[#9000FF]" />
        <Layers size={16} className="text-[#5E687B]" />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-[#E5EAF0] flex items-center gap-2 px-4 shrink-0">
          <div className="flex items-center gap-1.5 flex-1 bg-[#F4F6FA] rounded-md px-2.5 py-1.5 max-w-xs">
            <Search size={13} className="text-[#9E9FAE] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search POs, suppliers…"
              className="bg-transparent outline-none text-[12px] text-[#212833] placeholder:text-[#9E9FAE] w-full" />
          </div>

          <div className="flex items-center gap-1 ml-2">
            {(["all","on-track","at-risk","delayed"] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors border ${
                  statusFilter === f
                    ? "bg-[#9000FF] text-white border-[#9000FF]"
                    : "bg-white text-[#5E687B] border-[#E5EAF0] hover:bg-[#F4F6FA]"
                }`}>
                {f === "all" ? "All" : f === "on-track" ? "On Track" : f === "at-risk" ? "At Risk" : "Delayed"}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* AI trigger */}
          <button onClick={() => setAiOpen(true)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#9000FF] bg-[#F5EEFF] hover:bg-[#EDD9FF] border border-[#E0C8FF] px-3 py-1.5 rounded-md">
            <Sparkles size={13} /> IQ Copilot
          </button>

          {/* Focus panel toggle */}
          <button onClick={() => setFocusPanelOpen(o => !o)}
            className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md border transition-colors ${
              focusPanelOpen ? "bg-[#9000FF] text-white border-[#9000FF]" : "bg-white text-[#5E687B] border-[#E5EAF0] hover:bg-[#F4F6FA]"
            }`}>
            <Zap size={12} />
            Focus
            {pendingHigh > 0 && !focusPanelOpen && (
              <span className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center bg-red-500 text-white">{pendingHigh}</span>
            )}
            {focusPanelOpen ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>

          <button className="flex items-center gap-1 text-[12px] font-medium text-white bg-[#9000FF] hover:bg-[#7700CC] px-3 py-1.5 rounded-md">
            <Plus size={13} /> New PO
          </button>
        </div>

        {/* Content row: cards + optional focus panel */}
        <div className="flex-1 flex min-h-0">

          {/* Card list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[#9E9FAE] text-sm">No POs match your filter</div>
            )}
            {filtered.map(po => {
              const expanded = expandedId === po.id;
              return (
                <div key={po.id}
                  onClick={() => setExpandedId(expanded ? null : po.id)}
                  className={`bg-white border rounded-xl overflow-hidden cursor-pointer transition-all ${
                    expanded ? "border-[#9000FF]/30 shadow-md shadow-[#9000FF]/5" : "border-[#E5EAF0] hover:border-[#D0D8E8] hover:shadow-sm"
                  }`}>

                  {/* Split header: two-cell PO grid */}
                  <div className="grid grid-cols-2 border-b border-[#F0F4F8]">
                    {/* Left cell: Buyer PO */}
                    <div className="px-3 py-2.5 border-r border-[#F0F4F8]">
                      <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-widest mb-0.5">Buyer PO</p>
                      <p className="text-[13px] font-bold text-[#212833] font-mono leading-tight">{po.buyerPo}</p>
                      <p className="text-[10px] text-[#5E687B] mt-0.5">{po.customer}</p>
                    </div>
                    {/* Right cell: Supplier PO */}
                    <div className="px-3 py-2.5">
                      <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-widest mb-0.5">Supplier PO</p>
                      <p className="text-[13px] font-semibold text-[#5E687B] font-mono leading-tight">{po.supplierPo}</p>
                      <p className="text-[10px] text-[#9E9FAE] mt-0.5">Supplier: <span className="text-[#5E687B] font-medium">{po.supplier}</span></p>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-3 pt-2.5 pb-3">
                    {/* Product + status + ETA */}
                    <div className="flex items-start gap-2 mb-2.5">
                      <p className="flex-1 font-semibold text-[#212833] text-[13px] leading-tight">{po.product}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${statusPill(po.status)}`}>
                        {statusLabel(po.status)}
                      </span>
                      <span className="text-[11px] text-[#5E687B] shrink-0 font-medium">ETA {po.eta}</span>
                    </div>

                    {/* Milestone timeline — dot-and-label, below header */}
                    <div className="mb-2.5">
                      <div className="flex items-center gap-0">
                        {MILESTONES.map((m, mi) => {
                          const state = getMilestoneState(po.stageIdx, m);
                          return (
                            <React.Fragment key={m.label}>
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                  state === "done"    ? "bg-[#9000FF] border-[#9000FF]" :
                                  state === "active"  ? "bg-white border-[#9000FF]" :
                                                        "bg-white border-[#D6DEE8]"
                                }`}>
                                  {state === "done" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  {state === "active" && <div className="w-1.5 h-1.5 rounded-full bg-[#9000FF]" />}
                                </div>
                                <span className={`text-[9px] font-medium whitespace-nowrap ${
                                  state === "active"  ? "text-[#9000FF]" :
                                  state === "done"    ? "text-[#9000FF]/60" :
                                                        "text-[#C0C8D4]"
                                }`}>{m.shortLabel}</span>
                              </div>
                              {mi < MILESTONES.length - 1 && (
                                <div className={`flex-1 h-[2px] mb-4 mx-1 rounded-full ${
                                  getMilestoneState(po.stageIdx, MILESTONES[mi + 1]) !== "upcoming" || state === "done"
                                    ? "bg-[#9000FF]" : "bg-[#E5EAF0]"
                                }`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-[#5E687B] mt-1">Current: <span className="font-medium text-[#212833]">{po.stage}</span></p>
                    </div>

                    {/* Payments row */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${po.depPaid ? "bg-emerald-50 text-emerald-700" : "bg-[#F4F6FA] text-[#5E687B]"}`}>
                        Deposit {po.depPaid ? "✓" : `$${po.depAmt.toLocaleString()}`}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        po.balPaid ? "bg-emerald-50 text-emerald-700" :
                        po.balOverdue ? "bg-red-50 text-red-600 font-semibold" :
                        "bg-[#F4F6FA] text-[#5E687B]"}`}>
                        Balance {po.balPaid ? "✓" : `$${po.balAmt.toLocaleString()}${po.balOverdue ? " · OVERDUE" : ""}`}
                      </span>
                      <div className="flex-1" />
                      <button onClick={e => { e.stopPropagation(); }} className="text-[#9E9FAE] hover:text-[#5E687B]">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded docs */}
                  {expanded && (
                    <div className="border-t border-[#F0F4F8] px-3 py-2.5 bg-[#FAFBFC] flex items-center gap-4">
                      <button className="text-[11px] text-[#9000FF] hover:underline flex items-center gap-1">
                        <Package size={11} /> Spec sheet
                      </button>
                      <button className="text-[11px] text-[#9000FF] hover:underline flex items-center gap-1">
                        <Mail size={11} /> Factory quotes
                      </button>
                      <div className="flex-1" />
                      <button className="text-[11px] font-medium text-[#9000FF] hover:underline">Advance stage →</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right panel — Today's Focus (collapsible) */}
          {focusPanelOpen && (
            <div className="w-[210px] shrink-0 border-l border-[#E5EAF0] bg-white flex flex-col">
              <div className="px-3 py-2.5 border-b border-[#E5EAF0] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E687B] flex items-center gap-1.5">
                  <Zap size={11} className="text-[#9000FF]" /> Today's Focus
                </span>
                {doneCount > 0 && (
                  <span className="text-[10px] text-emerald-500 font-medium">{doneCount}/{tasks.length}</span>
                )}
              </div>
              {pendingHigh > 0 && (
                <div className="mx-2 mt-2 p-2 bg-red-50 border border-red-100 rounded-md flex items-center gap-1.5">
                  <AlertCircle size={11} className="text-red-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-red-600">{pendingHigh} high priority</span>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {tasks.map(task => (
                  <div key={task.id}
                    className={`group flex items-start gap-1.5 p-1.5 rounded cursor-pointer hover:bg-[#F4F6FA] ${task.done ? "opacity-40" : ""}`}>
                    <button onClick={e => { e.stopPropagation(); toggleTask(task.id); }}
                      className={`mt-0.5 shrink-0 ${task.done ? "text-[#9000FF]" : "text-[#D6E3EB] hover:text-[#9000FF]"}`}>
                      {task.done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-start gap-1 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${urgencyDot(task.urgency)}`} />
                        <p className={`text-[11px] font-medium text-[#212833] leading-snug line-clamp-2 ${task.done ? "line-through" : ""}`}>{task.title}</p>
                      </div>
                      <p className="text-[10px] text-[#9E9FAE] pl-2.5">{task.source} · {task.age}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Slide-out Drawer */}
      {aiOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setAiOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[340px] bg-white border-l border-[#E5EAF0] shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5EAF0]">
              <span className="text-[13px] font-bold text-[#212833] flex items-center gap-2">
                <Sparkles size={14} className="text-[#9000FF]" /> FlowForge IQ
              </span>
              <button onClick={() => setAiOpen(false)} className="text-[#9E9FAE] hover:text-[#5E687B]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {aiHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] text-[12px] px-3 py-2 rounded-lg ${
                    m.role === "user" ? "bg-[#9000FF] text-white" : "bg-[#F4F6FA] text-[#212833]"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[#E5EAF0] flex items-center gap-2">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendAi()}
                placeholder="Ask anything about your orders…"
                className="flex-1 text-[12px] bg-[#F4F6FA] rounded-md px-2.5 py-1.5 outline-none border border-transparent focus:border-[#9000FF]/30" />
              <button onClick={sendAi} className="text-[#9000FF] hover:text-[#7700CC]">
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
