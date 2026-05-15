import React, { useState, useRef, useEffect } from "react";
import {
  Mail, MessageCircle, FileText, Sparkles, Wand2, Search,
  Bell, ChevronDown, Check, AlertCircle, Clock, MoreHorizontal,
  Paperclip, Send, ArrowRight, Home, Inbox, FileBox, Users, Settings, Filter,
  MapPin, LayoutGrid, MessagesSquare, X, CheckCircle2, Zap, ChevronRight,
  GripVertical, Plus, Trash2, DollarSign, CreditCard, CalendarClock,
  ChevronUp, ListTodo, SlidersHorizontal,
} from "lucide-react";
import { Atelier } from "./Atelier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ViewMode = "inbox" | "command";
type Channel = "gmail" | "whatsapp" | "sheets" | "pdf";
type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Stage { id: string; label: string; }

interface Payment { label: string; percent: number; amountUsd: number; paid: boolean; dueDate: string; }

interface FactoryQuote {
  factory: string; country: string; unitPrice: number; leadDays: number; moq: number; selected: boolean;
}

interface Shipment {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; currentStageId: string; dueDate: string;
  payments: [Payment, Payment];
  quotes?: FactoryQuote[];
}

interface Message {
  id: string; sender: string; channel: Channel; timestamp: string;
  snippet: string; fullBody: string; unread: boolean; aiTags: string[];
  shipmentId: string; supplierId: string;
  aiDraft?: string; aiAction?: string;
}

interface Task {
  id: string; title: string; source: string; sourceAge: string;
  urgency: "high" | "medium" | "low"; shipmentId: string; messageId?: string;
  action: string;
}

// ---------------------------------------------------------------------------
// Default configurable stages (real sourcing workflow)
// ---------------------------------------------------------------------------
const DEFAULT_STAGES: Stage[] = [
  { id: "spec",       label: "Spec Sheet"       },
  { id: "quotes",     label: "Factory Quotes"   },
  { id: "sample_ord", label: "Sample Order"     },
  { id: "sample_apr", label: "Sample Approval"  },
  { id: "po_issued",  label: "PO Issued"        },
  { id: "production", label: "Production"       },
  { id: "qc",         label: "QC Inspection"    },
  { id: "ex_factory", label: "Ex-Factory"       },
  { id: "in_transit", label: "In Transit"       },
  { id: "payment",    label: "Payment Clearance"},
  { id: "delivered",  label: "Delivered"        },
];

// ---------------------------------------------------------------------------
// Static mock data (using real sourcing stages)
// ---------------------------------------------------------------------------
const INIT_SHIPMENTS: Shipment[] = [
  {
    id: "s1", po: "PO-2026-0142", product: "Stainless Serving Fork — Brushed Nickel",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "at-risk", currentStageId: "sample_apr", dueDate: "May 17",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 3840, paid: true,  dueDate: "Apr 02" },
      { label: "Balance (70%)", percent: 70, amountUsd: 8960, paid: false, dueDate: "May 15" },
    ],
    quotes: [
      { factory: "Guangzhou Metalworks", country: "CN", unitPrice: 0.88, leadDays: 28, moq: 500,  selected: true  },
      { factory: "Foshan Precision Parts", country: "CN", unitPrice: 0.93, leadDays: 32, moq: 1000, selected: false },
      { factory: "Ningbo Alloy Co.",       country: "CN", unitPrice: 0.91, leadDays: 25, moq: 2000, selected: false },
    ],
  },
  {
    id: "s2", po: "PO-2026-0157", product: "LED Display Cabinet Light — Warm White",
    supplier: "Shenzhen LEDPro", customer: "Northbound Outfitters",
    status: "delayed", currentStageId: "production", dueDate: "May 18",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 5100, paid: true,  dueDate: "Mar 28" },
      { label: "Balance (70%)", percent: 70, amountUsd: 11900, paid: false, dueDate: "May 18" },
    ],
    quotes: [
      { factory: "Shenzhen LEDPro",     country: "CN", unitPrice: 4.20, leadDays: 35, moq: 200,  selected: true  },
      { factory: "Dongguan BrightTech", country: "CN", unitPrice: 4.45, leadDays: 30, moq: 500,  selected: false },
      { factory: "Foshan LightMaster",  country: "CN", unitPrice: 4.15, leadDays: 42, moq: 1000, selected: false },
    ],
  },
  {
    id: "s3", po: "PO-2026-0160", product: "Engineered Oak Flooring — Herringbone",
    supplier: "Hangzhou Timber Co.", customer: "Pioneer Goods Co.",
    status: "on-track", currentStageId: "qc", dueDate: "May 22",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 9300, paid: true,  dueDate: "Apr 10" },
      { label: "Balance (70%)", percent: 70, amountUsd: 21700, paid: false, dueDate: "May 22" },
    ],
  },
  {
    id: "s4", po: "PO-2026-0165", product: "Chrome Retail Hanger — Heavy Duty",
    supplier: "Tianjin Wire Works", customer: "Marlowe & Sons",
    status: "at-risk", currentStageId: "ex_factory", dueDate: "Jun 02",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 1620, paid: true,  dueDate: "Apr 18" },
      { label: "Balance (70%)", percent: 70, amountUsd: 3780, paid: false, dueDate: "Jun 02" },
    ],
  },
  {
    id: "s5", po: "PO-2026-0168", product: "Powder-Coat Grid Panel Display",
    supplier: "Guangzhou Metalworks", customer: "Vellum Studio",
    status: "on-track", currentStageId: "quotes", dueDate: "Jun 10",
    payments: [
      { label: "Deposit (30%)", percent: 30, amountUsd: 2250, paid: false, dueDate: "Jun 01" },
      { label: "Balance (70%)", percent: 70, amountUsd: 5250, paid: false, dueDate: "Jun 25" },
    ],
    quotes: [
      { factory: "Guangzhou Metalworks",  country: "CN", unitPrice: 6.40, leadDays: 30, moq: 200, selected: false },
      { factory: "Foshan Grid Factory",   country: "CN", unitPrice: 6.10, leadDays: 35, moq: 500, selected: true  },
      { factory: "Ningbo Display Parts",  country: "CN", unitPrice: 6.75, leadDays: 28, moq: 100, selected: false },
    ],
  },
];

const INIT_MESSAGES: Message[] = [
  {
    id: "m1", sender: "Guangzhou Metalworks", channel: "whatsapp", timestamp: "10:42 AM",
    snippet: "Strike-off for placement print needs +2 days, mill backed up. Please advise.",
    fullBody: "Hi team, quick update. The sample approval finish coat needs +2 days — our polishing line is backed up. Please advise if we can proceed. If we push this, Ex-Factory moves to May 17.",
    unread: true, aiTags: ["risk: delay 2d", "milestone: sample approval"], shipmentId: "s1", supplierId: "Guangzhou Metalworks",
    aiDraft: "Understood — please proceed with the delay. We'll update PO-2026-0142 ex-factory to May 17. Please confirm revised schedule in writing.",
    aiAction: "Approve delay and update PO-2026-0142 timeline",
  },
  {
    id: "m2", sender: "Shenzhen LEDPro", channel: "gmail", timestamp: "Yesterday",
    snippet: "Production update: PCB soldering complete, entering housing assembly. On track for May 18.",
    fullBody: "Hello,\n\nProduction update on PO-2026-0157. PCB soldering is complete and units are now entering housing assembly. We are currently on track for May 18 ex-factory.\n\nBalance payment of $11,900 will be due before release.\n\nBest,\nDavid Chen",
    unread: false, aiTags: ["milestone: production", "payment: balance due"], shipmentId: "s2", supplierId: "Shenzhen LEDPro",
    aiDraft: "Thanks David — noted on progress. Please send final QC photos before ex-factory release. We'll arrange balance wire transfer once inspection passes.",
    aiAction: "Acknowledge update and schedule QC inspection",
  },
  {
    id: "m3", sender: "Tianjin Wire Works", channel: "whatsapp", timestamp: "Yesterday",
    snippet: "Port congestion at Tianjin — export delay 4 days. Revised ex-factory June 6.",
    fullBody: "Hi! Heads up — major port congestion at Tianjin terminal. Our freight forwarder has revised our export slot by 4 days. New ex-factory date: June 6. Please advise Marlowe & Sons and update their expected delivery.",
    unread: true, aiTags: ["risk: port congestion", "delay: 4d"], shipmentId: "s4", supplierId: "Tianjin Wire Works",
    aiDraft: "Hi — understood on the Tianjin congestion. Please send revised packing schedule. We'll notify Marlowe & Sons and update the tracker accordingly.",
    aiAction: "Approve 4-day delay and notify Marlowe & Sons",
  },
  {
    id: "m4", sender: "Cost Sheet — PO-0168", channel: "sheets", timestamp: "Tue",
    snippet: "Cell D18 updated: Grid panel unit price revised to $6.10 (Foshan quote selected). Margin: 34.2%",
    fullBody: "Automated update from Google Sheets — Costing Tracker:\nCell D18 updated: Grid panel unit price $6.10 (Foshan Grid Factory selected).\nSelling price: $9.25. Margin: 34.2%.\nTotal PO value: $7,500 (1,250 units).",
    unread: false, aiTags: ["update: quote selected", "margin: 34.2%"], shipmentId: "s5", supplierId: "Guangzhou Metalworks",
    aiDraft: "",
    aiAction: "Acknowledge quote selection and issue deposit invoice",
  },
  {
    id: "m5", sender: "Hangzhou Timber Co.", channel: "pdf", timestamp: "Mon",
    snippet: "QC inspection passed — 840 sqm, AQL 2.5. SGS report attached. Ex-factory cleared May 22.",
    fullBody: "Please find attached the SGS inspection report.\n\nQC result: PASSED\nAQL 2.5 standard · 840 sqm inspected · 2 minor defects · 0 major\nEx-factory date confirmed: May 22, 2026.\n\nBalance payment of $21,700 required before container release.",
    unread: false, aiTags: ["milestone: QC passed", "payment: balance due"], shipmentId: "s3", supplierId: "Hangzhou Timber Co.",
    aiDraft: "Thank you — SGS report received and QC pass confirmed. We will arrange balance wire of $21,700 by May 20. Please send commercial invoice and packing list.",
    aiAction: "Confirm QC pass and schedule balance payment",
  },
];

const INIT_TASKS: Task[] = [
  { id: "t1", title: "Approve 2-day delay — Guangzhou Metalworks (PO-0142)", source: "WhatsApp · Guangzhou Metalworks", sourceAge: "2h ago", urgency: "high", shipmentId: "s1", messageId: "m1", action: "Reply & Update" },
  { id: "t2", title: "Balance payment overdue — PO-2026-0142 ($8,960) was due May 15", source: "Payment tracker", sourceAge: "Today", urgency: "high", shipmentId: "s1", action: "Send Payment" },
  { id: "t3", title: "Port congestion reply needed — Tianjin Wire Works (PO-0165)", source: "WhatsApp · Tianjin Wire Works", sourceAge: "Yesterday", urgency: "high", shipmentId: "s4", messageId: "m3", action: "Reply" },
  { id: "t4", title: "Select factory quote — PO-2026-0168 (Grid Panel Display)", source: "Costing Sheet update", sourceAge: "2d ago", urgency: "medium", shipmentId: "s5", messageId: "m4", action: "Review Quotes" },
  { id: "t5", title: "Schedule QC inspection — Shenzhen LEDPro entering final assembly", source: "Gmail · Shenzhen LEDPro", sourceAge: "Yesterday", urgency: "medium", shipmentId: "s2", messageId: "m2", action: "Book Inspection" },
  { id: "t6", title: "Arrange balance wire $21,700 — Hangzhou Timber (PO-0160)", source: "PDF · SGS Report", sourceAge: "Mon", urgency: "medium", shipmentId: "s3", messageId: "m5", action: "Initiate Wire" },
];

const SUPPLIERS = [
  { id: "Guangzhou Metalworks",  label: "Guangzhou Metalworks",  count: 4 },
  { id: "Shenzhen LEDPro",       label: "Shenzhen LEDPro",        count: 2 },
  { id: "Tianjin Wire Works",    label: "Tianjin Wire Works",     count: 2 },
  { id: "Hangzhou Timber Co.",   label: "Hangzhou Timber Co.",    count: 1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const chIcon = (ch: Channel, sz = 12) => {
  if (ch === "whatsapp") return <MessageCircle size={sz} className="text-emerald-500" />;
  if (ch === "gmail")    return <Mail size={sz} className="text-blue-500" />;
  if (ch === "sheets")   return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  );
  return <FileText size={sz} className="text-red-500" />;
};

const statusCls = (s: ShipmentStatus) =>
  s === "on-track" ? "bg-emerald-50 text-emerald-700 border-emerald-100"
  : s === "delayed"  ? "bg-red-50 text-red-700 border-red-100"
  : "bg-amber-50 text-amber-700 border-amber-100";

const urgencyCls = (u: Task["urgency"]) =>
  u === "high"   ? "bg-red-50 text-red-600 border-red-100"
  : u === "medium" ? "bg-amber-50 text-amber-600 border-amber-100"
  : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";

// ---------------------------------------------------------------------------
// ViewSwitcher (draggable)
// ---------------------------------------------------------------------------
function ViewSwitcher({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  const [pos, setPos] = useState({ x: window.innerWidth - 330, y: window.innerHeight - 60 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }; setDragging(true); };
  useEffect(() => {
    if (!dragging) return;
    const mv = (e: MouseEvent) => setPos({ x: Math.max(0, Math.min(window.innerWidth - (ref.current?.offsetWidth ?? 260), e.clientX - offset.current.x)), y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offset.current.y)) });
    const up = () => setDragging(false);
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [dragging]);
  return (
    <div ref={ref} style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, userSelect: "none" }}
      className="bg-white border border-[#E5EAF0] rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] p-1 flex items-center gap-0.5">
      <div onMouseDown={onMouseDown} className="pl-2 pr-1 flex items-center cursor-grab active:cursor-grabbing text-[#C0C8D4] hover:text-[#9000FF] transition-colors" title="Drag to reposition">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2.5" cy="3" r="1.3"/><circle cx="7.5" cy="3" r="1.3"/><circle cx="2.5" cy="7" r="1.3"/><circle cx="7.5" cy="7" r="1.3"/><circle cx="2.5" cy="11" r="1.3"/><circle cx="7.5" cy="11" r="1.3"/></svg>
      </div>
      {(["inbox", "command"] as ViewMode[]).map(m => (
        <button key={m} onClick={() => setMode(m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mode === m ? "bg-[#9000FF] text-white shadow-sm" : "text-[#5E687B] hover:text-[#212833]"}`}>
          {m === "inbox" ? <><MessagesSquare size={12} /> Conversation Hub</> : <><LayoutGrid size={12} /> Command Center</>}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] bg-[#212833] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
      <CheckCircle2 size={14} className="text-emerald-400" />{message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage Config Modal
// ---------------------------------------------------------------------------
function StageConfigModal({ stages, onSave, onClose }: { stages: Stage[]; onSave: (s: Stage[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Stage[]>(stages.map(s => ({ ...s })));
  const [newLabel, setNewLabel] = useState("");
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const addStage = () => {
    const label = newLabel.trim();
    if (!label) return;
    setDraft(d => [...d, { id: `custom_${Date.now()}`, label }]);
    setNewLabel("");
  };

  const removeStage = (idx: number) => setDraft(d => d.filter((_, i) => i !== idx));

  const moveStage = (from: number, to: number) => {
    setDraft(d => { const n = [...d]; const [item] = n.splice(from, 1); n.splice(to, 0, item); return n; });
  };

  const handleDrop = (toIdx: number) => {
    if (draggingIdx !== null && draggingIdx !== toIdx) moveStage(draggingIdx, toIdx);
    setDraggingIdx(null); setOverIdx(null);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/30 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-[480px] max-h-[80vh] flex flex-col overflow-hidden border border-[#E5EAF0]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF0]">
          <div>
            <div className="font-bold text-sm text-[#212833] flex items-center gap-2"><SlidersHorizontal size={15} className="text-[#9000FF]" /> Workflow Stages</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">Drag to reorder · click × to remove · add custom stages below</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#F0F4F8] rounded-full text-[#5E687B] transition-colors"><X size={16} /></button>
        </div>

        {/* Stage list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
          {draft.map((stage, idx) => (
            <div key={stage.id}
              draggable
              onDragStart={() => setDraggingIdx(idx)}
              onDragOver={e => { e.preventDefault(); setOverIdx(idx); }}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDraggingIdx(null); setOverIdx(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${overIdx === idx ? "border-[#9000FF]/40 bg-[#FAFBFF]" : draggingIdx === idx ? "opacity-40 border-[#E5EAF0]" : "border-[#E5EAF0] bg-white hover:border-[#D6E3EB]"}`}>
              <GripVertical size={14} className="text-[#C0C8D4] shrink-0" />
              <div className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[9px] font-bold text-[#9000FF] shrink-0">{idx + 1}</div>
              <span className="flex-1 text-xs font-medium text-[#212833]">{stage.label}</span>
              <div className="flex gap-1">
                <button onClick={() => idx > 0 && moveStage(idx, idx - 1)} className="p-1 hover:bg-[#F0F4F8] rounded text-[#5E687B] disabled:opacity-30" disabled={idx === 0}><ChevronUp size={12} /></button>
                <button onClick={() => idx < draft.length - 1 && moveStage(idx, idx + 1)} className="p-1 hover:bg-[#F0F4F8] rounded text-[#5E687B] disabled:opacity-30" disabled={idx === draft.length - 1}><ChevronDown size={12} /></button>
                <button onClick={() => removeStage(idx)} className="p-1 hover:bg-red-50 rounded text-[#C0C8D4] hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Add stage */}
        <div className="px-4 py-3 border-t border-[#E5EAF0] flex gap-2">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addStage()}
            placeholder="Add a stage name..."
            className="flex-1 px-3 py-2 text-xs border border-[#E5EAF0] rounded-lg outline-none focus:border-[#9000FF]/40 focus:ring-1 focus:ring-[#9000FF]/10 transition-all" />
          <button onClick={addStage} disabled={!newLabel.trim()}
            className="px-3 py-2 bg-[#F0F4F8] text-[#212833] text-xs font-medium rounded-lg hover:bg-[#E5EAF0] disabled:opacity-40 transition-colors flex items-center gap-1.5">
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E5EAF0] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-[#5E687B] hover:text-[#212833] transition-colors">Cancel</button>
          <button onClick={() => { onSave(draft); onClose(); }}
            className="px-4 py-2 bg-[#9000FF] text-white text-xs font-semibold rounded-lg hover:bg-[#7A00D9] transition-colors shadow-sm">
            Save Stages
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment chip
// ---------------------------------------------------------------------------
function PaymentStatus({ payments }: { payments: [Payment, Payment] }) {
  const deposit = payments[0];
  const balance = payments[1];
  const balanceOverdue = !balance.paid && new Date(`${balance.dueDate} 2026`) < new Date();
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${deposit.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
        <DollarSign size={8} />{deposit.percent}% {deposit.paid ? "paid" : "due " + deposit.dueDate}
      </div>
      <div className={`flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${balance.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : balanceOverdue ? "bg-red-50 text-red-600 border-red-100 animate-pulse" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
        <CreditCard size={8} />{balance.percent}% {balance.paid ? "paid" : balanceOverdue ? "OVERDUE" : "due " + balance.dueDate}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Factory quote panel (shown when stage = "quotes")
// ---------------------------------------------------------------------------
function QuotePanel({ quotes, shipmentId, onSelectQuote }: { quotes: FactoryQuote[]; shipmentId: string; onSelectQuote: (shipmentId: string, idx: number) => void }) {
  return (
    <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3.5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={12} className="text-[#9000FF]" />
        <span className="text-[10px] font-bold text-[#9000FF] uppercase tracking-wider">Factory Quotes</span>
        <span className="text-[9px] text-[#5E687B] ml-auto">Click to select</span>
      </div>
      <div className="flex flex-col gap-2">
        {quotes.map((q, idx) => (
          <button key={q.factory} onClick={() => onSelectQuote(shipmentId, idx)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${q.selected ? "border-[#9000FF]/40 bg-white shadow-sm" : "border-[#E5EAF0] bg-white hover:border-[#9000FF]/20 hover:bg-[#FAFBFF]"}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${q.selected ? "border-[#9000FF] bg-[#9000FF]" : "border-[#D6E3EB]"}`}>
              {q.selected && <Check size={9} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#212833] flex items-center gap-1.5">
                {q.factory}
                <span className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-1 rounded border border-[#E5EAF0] font-normal">{q.country}</span>
                {q.selected && <span className="text-[9px] bg-[#9000FF]/10 text-[#9000FF] px-1.5 rounded font-semibold">Selected</span>}
              </div>
              <div className="flex gap-3 mt-0.5 text-[9px] text-[#5E687B]">
                <span>MOQ {q.moq.toLocaleString()} units</span>
                <span>{q.leadDays}d lead</span>
              </div>
            </div>
            <div className={`text-sm font-bold shrink-0 ${q.selected ? "text-[#9000FF]" : "text-[#212833]"}`}>
              ${q.unitPrice.toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Task List (upgraded daily briefing)
// ---------------------------------------------------------------------------
function TaskList({ tasks, onOpenMessage, onDismiss, onClose }: {
  tasks: Task[]; onOpenMessage: (msgId: string) => void; onDismiss: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="px-3 pt-3 pb-1">
        <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Zap size={9} className="text-[#9000FF]" /> AI-generated from email analysis
        </div>
      </div>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-[#5E687B]">
          <CheckCircle2 size={22} className="text-emerald-400" />
          <p className="text-xs font-medium">All clear — inbox is clean</p>
        </div>
      ) : tasks.map((task, i) => (
        <div key={task.id} className="mx-3 mb-2 bg-white border border-[#E5EAF0] rounded-lg p-2.5 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
              <span className="text-[9px] text-[#9E9FAE] font-medium w-3">{i + 1}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${urgencyCls(task.urgency)}`}>
                {task.urgency}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#212833] leading-tight mb-1">{task.title}</div>
              <div className="text-[9px] text-[#5E687B] flex items-center gap-1 mb-2">
                <CalendarClock size={8} /> {task.source} · {task.sourceAge}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {task.messageId && (
                  <button onClick={() => { onOpenMessage(task.messageId!); onClose(); }}
                    className="text-[9px] bg-[#9000FF] text-white px-2 py-1 rounded font-semibold hover:bg-[#7A00D9] transition-colors flex items-center gap-1">
                    <ArrowRight size={8} /> {task.action}
                  </button>
                )}
                <button onClick={() => onDismiss(task.id)}
                  className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-2 py-1 rounded font-medium hover:bg-[#E5EAF0] transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="px-3 pt-1 pb-3">
        <button className="text-[10px] text-[#9000FF] font-semibold hover:underline flex items-center gap-1">
          View all 12 tasks <ArrowRight size={9} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ConversationHub() {
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [showStageConfig, setShowStageConfig] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>(INIT_SHIPMENTS);
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [tasks, setTasks] = useState<Task[]>(INIT_TASKS);
  const [activeMessageId, setActiveMessageId] = useState("m1");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [briefingExpanded, setBriefingExpanded] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());
  const [aiQuery, setAiQuery] = useState("");
  const [showAiResult, setShowAiResult] = useState(false);

  const activeMessage = messages.find(m => m.id === activeMessageId) || messages[0];
  const activeShipment = shipments.find(s => s.id === activeMessage.shipmentId);
  const activeStage = activeShipment ? stages.find(s => s.id === activeShipment.currentStageId) : null;
  const activeStageIdx = activeShipment ? stages.findIndex(s => s.id === activeShipment.currentStageId) : -1;

  const visibleMessages = messages.filter(m => {
    if (selectedShipmentId && m.shipmentId !== selectedShipmentId) return false;
    if (channelFilter !== "all" && m.channel !== channelFilter) return false;
    if (supplierFilter && m.supplierId !== supplierFilter) return false;
    return true;
  });

  const openMessage = (id: string) => {
    setActiveMessageId(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
    setComposeText("");
  };

  const selectShipment = (id: string) => {
    const next = selectedShipmentId === id ? null : id;
    setSelectedShipmentId(next);
    setChannelFilter("all"); setSupplierFilter(null);
    if (next) { const first = messages.find(m => m.shipmentId === next); if (first) openMessage(first.id); }
  };

  const advanceStage = (shipmentId: string) => {
    setShipments(prev => prev.map(s => {
      if (s.id !== shipmentId) return s;
      const idx = stages.findIndex(st => st.id === s.currentStageId);
      const nextStage = stages[Math.min(idx + 1, stages.length - 1)];
      return { ...s, currentStageId: nextStage?.id ?? s.currentStageId, status: "on-track" };
    }));
  };

  const sendReply = (msgId: string) => {
    setRepliedIds(prev => new Set(prev).add(msgId));
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, unread: false } : m));
    const msg = messages.find(m => m.id === msgId);
    if (msg) { advanceStage(msg.shipmentId); setTasks(t => t.filter(tk => tk.messageId !== msgId)); }
    setComposeText("");
    setToast("Reply sent — stage advanced");
  };

  const selectQuote = (shipmentId: string, selectedIdx: number) => {
    setShipments(prev => prev.map(s => s.id !== shipmentId || !s.quotes ? s : {
      ...s, quotes: s.quotes.map((q, i) => ({ ...q, selected: i === selectedIdx }))
    }));
    setToast("Factory quote selected — costing sheet updated");
  };

  const toggleChannel = (ch: Channel | "all") => {
    setChannelFilter(ch); setSelectedShipmentId(null); setSupplierFilter(null);
    const first = ch === "all" ? messages[0] : messages.find(m => m.channel === ch);
    if (first) openMessage(first.id);
  };

  const toggleSupplier = (id: string) => {
    const next = supplierFilter === id ? null : id;
    setSupplierFilter(next); setSelectedShipmentId(null); setChannelFilter("all");
    if (next) { const first = messages.find(m => m.supplierId === next); if (first) openMessage(first.id); }
  };

  const unreadCount = messages.filter(m => m.unread).length;
  const highUrgencyCount = tasks.filter(t => t.urgency === "high").length;

  if (viewMode === "command") {
    return (
      <div className="relative h-screen w-full">
        <ViewSwitcher mode={viewMode} setMode={setViewMode} />
        {showStageConfig && <StageConfigModal stages={stages} onSave={s => { setStages(s); setToast("Workflow stages saved"); }} onClose={() => setShowStageConfig(false)} />}
        <Atelier />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <ViewSwitcher mode={viewMode} setMode={setViewMode} />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {showStageConfig && <StageConfigModal stages={stages} onSave={s => { setStages(s); setToast("Workflow stages saved"); }} onClose={() => setShowStageConfig(false)} />}

      {/* LEFT NAV RAIL */}
      <div className="w-[58px] bg-white border-r border-[#E5EAF0] flex flex-col items-center py-4 z-20 shrink-0">
        <div className="w-7 h-7 bg-[#9000FF] rounded-lg flex items-center justify-center text-white font-bold text-base mb-7">f</div>
        <div className="flex flex-col gap-5 text-[#5E687B]">
          {([Home, Inbox, FileBox, Users] as React.ElementType[]).map((Icon, i) => (
            <button key={i} className={`p-2 rounded-md transition-colors relative ${i === 1 ? "bg-[#F0F4F8] text-[#9000FF]" : "hover:bg-[#F0F4F8] hover:text-[#212833]"}`}>
              <Icon size={17} />
              {i === 1 && unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#9000FF] rounded-full border border-white" />}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-3 items-center">
          {/* Settings — opens stage config */}
          <button onClick={() => setShowStageConfig(true)} title="Configure workflow stages"
            className="p-2 rounded-md hover:bg-[#F0F4F8] text-[#5E687B] hover:text-[#9000FF] transition-colors">
            <SlidersHorizontal size={17} />
          </button>
          <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-7 h-7 rounded-full border border-[#E5EAF0] object-cover" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <div className="bg-white border-b border-[#E5EAF0] flex items-center justify-between px-5 shrink-0 relative" style={{ height: 50 }}>
          <div className="font-bold text-sm flex items-center gap-2">
            <span className="text-[#9000FF] tracking-tight">flowforge</span>
            <span className="text-[#E5EAF0]">/</span>
            <span className="text-[#5E687B] font-medium text-xs">
              {selectedShipmentId ? shipments.find(s => s.id === selectedShipmentId)?.po
                : supplierFilter ?? (channelFilter !== "all" ? channelFilter.charAt(0).toUpperCase() + channelFilter.slice(1) : "Inbox")}
            </span>
          </div>
          <div className="flex-1 max-w-md mx-5 relative">
            <Sparkles size={13} className="text-[#9000FF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={aiQuery}
              onChange={e => { setAiQuery(e.target.value); setShowAiResult(false); }}
              onKeyDown={e => { if (e.key === "Enter" && aiQuery.trim()) setShowAiResult(true); }}
              placeholder="Ask FlowForge anything...  ⌘K"
              className="w-full pl-8 pr-3 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-xs text-[#212833] placeholder-[#9E9FAE] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none" />
            {showAiResult && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#9000FF]/20 rounded-xl shadow-xl z-50 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkles size={14} className="text-[#9000FF] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#212833] leading-relaxed">I found 2 urgent items: Guangzhou Metalworks is requesting a 2-day delay on PO-2026-0142, and the balance payment of $8,960 on that same PO is overdue. Would you like me to draft a reply or flag the payment for follow-up?</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Draft reply", "Flag payment", "Show all tasks"].map(c => (
                    <button key={c} onClick={() => { setShowAiResult(false); setAiQuery(""); }} className="text-[10px] bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/15 transition-colors font-medium">{c}</button>
                  ))}
                </div>
                <button onClick={() => { setShowAiResult(false); setAiQuery(""); }} className="absolute top-3 right-3 text-[#5E687B] hover:text-[#212833]"><X size={13} /></button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-[#5E687B]">
            <button className="hover:text-[#212833] p-1"><Search size={15} /></button>
            <button className="hover:text-[#212833] p-1 relative">
              <Bell size={15} />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />}
            </button>
          </div>
        </div>

        {/* MILESTONE STRIP */}
        <div className="bg-white border-b border-[#E5EAF0] shrink-0 py-3 px-4 overflow-x-auto flex gap-3 z-10 shadow-[0_2px_6px_rgba(0,0,0,0.02)]" style={{ height: 148 }}>
          {shipments.map(s => {
            const isSelected = selectedShipmentId === s.id;
            const stageIdx = stages.findIndex(st => st.id === s.currentStageId);
            const stagePct = stages.length > 1 ? Math.round((stageIdx / (stages.length - 1)) * 100) : 0;
            const curStage = stages.find(st => st.id === s.currentStageId);
            return (
              <div key={s.id} onClick={() => selectShipment(s.id)}
                className={`w-[300px] shrink-0 border rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer group transition-all ${isSelected ? "border-[#9000FF]/40 shadow-md bg-[#FAFBFF]" : "border-[#E5EAF0] bg-white hover:border-[#9000FF]/20 hover:shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className={`text-xs font-bold mb-0.5 transition-colors ${isSelected ? "text-[#9000FF]" : "text-[#212833] group-hover:text-[#9000FF]"}`}>{s.po}</div>
                    <div className="text-[10px] text-[#5E687B] truncate w-[180px]">{s.product}</div>
                  </div>
                  <div className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${statusCls(s.status)}`}>
                    {s.status === "delayed" && <AlertCircle size={8} />}
                    {s.status === "at-risk"  && <Clock size={8} />}
                    {s.status === "on-track" && <Check size={8} />}
                    {s.dueDate}
                  </div>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center justify-between text-[9px] text-[#5E687B] mb-1 uppercase tracking-wider">
                    <span className="font-bold text-[#212833]">{curStage?.label ?? "—"}</span>
                    <span>{stagePct}%</span>
                  </div>
                  <div className="flex gap-px h-1.5">
                    {stages.map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full transition-all duration-500 ${
                        idx < stageIdx ? (s.status === "delayed" ? "bg-red-400" : s.status === "at-risk" ? "bg-amber-400" : "bg-emerald-400")
                        : idx === stageIdx ? (s.status === "delayed" ? "bg-red-500" : s.status === "at-risk" ? "bg-amber-500" : "bg-[#9000FF]")
                        : "bg-[#E5EAF0]"}`} />
                    ))}
                  </div>
                </div>

                {/* Payment chips */}
                <PaymentStatus payments={s.payments} />
              </div>
            );
          })}
        </div>

        {/* 3-COLUMN INBOX */}
        <div className="flex-1 flex overflow-hidden">

          {/* Col 1 — Filters */}
          <div className="w-[210px] bg-[#FAFBFC] border-r border-[#E5EAF0] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#E5EAF0]">
              <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Channels</div>
              <div className="flex flex-col gap-0.5">
                {([
                  { id: "all",      label: "All Inbox",  icon: <Inbox size={12} />,          count: messages.length },
                  { id: "gmail",    label: "Gmail",      icon: <Mail size={12} />,            count: messages.filter(m => m.channel === "gmail").length },
                  { id: "whatsapp", label: "WhatsApp",   icon: <MessageCircle size={12} />,   count: messages.filter(m => m.channel === "whatsapp").length },
                  { id: "sheets",   label: "Sheets",     icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>, count: messages.filter(m => m.channel === "sheets").length },
                  { id: "pdf",      label: "PDFs",       icon: <FileText size={12} />,        count: messages.filter(m => m.channel === "pdf").length },
                ] as { id: Channel | "all"; label: string; icon: React.ReactNode; count: number }[]).map(f => {
                  const active = channelFilter === f.id && !selectedShipmentId && !supplierFilter;
                  const unread = f.id === "all" ? messages.filter(m => m.unread).length : messages.filter(m => m.channel === f.id && m.unread).length;
                  return (
                    <button key={f.id} onClick={() => toggleChannel(f.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${active ? "bg-white border border-[#E5EAF0] text-[#212833] font-semibold shadow-sm" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                      <span className="flex items-center gap-2">{f.icon}{f.label}</span>
                      {unread > 0
                        ? <span className="text-[9px] bg-[#9000FF] text-white px-1.5 rounded-full font-bold">{unread}</span>
                        : <span className="text-[9px] text-[#5E687B]">{f.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Suppliers</div>
                {supplierFilter && <button onClick={() => setSupplierFilter(null)} className="text-[#9000FF] text-[9px] flex items-center gap-0.5 hover:underline"><X size={8} />Clear</button>}
              </div>
              <div className="flex flex-col gap-0.5">
                {SUPPLIERS.map(s => (
                  <button key={s.id} onClick={() => toggleSupplier(s.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${supplierFilter === s.id ? "bg-white border border-[#9000FF]/30 text-[#9000FF] font-semibold shadow-sm" : "text-[#212833] hover:bg-[#F0F4F8]"}`}>
                    <span className="truncate pr-2">{s.label}</span>
                    <span className="text-[9px] bg-white border border-[#E5EAF0] px-1.5 rounded shrink-0">{s.count}</span>
                  </button>
                ))}
              </div>

              {(selectedShipmentId || supplierFilter || channelFilter !== "all") && (
                <button onClick={() => { setSelectedShipmentId(null); setSupplierFilter(null); setChannelFilter("all"); }}
                  className="mt-3 w-full text-[9px] text-[#5E687B] hover:text-[#212833] flex items-center justify-center gap-1 py-1.5 border border-dashed border-[#E5EAF0] rounded-md hover:border-[#D6E3EB] transition-colors">
                  <X size={9} /> Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Col 2 — Thread List */}
          <div className="flex-1 min-w-[280px] bg-white border-r border-[#E5EAF0] flex flex-col">
            <div className="border-b border-[#E5EAF0] px-3 flex items-center justify-between shrink-0" style={{ height: 38 }}>
              <div className="font-semibold text-[11px] text-[#212833]">
                {visibleMessages.length} thread{visibleMessages.length !== 1 ? "s" : ""}
                {(selectedShipmentId || supplierFilter || channelFilter !== "all") && <span className="ml-1 text-[#9000FF] font-normal">— filtered</span>}
              </div>
              <button className="p-1 hover:bg-[#F0F4F8] rounded text-[#5E687B]"><MoreHorizontal size={13} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {visibleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#5E687B] gap-2">
                  <Inbox size={22} className="opacity-30" />
                  <p className="text-[11px]">No threads match this filter</p>
                </div>
              ) : visibleMessages.map(msg => {
                const replied = repliedIds.has(msg.id);
                return (
                  <div key={msg.id} onClick={() => openMessage(msg.id)}
                    className={`px-3 py-2.5 border-b border-[#E5EAF0] cursor-pointer hover:bg-[#FAFBFC] transition-colors relative ${activeMessageId === msg.id ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : "border-l-2 border-l-transparent"}`}>
                    {msg.unread && !replied && <div className="absolute left-2 top-4 w-1.5 h-1.5 bg-[#9000FF] rounded-full" />}
                    <div className="flex items-start justify-between mb-0.5 pl-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-semibold text-[11px] truncate ${msg.unread && !replied ? "text-[#212833]" : "text-[#5E687B]"}`}>{msg.sender}</span>
                        {chIcon(msg.channel)}
                        {replied && <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 rounded-full font-semibold flex items-center gap-0.5"><Check size={7} />Replied</span>}
                      </div>
                      <span className={`text-[9px] shrink-0 ml-2 ${msg.unread && !replied ? "text-[#9000FF] font-semibold" : "text-[#5E687B]"}`}>{msg.timestamp}</span>
                    </div>
                    <div className={`text-[11px] pl-3 mb-1.5 line-clamp-2 leading-relaxed ${msg.unread && !replied ? "text-[#212833]" : "text-[#9E9FAE]"}`}>{msg.snippet}</div>
                    <div className="flex flex-wrap gap-1 pl-3">
                      {msg.aiTags.map(tag => (
                        <span key={tag} className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] flex items-center gap-0.5">
                          {tag.startsWith("risk") || tag.startsWith("delay") || tag.startsWith("payment")
                            ? <AlertCircle size={7} className="text-red-500" />
                            : <Sparkles size={7} className="text-[#9000FF]" />}
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 3 — Thread detail + context */}
          <div className="w-[460px] bg-white flex flex-col shrink-0 border-l border-[#E5EAF0]">

            {/* Shipment context */}
            {activeShipment && (
              <div className="border-b border-[#E5EAF0] p-4 bg-[#FAFBFC] shrink-0">
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs text-[#212833]">{activeShipment.po}</span>
                      <span className="text-[9px] bg-[#E5EAF0] text-[#5E687B] px-1.5 rounded font-medium">{activeShipment.customer}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusCls(activeShipment.status)}`}>
                        {activeShipment.status === "on-track" ? <Check size={8} /> : <AlertCircle size={8} />}{activeShipment.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5E687B]">{activeShipment.product}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">Ex-Factory</div>
                    <div className="text-xs font-bold text-[#212833]">{activeShipment.dueDate}</div>
                  </div>
                </div>

                {/* Stage progress */}
                <div className="bg-white rounded-lg border border-[#E5EAF0] p-2.5 mb-2.5">
                  <div className="flex items-center justify-between text-[9px] mb-1.5">
                    <span className="font-bold text-[#212833] flex items-center gap-1"><MapPin size={9} className="text-[#9000FF]" />{activeStage?.label ?? "—"}</span>
                    <span className="text-[#5E687B]">Stage {activeStageIdx + 1} of {stages.length}</span>
                  </div>
                  <div className="flex gap-px h-1.5 mb-2">
                    {stages.map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full transition-all duration-500 ${idx < activeStageIdx ? "bg-[#9000FF]" : idx === activeStageIdx ? "bg-[#9000FF] opacity-50" : "bg-[#E5EAF0]"}`} />
                    ))}
                  </div>
                  {/* Next stages breadcrumb */}
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {stages.slice(activeStageIdx, activeStageIdx + 5).map((stage, i) => (
                      <div key={stage.id} className={`flex items-center gap-1 shrink-0 text-[9px] ${i === 0 ? "text-[#9000FF] font-bold" : "text-[#9E9FAE]"}`}>
                        {i > 0 && <ChevronRight size={8} className="text-[#D6E3EB]" />}{stage.label}
                      </div>
                    ))}
                    {activeStageIdx + 5 < stages.length && <span className="text-[9px] text-[#9E9FAE]">+{stages.length - activeStageIdx - 5} more</span>}
                  </div>
                </div>

                {/* Payment status inline */}
                <div className="flex items-center gap-3 text-[9px]">
                  {activeShipment.payments.map((p, i) => {
                    const overdue = !p.paid && new Date(`${p.dueDate} 2026`) < new Date();
                    return (
                      <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded border font-semibold ${p.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : overdue ? "bg-red-50 text-red-600 border-red-100" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                        {p.paid ? <CheckCircle2 size={9} /> : overdue ? <AlertCircle size={9} /> : <CreditCard size={9} />}
                        {p.label}: ${p.amountUsd.toLocaleString()} {p.paid ? "paid" : overdue ? "OVERDUE" : `due ${p.dueDate}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quote panel (shown when in quotes stage) */}
            {activeShipment?.currentStageId === "quotes" && activeShipment.quotes && (
              <div className="px-4 pt-4">
                <QuotePanel quotes={activeShipment.quotes} shipmentId={activeShipment.id} onSelectQuote={selectQuote} />
              </div>
            )}

            {/* Message body */}
            {!(activeShipment?.currentStageId === "quotes") && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#F0F4F8] flex items-center justify-center text-sm font-bold text-[#5E687B] shrink-0">
                    {activeMessage.sender.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#212833]">{activeMessage.sender}</div>
                    <div className="text-[9px] text-[#5E687B] flex items-center gap-1">
                      {chIcon(activeMessage.channel, 9)}
                      via {activeMessage.channel === "whatsapp" ? "WhatsApp" : activeMessage.channel === "gmail" ? "Gmail" : activeMessage.channel === "sheets" ? "Google Sheets" : "PDF"}
                      <span className="text-[#C0C8D4]">·</span>{activeMessage.timestamp}
                    </div>
                  </div>
                  {repliedIds.has(activeMessage.id) && (
                    <span className="ml-auto text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle2 size={9} />Replied
                    </span>
                  )}
                </div>

                <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4 text-[11px] text-[#212833] whitespace-pre-wrap leading-relaxed">
                  {activeMessage.fullBody}
                </div>

                {activeMessage.aiAction && (
                  <div className="bg-gradient-to-br from-[#9000FF]/5 to-transparent border border-[#9000FF]/20 rounded-xl p-3.5 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#9000FF]/8 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-start gap-2.5 relative">
                      <Wand2 size={13} className="text-[#9000FF] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[8px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Zap size={8} />AI Suggested Action</div>
                        <div className="text-[11px] text-[#212833] mb-2 font-semibold">{activeMessage.aiAction}</div>
                        {activeMessage.aiDraft && (
                          <div className="bg-white border border-[#E5EAF0] rounded-lg p-2.5 text-[10px] text-[#5E687B] mb-3 leading-relaxed font-mono">
                            "{activeMessage.aiDraft}"
                          </div>
                        )}
                        {!repliedIds.has(activeMessage.id) ? (
                          <div className="flex gap-2">
                            <button onClick={() => sendReply(activeMessage.id)}
                              className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-[#7A00D9] transition-colors flex items-center gap-1.5 shadow-sm">
                              <Send size={10} />Send & Update
                            </button>
                            <button onClick={() => setComposeText(activeMessage.aiDraft ?? "")}
                              className="bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md text-[10px] font-medium hover:bg-[#F0F4F8] transition-colors">
                              Edit Draft
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-semibold">
                            <CheckCircle2 size={12} />Sent — stage advanced
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quote panel scroll area */}
            {activeShipment?.currentStageId === "quotes" && (
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="text-[11px] text-[#5E687B] leading-relaxed bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={12} className="text-[#9000FF]" />
                    <span className="font-semibold text-[#212833] text-xs">FlowForge AI — Quote Analysis</span>
                  </div>
                  Foshan Grid Factory offers the best unit price at $6.10 with 35-day lead time. Guangzhou Metalworks is your existing supplier with a shorter lead time. Recommend Foshan if margin is priority; Guangzhou if relationship and speed matter more.
                </div>
              </div>
            )}

            {/* Compose */}
            <div className="p-3 border-t border-[#E5EAF0] bg-white shrink-0">
              <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/40 focus-within:ring-1 focus-within:ring-[#9000FF]/15 transition-all">
                <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                  placeholder={repliedIds.has(activeMessage.id) ? "Follow up..." : "Type a reply or use Edit Draft above..."}
                  className="w-full p-3 h-14 outline-none resize-none text-[11px] bg-transparent leading-relaxed" />
                <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
                  <div className="flex gap-1 text-[#5E687B]">
                    <button className="p-1 hover:bg-[#E5EAF0] rounded transition-colors"><Paperclip size={13} /></button>
                    <button onClick={() => setComposeText(activeMessage.aiDraft ?? "")} className="p-1 hover:bg-[#E5EAF0] rounded transition-colors" title="Insert AI draft">
                      <Sparkles size={13} className="text-[#9000FF]" />
                    </button>
                  </div>
                  <button onClick={() => { if (composeText.trim()) sendReply(activeMessage.id); }}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all ${composeText.trim() ? "bg-[#212833] text-white hover:bg-black" : "bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>
                    Reply <Send size={10} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Task List — bottom-right floating card */}
      <div className={`fixed bottom-5 right-5 w-[340px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5EAF0] overflow-hidden transition-all duration-300 z-40 flex flex-col ${briefingExpanded ? "h-[420px]" : "h-[54px]"}`}>
        <div onClick={() => setBriefingExpanded(v => !v)}
          className="flex items-center justify-between cursor-pointer bg-gradient-to-r from-[#9000FF]/5 to-transparent hover:bg-[#FAFBFC] transition-colors shrink-0 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF] shrink-0">
              <ListTodo size={14} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#212833]">Today's Tasks</div>
              {!briefingExpanded && (
                <div className="text-[9px] text-[#5E687B]">
                  {highUrgencyCount > 0 ? <span className="text-red-500 font-semibold">{highUrgencyCount} urgent</span> : null}
                  {highUrgencyCount > 0 && tasks.length > highUrgencyCount ? " · " : null}
                  {tasks.length > highUrgencyCount ? `${tasks.length - highUrgencyCount} more` : null}
                  {tasks.length === 0 ? "All clear — great work!" : null}
                </div>
              )}
            </div>
          </div>
          <ChevronDown size={13} className={`text-[#5E687B] transition-transform ${briefingExpanded ? "rotate-0" : "rotate-180"}`} />
        </div>

        {briefingExpanded && (
          <TaskList
            tasks={tasks}
            onOpenMessage={openMessage}
            onDismiss={id => setTasks(t => t.filter(tk => tk.id !== id))}
            onClose={() => setBriefingExpanded(false)}
          />
        )}
      </div>
    </div>
  );
}
