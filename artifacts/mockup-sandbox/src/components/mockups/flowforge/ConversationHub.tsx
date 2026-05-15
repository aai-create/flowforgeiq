import React, { useState, useRef, useEffect } from "react";
import {
  Mail, MessageCircle, FileText, Sparkles, Wand2, Search,
  Bell, ChevronDown, Check, AlertCircle, Clock, MoreHorizontal,
  Paperclip, Send, ArrowRight, Home, Inbox, FileBox, Users, Settings, Filter,
  MapPin, LayoutGrid, MessagesSquare, X, CheckCircle2, Zap, ChevronRight,
} from "lucide-react";
import { Atelier } from "./Atelier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ViewMode = "inbox" | "command";
type Channel = "gmail" | "whatsapp" | "sheets" | "pdf";
type ShipmentStatus = "on-track" | "at-risk" | "delayed";

interface Shipment {
  id: string; po: string; product: string; supplier: string; customer: string;
  status: ShipmentStatus; currentStage: number; stages: string[]; dueDate: string;
}
interface Message {
  id: string; sender: string; channel: Channel; timestamp: string;
  snippet: string; fullBody: string; unread: boolean; aiTags: string[];
  shipmentId: string; supplierId: string;
  aiDraft?: string; aiAction?: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const STAGES = ["Tech Pack","Sample Request","Proto Sample","Fit Sample","PP Sample","Bulk","Inline QC","Final QC","Ex-Factory","Delivered"];

const INIT_SHIPMENTS: Shipment[] = [
  { id:"s1", po:"PO-2026-0142", product:"Heavyweight 14oz Selvedge Jean — Indigo",  supplier:"Lahore Denim Co.",   customer:"Vellum Studio",         status:"at-risk",  currentStage:4, stages:STAGES, dueDate:"May 17" },
  { id:"s2", po:"PO-2026-0157", product:"Organic Cotton Crewneck — Stone",          supplier:"Yangtze Knit Mills", customer:"Northbound Outfitters", status:"delayed",  currentStage:2, stages:STAGES, dueDate:"May 18" },
  { id:"s3", po:"PO-2026-0160", product:"Merino Half-Zip — Forest",                 supplier:"Porto Bordados",     customer:"Pioneer Goods Co.",     status:"on-track", currentStage:6, stages:STAGES, dueDate:"May 22" },
  { id:"s4", po:"PO-2026-0165", product:"Linen Camp Shirt — Ecru",                  supplier:"Bali Atelier",       customer:"Marlowe & Sons",        status:"at-risk",  currentStage:7, stages:STAGES, dueDate:"Jun 02" },
  { id:"s5", po:"PO-2026-0168", product:"French Terry Hoodie — Charcoal",           supplier:"Tirupur Jersey Works",customer:"Vellum Studio",        status:"on-track", currentStage:1, stages:STAGES, dueDate:"Jun 10" },
];

const INIT_MESSAGES: Message[] = [
  {
    id:"m1", sender:"Lahore Denim Co.", channel:"whatsapp", timestamp:"10:42 AM",
    snippet:"Strike-off for placement print needs +2 days, mill backed up. Please advise if we can proceed.",
    fullBody:"Hi team, quick update from the floor. Strike-off for placement print needs +2 days — the mill is backed up with a large local order. Please advise if we can proceed with the delay. If we push this, we may need to compress Bulk or expedite shipping.",
    unread:true, aiTags:["risk: delay 2d","milestone: strike-off"], shipmentId:"s1", supplierId:"Lahore Denim Co.",
    aiDraft:"Understood — please proceed. We'll update the PO-2026-0142 timeline to reflect the 2-day delay. Aim to recover in the Bulk phase if possible.",
    aiAction:"Approve delay and update shipment timeline",
  },
  {
    id:"m2", sender:"Yangtze Knit Mills", channel:"gmail", timestamp:"Yesterday",
    snippet:"Lab dip approved — proceeding to bulk dye lot Tuesday. HTS code confirmed as 6110.20.20.",
    fullBody:"Hello,\n\nConfirming receipt of the approval for the Stone lab dip. We are proceeding to bulk dye lot this coming Tuesday. HTS code confirmed as 6110.20.20 for your import records.\n\nBest,\nWei",
    unread:false, aiTags:["milestone: lab dip approved","action: advance to Bulk"], shipmentId:"s2", supplierId:"Yangtze Knit Mills",
    aiDraft:"Great news — thanks for confirming. Please proceed with bulk dye lot. We'll log the lab dip milestone on our end.",
    aiAction:"Log milestone and advance PO-2026-0157 to Bulk",
  },
  {
    id:"m3", sender:"Bali Atelier", channel:"whatsapp", timestamp:"Yesterday",
    snippet:"Hi! We need to push Bali shipment by 4 days — port congestion in Surabaya. Attaching revised schedule.",
    fullBody:"Hi! We need to push the Bali shipment by 4 days. Port congestion in Surabaya is causing massive container shortages. Attaching the revised Ex-Factory schedule. Let me know if Marlowe & Sons is okay with this.",
    unread:true, aiTags:["risk: port congestion","delay: 4d"], shipmentId:"s4", supplierId:"Bali Atelier",
    aiDraft:"Hi — understood on the Surabaya congestion. Please proceed with the revised schedule. We'll notify the buyer and update the timeline accordingly.",
    aiAction:"Approve 4-day delay and notify Marlowe & Sons",
  },
  {
    id:"m4", sender:"Costing Sheet Update", channel:"sheets", timestamp:"Tue",
    snippet:"Cell D14 changed: GSM adjusted to 420g. BOM cost increased by $0.45/unit on PO-2026-0168.",
    fullBody:"Automated update from Google Sheets — BOM Tracker:\nCell D14 changed: GSM adjusted to 420g.\nBOM cost increased by $0.45/unit.\nTotal impact on PO-2026-0168: +$562.50 (1,250 units).",
    unread:false, aiTags:["update: BOM","cost: +$0.45/unit"], shipmentId:"s5", supplierId:"Tirupur Jersey Works",
    aiDraft:"",
    aiAction:"Acknowledge BOM update and flag for review",
  },
  {
    id:"m5", sender:"Porto Bordados", channel:"pdf", timestamp:"Mon",
    snippet:"AQL 2.5 inspection passed — 1,247 units, 12 minor defects, 0 major. Ex-factory cleared for May 22.",
    fullBody:"Please find attached the final QC report.\n\nAQL 2.5 inspection passed — 1,247 units, 12 minor defects, 0 major defects.\n\nEx-factory date: May 22, 2026.\nGoods are being palletised. Freight forwarder notified.",
    unread:false, aiTags:["milestone: Final QC passed","status: ex-factory cleared"], shipmentId:"s3", supplierId:"Porto Bordados",
    aiDraft:"Thank you — logging QC pass and confirming ex-factory date May 22. Please send the commercial invoice and packing list when ready.",
    aiAction:"Log QC milestone and confirm ex-factory",
  },
];

const SUPPLIERS = [
  { id:"Lahore Denim Co.",    label:"Lahore Denim Co.",    count:7 },
  { id:"Yangtze Knit Mills",  label:"Yangtze Knit Mills",  count:3 },
  { id:"Bali Atelier",        label:"Bali Atelier",         count:2 },
  { id:"Porto Bordados",      label:"Porto Bordados",       count:1 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const chIcon = (ch: Channel, sz = 12) => {
  if (ch === "whatsapp") return <MessageCircle size={sz} className="text-emerald-500" />;
  if (ch === "gmail")    return <Mail size={sz} className="text-blue-500" />;
  if (ch === "sheets")   return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>;
  return <FileText size={sz} className="text-red-500" />;
};

const statusStyle = (s: ShipmentStatus) =>
  s === "on-track" ? "bg-emerald-50 text-emerald-700 border-emerald-100"
  : s === "delayed" ? "bg-red-50 text-red-700 border-red-100"
  : "bg-amber-50 text-amber-700 border-amber-100";

const stageBarColor = (s: ShipmentStatus) =>
  s === "delayed" ? "bg-red-400" : s === "at-risk" ? "bg-amber-400" : "bg-emerald-400";

const activeStageColor = (s: ShipmentStatus) =>
  s === "delayed" ? "bg-red-500" : s === "at-risk" ? "bg-amber-500" : "bg-[#9000FF]";

// ---------------------------------------------------------------------------
// ViewSwitcher (draggable)
// ---------------------------------------------------------------------------
function ViewSwitcher({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  const [pos, setPos] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 60 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setPos({
      x: Math.max(0, Math.min(window.innerWidth - (ref.current?.offsetWidth ?? 240), e.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - (ref.current?.offsetHeight ?? 40), e.clientY - offset.current.y)),
    });
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  return (
    <div ref={ref} style={{ position:"fixed", left:pos.x, top:pos.y, zIndex:60, userSelect:"none" }}
      className="bg-white border border-[#E5EAF0] rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] p-1 flex items-center gap-0.5">
      <div onMouseDown={onMouseDown}
        className="pl-2 pr-1 flex items-center cursor-grab active:cursor-grabbing text-[#C0C8D4] hover:text-[#9000FF] transition-colors" title="Drag to reposition">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2.5" cy="3" r="1.3"/><circle cx="7.5" cy="3" r="1.3"/>
          <circle cx="2.5" cy="7" r="1.3"/><circle cx="7.5" cy="7" r="1.3"/>
          <circle cx="2.5" cy="11" r="1.3"/><circle cx="7.5" cy="11" r="1.3"/>
        </svg>
      </div>
      {(["inbox","command"] as ViewMode[]).map(m => (
        <button key={m} onClick={() => setMode(m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mode === m ? "bg-[#9000FF] text-white shadow-sm" : "text-[#5E687B] hover:text-[#212833]"}`}>
          {m === "inbox" ? <><MessagesSquare size={12}/> Conversation Hub</> : <><LayoutGrid size={12}/> Command Center</>}
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
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] bg-[#212833] text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
      <CheckCircle2 size={15} className="text-emerald-400" />
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Command Panel
// ---------------------------------------------------------------------------
function AiResultPanel({ query, onClose }: { query: string; onClose: () => void }) {
  const results: Record<string, { answer: string; chips: string[] }> = {
    default: {
      answer: "I found 2 shipments needing decisions today. Lahore Denim Co. is requesting a 2-day delay on PO-2026-0142, and Bali Atelier reports 4-day port congestion on PO-2026-0165.",
      chips: ["Open Lahore thread", "Open Bali thread", "Push all dates +4d"],
    },
  };
  const key = query.toLowerCase().includes("block") ? "default" : "default";
  const res = results[key];
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#9000FF]/20 rounded-xl shadow-[0_8px_30px_rgba(144,0,255,0.12)] z-50 p-4 mx-6">
      <div className="flex items-start gap-3 mb-3">
        <Sparkles size={16} className="text-[#9000FF] mt-0.5 shrink-0" />
        <p className="text-sm text-[#212833] leading-relaxed">{res.answer}</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-1">
        {res.chips.map(c => (
          <button key={c} onClick={onClose}
            className="text-xs bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/15 transition-colors font-medium">
            {c}
          </button>
        ))}
      </div>
      <button onClick={onClose} className="absolute top-3 right-3 text-[#5E687B] hover:text-[#212833] p-1"><X size={14}/></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ConversationHub() {
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [shipments, setShipments] = useState<Shipment[]>(INIT_SHIPMENTS);
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [activeMessageId, setActiveMessageId] = useState("m1");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [aiBriefingExpanded, setAiBriefingExpanded] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());
  const [aiQuery, setAiQuery] = useState("");
  const [showAiResult, setShowAiResult] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);

  const activeMessage = messages.find(m => m.id === activeMessageId) || messages[0];
  const activeShipment = shipments.find(s => s.id === activeMessage.shipmentId);

  // Filtered thread list
  const visibleMessages = messages.filter(m => {
    if (selectedShipmentId && m.shipmentId !== selectedShipmentId) return false;
    if (channelFilter !== "all" && m.channel !== channelFilter) return false;
    if (supplierFilter && m.supplierId !== supplierFilter) return false;
    return true;
  });

  // Click thread
  const openMessage = (id: string) => {
    setActiveMessageId(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
    setComposeText("");
  };

  // Click shipment card in timeline
  const selectShipment = (id: string) => {
    const next = selectedShipmentId === id ? null : id;
    setSelectedShipmentId(next);
    setChannelFilter("all");
    setSupplierFilter(null);
    if (next) {
      const first = messages.find(m => m.shipmentId === next);
      if (first) openMessage(first.id);
    }
  };

  // Advance a shipment's stage
  const advanceStage = (shipmentId: string) => {
    setShipments(prev => prev.map(s =>
      s.id === shipmentId && s.currentStage < s.stages.length - 1
        ? { ...s, currentStage: s.currentStage + 1, status: "on-track" }
        : s
    ));
  };

  // Approve delay (fix status)
  const approveDelay = (shipmentId: string) => {
    setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: "on-track" } : s));
  };

  // Send reply flow
  const sendReply = (msgId: string) => {
    setRepliedIds(prev => new Set(prev).add(msgId));
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, unread: false } : m));
    const msg = messages.find(m => m.id === msgId);
    if (msg) advanceStage(msg.shipmentId);
    setComposeText("");
    setToast("Reply sent — milestone updated");
  };

  // Edit draft → compose
  const editDraft = () => {
    setComposeText(activeMessage.aiDraft || "");
  };

  // Channel filter toggle
  const toggleChannel = (ch: Channel | "all") => {
    setChannelFilter(ch);
    setSelectedShipmentId(null);
    setSupplierFilter(null);
    const first = ch === "all" ? messages[0] : messages.find(m => m.channel === ch);
    if (first) openMessage(first.id);
  };

  // Supplier filter toggle
  const toggleSupplier = (id: string) => {
    const next = supplierFilter === id ? null : id;
    setSupplierFilter(next);
    setSelectedShipmentId(null);
    setChannelFilter("all");
    if (next) {
      const first = messages.find(m => m.supplierId === next);
      if (first) openMessage(first.id);
    }
  };

  if (viewMode === "command") {
    return (
      <div className="relative h-screen w-full">
        <ViewSwitcher mode={viewMode} setMode={setViewMode} />
        <Atelier />
      </div>
    );
  }

  const unreadCount = messages.filter(m => m.unread).length;

  return (
    <div className="flex h-screen w-full bg-[#FAFBFC] text-[#212833] font-[Inter,sans-serif] overflow-hidden" style={{ fontSize: 13 }}>
      <ViewSwitcher mode={viewMode} setMode={setViewMode} />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* LEFT NAV RAIL */}
      <div className="w-[60px] bg-white border-r border-[#E5EAF0] flex flex-col items-center py-4 z-20">
        <div className="w-7 h-7 bg-[#9000FF] rounded-lg flex items-center justify-center text-white font-bold text-base mb-7">f</div>
        <div className="flex flex-col gap-5 text-[#5E687B]">
          {[Home, Inbox, FileBox, Users].map((Icon, i) => (
            <button key={i} className={`p-2 rounded-md transition-colors relative ${i === 1 ? "bg-[#F0F4F8] text-[#9000FF]" : "hover:bg-[#F0F4F8] hover:text-[#212833]"}`}>
              <Icon size={18} />
              {i === 1 && unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#9000FF] rounded-full border border-white" />}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-4 items-center">
          <button className="p-2 rounded-md hover:bg-[#F0F4F8] text-[#5E687B] transition-colors"><Settings size={18}/></button>
          <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-7 h-7 rounded-full border border-[#E5EAF0] object-cover" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR */}
        <div ref={topBarRef} className="h-13 bg-white border-b border-[#E5EAF0] flex items-center justify-between px-5 shrink-0 relative" style={{ height: 52 }}>
          <div className="font-semibold flex items-center gap-2 text-sm">
            <span className="text-[#9000FF] tracking-tight font-bold">flowforge</span>
            <span className="text-[#E5EAF0]">/</span>
            <span className="text-[#5E687B] font-medium">
              {selectedShipmentId
                ? shipments.find(s => s.id === selectedShipmentId)?.po
                : supplierFilter ?? (channelFilter !== "all" ? channelFilter.charAt(0).toUpperCase() + channelFilter.slice(1) : "Inbox")}
            </span>
          </div>

          <div className="flex-1 max-w-lg mx-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Sparkles size={14} className="text-[#9000FF]" />
            </div>
            <input
              type="text" value={aiQuery}
              onChange={e => { setAiQuery(e.target.value); setShowAiResult(false); }}
              onKeyDown={e => { if (e.key === "Enter" && aiQuery.trim()) setShowAiResult(true); }}
              placeholder="Ask FlowForge anything...  ⌘K"
              className="w-full pl-8 pr-3 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-xs text-[#212833] placeholder-[#9E9FAE] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none"
            />
            {showAiResult && <AiResultPanel query={aiQuery} onClose={() => { setShowAiResult(false); setAiQuery(""); }} />}
          </div>

          <div className="flex items-center gap-3 text-[#5E687B]">
            <button className="hover:text-[#212833] transition-colors p-1"><Search size={16}/></button>
            <button className="hover:text-[#212833] transition-colors p-1 relative">
              <Bell size={16}/>
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white"/>}
            </button>
          </div>
        </div>

        {/* MILESTONE STRIP */}
        <div className="bg-white border-b border-[#E5EAF0] shrink-0 py-3 px-4 overflow-x-auto flex gap-3 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]" style={{ height: 128 }}>
          {shipments.map(s => {
            const isSelected = selectedShipmentId === s.id;
            return (
              <div key={s.id} onClick={() => selectShipment(s.id)}
                className={`w-[290px] shrink-0 border rounded-lg p-3 flex flex-col gap-2 cursor-pointer group transition-all ${isSelected ? "border-[#9000FF]/40 shadow-md bg-[#FAFBFF]" : "border-[#E5EAF0] bg-white hover:border-[#9000FF]/25 hover:shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className={`text-xs font-bold mb-0.5 transition-colors ${isSelected ? "text-[#9000FF]" : "text-[#212833] group-hover:text-[#9000FF]"}`}>{s.po}</div>
                    <div className="text-[10px] text-[#5E687B] truncate w-[180px]">{s.product}</div>
                  </div>
                  <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${statusStyle(s.status)}`}>
                    {s.status === "delayed" && <AlertCircle size={9}/>}
                    {s.status === "at-risk" && <Clock size={9}/>}
                    {s.status === "on-track" && <Check size={9}/>}
                    {s.dueDate}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[9px] text-[#5E687B] mb-1.5 uppercase tracking-wider">
                    <span className="font-semibold">{s.stages[s.currentStage]}</span>
                    <span>{Math.round((s.currentStage / (s.stages.length - 1)) * 100)}%</span>
                  </div>
                  <div className="flex gap-0.5 h-1.5">
                    {s.stages.map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full transition-all ${
                        idx < s.currentStage ? stageBarColor(s.status)
                        : idx === s.currentStage ? `${activeStageColor(s.status)} animate-pulse`
                        : "bg-[#E5EAF0]"}`}/>
                    ))}
                  </div>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1 text-[9px] text-[#9000FF] font-semibold">
                    <Filter size={8}/> Filtering inbox to this PO
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3-COLUMN INBOX */}
        <div className="flex-1 flex overflow-hidden">

          {/* Col 1 — Filters */}
          <div className="w-[220px] bg-[#FAFBFC] border-r border-[#E5EAF0] flex flex-col shrink-0">
            <div className="p-3 border-b border-[#E5EAF0]">
              <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Channels</div>
              <div className="flex flex-col gap-0.5">
                {([
                  { id:"all",       label:"All Inbox",  count: messages.length,                        icon: <Inbox size={13}/> },
                  { id:"gmail",     label:"Gmail",      count: messages.filter(m=>m.channel==="gmail").length,    icon: <Mail size={13}/> },
                  { id:"whatsapp",  label:"WhatsApp",   count: messages.filter(m=>m.channel==="whatsapp").length, icon: <MessageCircle size={13}/> },
                  { id:"sheets",    label:"Sheets",     count: messages.filter(m=>m.channel==="sheets").length,   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg> },
                  { id:"pdf",       label:"PDFs",       count: messages.filter(m=>m.channel==="pdf").length,      icon: <FileText size={13}/> },
                ] as { id: Channel|"all"; label:string; count:number; icon: React.ReactNode }[]).map(f => {
                  const active = channelFilter === f.id && !selectedShipmentId && !supplierFilter;
                  const unread = f.id === "all" ? messages.filter(m=>m.unread).length : messages.filter(m=>m.channel===f.id&&m.unread).length;
                  return (
                    <button key={f.id} onClick={() => toggleChannel(f.id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${active ? "bg-white border border-[#E5EAF0] text-[#212833] shadow-sm font-semibold" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                      <span className="flex items-center gap-2">{f.icon}{f.label}</span>
                      {unread > 0
                        ? <span className="text-[10px] bg-[#9000FF] text-white px-1.5 rounded-full font-bold">{unread}</span>
                        : <span className="text-[10px] text-[#5E687B]">{f.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Suppliers</div>
                {supplierFilter && (
                  <button onClick={() => setSupplierFilter(null)} className="text-[#9000FF] text-[10px] hover:underline flex items-center gap-0.5">
                    <X size={9}/> Clear
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {SUPPLIERS.map(s => (
                  <button key={s.id} onClick={() => toggleSupplier(s.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${supplierFilter===s.id ? "bg-white border border-[#9000FF]/30 text-[#9000FF] font-semibold shadow-sm" : "text-[#212833] hover:bg-[#F0F4F8]"}`}>
                    <span className="truncate pr-2">{s.label}</span>
                    <span className="text-[10px] bg-white border border-[#E5EAF0] px-1.5 rounded text-[#5E687B] shrink-0">{s.count}</span>
                  </button>
                ))}
              </div>

              {(selectedShipmentId || supplierFilter || channelFilter !== "all") && (
                <button onClick={() => { setSelectedShipmentId(null); setSupplierFilter(null); setChannelFilter("all"); }}
                  className="mt-4 w-full text-[10px] text-[#5E687B] hover:text-[#212833] flex items-center justify-center gap-1 py-1.5 border border-dashed border-[#E5EAF0] rounded-md hover:border-[#D6E3EB] transition-colors">
                  <X size={10}/> Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Col 2 — Thread List */}
          <div className="flex-1 min-w-[300px] bg-white border-r border-[#E5EAF0] flex flex-col">
            <div className="h-10 border-b border-[#E5EAF0] px-4 flex items-center justify-between shrink-0">
              <div className="font-semibold text-xs text-[#212833]">
                {visibleMessages.length} {visibleMessages.length === 1 ? "thread" : "threads"}
                {(selectedShipmentId || supplierFilter || channelFilter !== "all") && (
                  <span className="ml-1.5 text-[#9000FF] font-normal">— filtered</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[#5E687B]">
                <button className="p-1 hover:bg-[#F0F4F8] rounded"><MoreHorizontal size={14}/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {visibleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#5E687B] gap-2">
                  <Inbox size={24} className="opacity-30"/>
                  <p className="text-xs">No threads match this filter</p>
                </div>
              ) : visibleMessages.map(msg => {
                const replied = repliedIds.has(msg.id);
                return (
                  <div key={msg.id} onClick={() => openMessage(msg.id)}
                    className={`px-4 py-3 border-b border-[#E5EAF0] cursor-pointer hover:bg-[#FAFBFC] transition-colors relative ${activeMessageId === msg.id ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : "border-l-2 border-l-transparent"}`}>
                    {msg.unread && !replied && <div className="absolute left-2.5 top-4 w-1.5 h-1.5 bg-[#9000FF] rounded-full"/>}
                    <div className="flex items-start justify-between mb-1 pl-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-semibold text-xs truncate ${msg.unread && !replied ? "text-[#212833]" : "text-[#5E687B]"}`}>{msg.sender}</span>
                        {chIcon(msg.channel)}
                        {replied && <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 rounded-full font-medium flex items-center gap-0.5"><Check size={8}/>Replied</span>}
                      </div>
                      <span className={`text-[10px] shrink-0 ml-2 ${msg.unread && !replied ? "text-[#9000FF] font-semibold" : "text-[#5E687B]"}`}>{msg.timestamp}</span>
                    </div>
                    <div className={`text-xs pl-3 mb-1.5 line-clamp-2 leading-relaxed ${msg.unread && !replied ? "text-[#212833]" : "text-[#9E9FAE]"}`}>{msg.snippet}</div>
                    <div className="flex flex-wrap gap-1 pl-3">
                      {msg.aiTags.map(tag => (
                        <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] flex items-center gap-0.5">
                          {tag.startsWith("risk") || tag.startsWith("delay") ? <AlertCircle size={7} className="text-red-500"/> : <Sparkles size={7} className="text-[#9000FF]"/>}
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 3 — Thread detail */}
          <div className="w-[460px] bg-white flex flex-col shrink-0 border-l border-[#E5EAF0]">

            {/* Shipment context */}
            {activeShipment && (
              <div className="border-b border-[#E5EAF0] p-4 bg-[#FAFBFC] shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs text-[#212833]">{activeShipment.po}</span>
                      <span className="text-[10px] bg-[#E5EAF0] text-[#5E687B] px-1.5 rounded font-medium">{activeShipment.customer}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusStyle(activeShipment.status)}`}>
                        {activeShipment.status === "on-track" ? <Check size={8}/> : <AlertCircle size={8}/>}
                        {activeShipment.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#5E687B]">{activeShipment.product}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-0.5">Ex-Factory</div>
                    <div className="text-xs font-bold text-[#212833]">{activeShipment.dueDate}</div>
                  </div>
                </div>

                {/* Stage progress */}
                <div className="bg-white rounded-lg border border-[#E5EAF0] p-2.5">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="font-semibold text-[#212833] flex items-center gap-1">
                      <MapPin size={10} className="text-[#9000FF]"/>
                      {activeShipment.stages[activeShipment.currentStage]}
                    </span>
                    <span className="text-[#5E687B]">{Math.round((activeShipment.currentStage / (activeShipment.stages.length - 1)) * 100)}% complete</span>
                  </div>
                  <div className="flex gap-0.5 h-1.5 mb-2">
                    {activeShipment.stages.map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full transition-all duration-500 ${
                        idx < activeShipment.currentStage ? "bg-[#9000FF]"
                        : idx === activeShipment.currentStage ? "bg-[#9000FF] opacity-50"
                        : "bg-[#E5EAF0]"}`}/>
                    ))}
                  </div>
                  {/* Stage labels — next 3 upcoming */}
                  <div className="flex gap-2 overflow-x-auto">
                    {activeShipment.stages.slice(activeShipment.currentStage, activeShipment.currentStage + 4).map((stage, i) => (
                      <div key={stage} className={`text-[9px] flex items-center gap-1 shrink-0 ${i === 0 ? "text-[#9000FF] font-bold" : "text-[#5E687B]"}`}>
                        {i > 0 && <ChevronRight size={9} className="text-[#C0C8D4]"/>}
                        {stage}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#F0F4F8] flex items-center justify-center text-base font-bold text-[#5E687B] shrink-0">
                  {activeMessage.sender.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#212833]">{activeMessage.sender}</div>
                  <div className="text-[10px] text-[#5E687B] flex items-center gap-1">
                    {chIcon(activeMessage.channel, 10)}
                    via {activeMessage.channel === "whatsapp" ? "WhatsApp" : activeMessage.channel === "gmail" ? "Gmail" : activeMessage.channel === "sheets" ? "Google Sheets" : "PDF"}
                    <span className="text-[#C0C8D4]">·</span>
                    {activeMessage.timestamp}
                  </div>
                </div>
                {repliedIds.has(activeMessage.id) && (
                  <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 size={10}/> Replied
                  </span>
                )}
              </div>

              <div className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm mb-4 text-xs text-[#212833] whitespace-pre-wrap leading-relaxed">
                {activeMessage.fullBody}
              </div>

              {/* AI panel */}
              {activeMessage.aiAction && (
                <div className="bg-gradient-to-br from-[#9000FF]/5 to-transparent border border-[#9000FF]/20 rounded-xl p-3.5 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-20 h-20 bg-[#9000FF]/8 rounded-full blur-2xl pointer-events-none"/>
                  <div className="flex items-start gap-2.5 relative">
                    <Wand2 size={14} className="text-[#9000FF] mt-0.5 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold text-[#9000FF] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Zap size={8}/> AI Suggested Action
                      </div>
                      <div className="text-xs text-[#212833] mb-2.5 font-medium">{activeMessage.aiAction}</div>
                      {activeMessage.aiDraft && (
                        <div className="bg-white border border-[#E5EAF0] rounded-lg p-2.5 text-[11px] text-[#5E687B] mb-3 leading-relaxed font-mono">
                          "{activeMessage.aiDraft}"
                        </div>
                      )}
                      {!repliedIds.has(activeMessage.id) ? (
                        <div className="flex gap-2">
                          <button onClick={() => sendReply(activeMessage.id)}
                            className="bg-[#9000FF] text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#7A00D9] transition-colors flex items-center gap-1.5 shadow-sm">
                            <Send size={11}/> Send & Update
                          </button>
                          <button onClick={editDraft}
                            className="bg-white border border-[#E5EAF0] text-[#212833] px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#F0F4F8] transition-colors">
                            Edit Draft
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 size={13}/> Sent — milestone advanced
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compose */}
            <div className="p-3 border-t border-[#E5EAF0] bg-white shrink-0">
              <div className="border border-[#E5EAF0] rounded-xl overflow-hidden focus-within:border-[#9000FF]/40 focus-within:ring-1 focus-within:ring-[#9000FF]/15 transition-all">
                <textarea
                  value={composeText}
                  onChange={e => setComposeText(e.target.value)}
                  placeholder={repliedIds.has(activeMessage.id) ? "Follow up..." : "Type a reply or use Edit Draft above..."}
                  className="w-full p-3 h-16 outline-none resize-none text-xs bg-transparent leading-relaxed"
                />
                <div className="bg-[#FAFBFC] border-t border-[#E5EAF0] p-2 flex items-center justify-between">
                  <div className="flex gap-1 text-[#5E687B]">
                    <button className="p-1 hover:bg-[#E5EAF0] rounded transition-colors"><Paperclip size={14}/></button>
                    <button onClick={editDraft} className="p-1 hover:bg-[#E5EAF0] rounded transition-colors" title="Insert AI draft">
                      <Sparkles size={14} className="text-[#9000FF]"/>
                    </button>
                  </div>
                  <button
                    onClick={() => { if (composeText.trim()) sendReply(activeMessage.id); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${composeText.trim() ? "bg-[#212833] text-white hover:bg-black" : "bg-[#F0F4F8] text-[#9E9FAE] cursor-not-allowed"}`}>
                    Reply <Send size={11}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Briefing */}
      <div className={`fixed bottom-5 right-5 w-[320px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5EAF0] overflow-hidden transition-all duration-300 z-40 flex flex-col ${aiBriefingExpanded ? "h-[360px]" : "h-[58px]"}`}>
        <div onClick={() => setAiBriefingExpanded(v => !v)}
          className="p-3.5 flex items-center justify-between cursor-pointer bg-gradient-to-r from-[#9000FF]/5 to-transparent hover:bg-[#FAFBFC] transition-colors shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF]">
              <Sparkles size={14}/>
            </div>
            <div>
              <div className="text-xs font-bold text-[#212833]">Daily Briefing</div>
              {!aiBriefingExpanded && (
                <div className="text-[10px] text-[#5E687B]">
                  {2 - dismissedCards.size > 0 ? `${2 - dismissedCards.size} action${2 - dismissedCards.size > 1 ? "s" : ""} pending` : "All clear — great work!"}
                </div>
              )}
            </div>
          </div>
          <ChevronDown size={14} className={`text-[#5E687B] transition-transform ${aiBriefingExpanded ? "rotate-0" : "rotate-180"}`}/>
        </div>

        {aiBriefingExpanded && (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-[#FAFBFC]">

            {!dismissedCards.has("lahore") && (
              <div className="bg-white border border-[#E5EAF0] rounded-lg p-3 shadow-sm">
                <div className="flex items-start gap-2 mb-1.5">
                  <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0"/>
                  <div className="font-semibold text-xs text-[#212833]">Lahore Denim Co. — delay request</div>
                </div>
                <div className="text-[10px] text-[#5E687B] mb-2.5">Strike-off delayed 2d. PO-2026-0142 Ex-Factory moves to May 17.</div>
                <div className="flex gap-2">
                  <button onClick={() => { approveDelay("s1"); setDismissedCards(p => new Set(p).add("lahore")); setToast("Schedule change approved — PO-2026-0142 updated"); }}
                    className="flex-1 py-1.5 bg-[#9000FF] text-white text-[10px] font-semibold rounded hover:bg-[#7A00D9] transition-colors">
                    Approve Change
                  </button>
                  <button onClick={() => { openMessage("m1"); setAiBriefingExpanded(false); }}
                    className="flex-1 py-1.5 bg-[#F0F4F8] text-[#212833] text-[10px] font-medium rounded hover:bg-[#E5EAF0] transition-colors">
                    View Thread
                  </button>
                </div>
              </div>
            )}

            {!dismissedCards.has("yangtze") && (
              <div className="bg-white border border-[#E5EAF0] rounded-lg p-3 shadow-sm">
                <div className="flex items-start gap-2 mb-1.5">
                  <Check size={13} className="text-emerald-500 mt-0.5 shrink-0"/>
                  <div className="font-semibold text-xs text-[#212833]">Yangtze Knit — lab dip approved</div>
                </div>
                <div className="text-[10px] text-[#5E687B] mb-2.5">Ready to advance PO-2026-0157 from Proto Sample → Bulk.</div>
                <div className="flex gap-2">
                  <button onClick={() => { advanceStage("s2"); setDismissedCards(p => new Set(p).add("yangtze")); setToast("Milestone logged — PO-2026-0157 advanced to Bulk"); }}
                    className="flex-1 py-1.5 bg-[#9000FF] text-white text-[10px] font-semibold rounded hover:bg-[#7A00D9] transition-colors">
                    Log Milestone
                  </button>
                  <button onClick={() => { openMessage("m2"); setAiBriefingExpanded(false); }}
                    className="flex-1 py-1.5 bg-[#F0F4F8] text-[#212833] text-[10px] font-medium rounded hover:bg-[#E5EAF0] transition-colors">
                    View Thread
                  </button>
                </div>
              </div>
            )}

            {dismissedCards.size >= 2 && (
              <div className="flex flex-col items-center justify-center py-4 gap-2 text-[#5E687B]">
                <CheckCircle2 size={24} className="text-emerald-400"/>
                <p className="text-xs font-medium">All items resolved</p>
              </div>
            )}

            <button className="text-[10px] text-[#9000FF] font-semibold hover:underline flex items-center justify-center gap-1 mt-1">
              View full briefing <ArrowRight size={10}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
