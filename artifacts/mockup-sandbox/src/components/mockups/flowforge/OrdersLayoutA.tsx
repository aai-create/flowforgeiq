/**
 * Variant A — Right-Rail Focus
 * Two-column layout: cards fill left, slim right rail holds Today's Focus.
 * AI panel is a slide-out drawer triggered by a toolbar icon.
 * Cards are compact by default; secondary metadata collapsed behind "···".
 * Supplier explicitly labelled; Buyer PO on its own row beneath Supplier PO.
 * Milestone bar uses friendly plain-English labels with no centre overlap.
 */
import React, { useState } from "react";
import {
  Search, Plus, Zap, Sparkles, X, ChevronRight, MoreHorizontal,
  CheckCircle2, Circle, AlertCircle, Send, ChevronDown,
  Layers, Mail, Inbox, LayoutGrid, Filter, Package,
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

const MILESTONES = ["Quote", "Production", "Shipped", "Done"];

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

const stageBarWidth = (idx: number) => `${Math.round((idx / 10) * 100)}%`;
const stageLabel = (idx: number) => idx <= 1 ? "Quote" : idx <= 5 ? "Production" : idx <= 7 ? "Shipped" : "Done";
const milestoneActive = (idx: number, label: string) =>
  (label === "Quote" && idx <= 1) || (label === "Production" && idx > 1 && idx <= 5) ||
  (label === "Shipped" && idx > 5 && idx <= 7) || (label === "Done" && idx > 7);

const statusPill = (s: Status) =>
  s === "delayed"  ? "bg-red-50 text-red-600 border border-red-100" :
  s === "at-risk"  ? "bg-amber-50 text-amber-600 border border-amber-100" :
                     "bg-emerald-50 text-emerald-600 border border-emerald-100";
const statusLabel = (s: Status) => s === "delayed" ? "Delayed" : s === "at-risk" ? "At Risk" : "On Track";
const urgencyDot = (u: Urgency) => u === "high" ? "bg-red-500" : u === "medium" ? "bg-amber-400" : "bg-gray-300";

export function OrdersLayoutA() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [tasks, setTasks] = useState(TASKS);
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

  const doneCount = tasks.filter(t => t.done).length;
  const highCount = tasks.filter(t => t.urgency === "high" && !t.done).length;

  const toggleTask = (id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const sendAi = () => {
    if (!aiInput.trim()) return;
    setAiHistory(h => [...h, { role:"user", text: aiInput.trim() }, { role:"ai", text:"Got it — I'll look into that and draft a response." }]);
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

      {/* Main area: toolbar + card list */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-[#E5EAF0] flex items-center gap-2 px-4 shrink-0">
          <div className="flex items-center gap-1.5 flex-1 bg-[#F4F6FA] rounded-md px-2.5 py-1.5 max-w-xs">
            <Search size={13} className="text-[#9E9FAE] shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search POs, products, suppliers…"
              className="bg-transparent outline-none text-[12px] text-[#212833] placeholder:text-[#9E9FAE] w-full"
            />
          </div>

          {/* Status filter chips */}
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
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#9000FF] bg-[#F5EEFF] hover:bg-[#EDD9FF] border border-[#E0C8FF] px-3 py-1.5 rounded-md transition-colors">
            <Sparkles size={13} />
            IQ Copilot
          </button>

          <button className="ml-1 flex items-center gap-1 text-[12px] font-medium text-white bg-[#9000FF] hover:bg-[#7700CC] px-3 py-1.5 rounded-md">
            <Plus size={13} /> New PO
          </button>
        </div>

        {/* Card list + Right rail */}
        <div className="flex-1 flex min-h-0">

          {/* Card list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[#9E9FAE] text-sm">No POs match your filter</div>
            )}
            {filtered.map(po => {
              const expanded = expandedId === po.id;
              const active = activeId === po.id;
              const currentMilestone = stageLabel(po.stageIdx);
              return (
                <div key={po.id}
                  onClick={() => { setActiveId(po.id); setExpandedId(expanded ? null : po.id); }}
                  className={`bg-white border rounded-lg cursor-pointer transition-all ${
                    active ? "border-[#9000FF]/40 shadow-md shadow-[#9000FF]/10" : "border-[#E5EAF0] hover:border-[#9000FF]/20 hover:shadow-sm"
                  }`}>

                  {/* Card header — always visible */}
                  <div className="p-3">
                    {/* Row 1: status badge + product name + eta + more */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${statusPill(po.status)}`}>
                        {statusLabel(po.status)}
                      </span>
                      <p className="flex-1 font-semibold text-[#212833] text-[13px] leading-tight">{po.product}</p>
                      <span className="text-[11px] text-[#5E687B] shrink-0">ETA {po.eta}</span>
                      <button onClick={e => { e.stopPropagation(); }} className="text-[#9E9FAE] hover:text-[#5E687B] shrink-0">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>

                    {/* Row 2: Supplier PO + Buyer PO, stacked with labels */}
                    <div className="flex items-center gap-4 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-[#9E9FAE] uppercase tracking-wide">Supplier PO</span>
                        <span className="text-[12px] font-semibold text-[#212833] font-mono">{po.supplierPo}</span>
                      </div>
                      <div className="w-px h-3 bg-[#E5EAF0]" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-[#9E9FAE] uppercase tracking-wide">Buyer PO</span>
                        <span className="text-[12px] font-semibold text-[#5E687B] font-mono">{po.buyerPo}</span>
                      </div>
                      <div className="w-px h-3 bg-[#E5EAF0]" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-[#9E9FAE] uppercase tracking-wide">Supplier</span>
                        <span className="text-[12px] text-[#5E687B]">{po.supplier}</span>
                      </div>
                    </div>

                    {/* Milestone bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        {MILESTONES.map(m => (
                          <span key={m} className={`text-[10px] font-medium ${milestoneActive(po.stageIdx, m) ? "text-[#9000FF]" : "text-[#C0C8D4]"}`}>
                            {m}
                          </span>
                        ))}
                      </div>
                      <div className="h-1.5 bg-[#F0F4F8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#9000FF] rounded-full transition-all"
                          style={{ width: stageBarWidth(po.stageIdx) }} />
                      </div>
                      <p className="text-[10px] text-[#5E687B] mt-1">{po.stage}</p>
                    </div>

                    {/* Payment pills */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${po.depPaid ? "bg-emerald-50 text-emerald-700" : "bg-[#F4F6FA] text-[#5E687B]"}`}>
                        Deposit 30% {po.depPaid ? "✓" : `$${po.depAmt.toLocaleString()}`}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${po.balPaid ? "bg-emerald-50 text-emerald-700" : po.balOverdue ? "bg-red-50 text-red-600" : "bg-[#F4F6FA] text-[#5E687B]"}`}>
                        Balance 70% {po.balPaid ? "✓" : `$${po.balAmt.toLocaleString()}${po.balOverdue ? " · OVERDUE" : ""}`}
                      </span>
                      <div className="flex-1" />
                      <button onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : po.id); }}
                        className="text-[11px] text-[#5E687B] hover:text-[#9000FF] flex items-center gap-1">
                        <MoreHorizontal size={12} />
                        {expanded ? "less" : "more"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded section */}
                  {expanded && (
                    <div className="border-t border-[#F0F4F8] px-3 py-2.5 bg-[#FAFBFC] rounded-b-lg">
                      <div className="flex items-center gap-6 text-[11px] text-[#5E687B]">
                        <span>Customer: <strong className="text-[#212833]">{po.customer}</strong></span>
                        <span>Stage: <strong className="text-[#212833]">{po.stage}</strong></span>
                        <button className="ml-auto text-[#9000FF] hover:underline flex items-center gap-1">
                          <Package size={11} /> Spec sheet
                        </button>
                        <button className="text-[#9000FF] hover:underline flex items-center gap-1">
                          <Mail size={11} /> Factory quotes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right rail — Today's Focus */}
          <div className="w-[220px] shrink-0 border-l border-[#E5EAF0] bg-white flex flex-col">
            <div className="px-3 py-2.5 border-b border-[#E5EAF0] flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E687B] flex items-center gap-1.5">
                <Zap size={11} className="text-[#9000FF]" /> Today's Focus
              </span>
              {doneCount > 0 && (
                <span className="text-[10px] text-emerald-500 font-medium">{doneCount}/{tasks.length}</span>
              )}
            </div>
            {highCount > 0 && (
              <div className="mx-2 mt-2 p-2 bg-red-50 border border-red-100 rounded-md flex items-center gap-1.5">
                <AlertCircle size={11} className="text-red-500 shrink-0" />
                <span className="text-[10px] font-semibold text-red-600">{highCount} high priority</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {tasks.map(task => (
                <div key={task.id}
                  onClick={() => setActiveId(task.poId)}
                  className={`group flex items-start gap-1.5 p-1.5 rounded cursor-pointer hover:bg-[#F4F6FA] transition-colors ${task.done ? "opacity-40" : ""}`}>
                  <button onClick={e => { e.stopPropagation(); toggleTask(task.id); }}
                    className={`mt-0.5 shrink-0 ${task.done ? "text-[#9000FF]" : "text-[#D6E3EB] hover:text-[#9000FF]"}`}>
                    {task.done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDot(task.urgency)}`} />
                      <p className={`text-[11px] font-medium text-[#212833] leading-snug line-clamp-2 ${task.done ? "line-through" : ""}`}>{task.title}</p>
                    </div>
                    <p className="text-[10px] text-[#9E9FAE] pl-2.5">{task.source} · {task.age}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
