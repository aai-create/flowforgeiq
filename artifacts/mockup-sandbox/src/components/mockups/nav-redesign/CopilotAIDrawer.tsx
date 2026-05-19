import { useState } from "react";
import {
  Inbox, Package, BarChart3, ShieldAlert, Sparkles, FileText,
  Check, Bell, Zap, Send, Paperclip, Mail, ChevronRight,
  CreditCard, X, ArrowUpRight, CheckCircle2, Search, Upload,
  ChevronDown, MessageSquare, Filter
} from "lucide-react";

const NAV_ITEMS = [
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "shipments", icon: Package, label: "Shipments" },
  { id: "reports", icon: BarChart3, label: "Reports" },
  { id: "risk", icon: ShieldAlert, label: "Risk" },
  { id: "docs", icon: FileText, label: "Docs" },
];

const VIEWS = [
  { id: "risk", icon: ShieldAlert, label: "Risk Radar", sub: "24 active POs", color: "text-purple-600" },
  { id: "shipments", icon: Package, label: "Shipments", sub: "47 total", color: "text-blue-600" },
  { id: "reports", icon: BarChart3, label: "Reports", sub: "3 dashboards", color: "text-emerald-600" },
  { id: "copilot", icon: Sparkles, label: "Copilot", sub: "5 actions ready", color: "text-amber-600" },
];

const THREADS = [
  { id: "t1", sender: "Shenzhen LEDPro", channel: "gmail", time: "Just now", snippet: "Production update: PCB soldering complete, entering housing assembly.", unread: true },
  { id: "t2", sender: "Guangzhou Metalworks", channel: "whatsapp", time: "10:42 AM", snippet: "Strike-off finish coat needs +2 days, polishing line backed up.", unread: true },
  { id: "t3", sender: "Hangzhou Timber Co.", channel: "whatsapp", time: "Yesterday", snippet: "Port congestion at Tianjin. Revised ex-factory: June 6.", unread: false },
];

const ALL_ACTIONS = [
  { id: "a1", shipment: "PO-1001", sender: "Guangzhou Metalworks", type: "reply", priority: "high", title: "Approve 2-day delay", detail: "Reply to confirm revised ex-factory date of May 17 for PO-2026-0142.", done: false },
  { id: "a2", shipment: "PO-1002", sender: "Shenzhen LEDPro", type: "payment", priority: "high", title: "Schedule balance payment $11,900", detail: "Initiate wire transfer before May 18 container release.", done: false },
  { id: "a3", shipment: "PO-1004", sender: "Tianjin Wire Works", type: "reply", priority: "high", title: "Port congestion — reply needed", detail: "Notify customer of 4-day delay. Update shipment stage.", done: false },
  { id: "a4", shipment: "PO-1002", sender: "System", type: "task", priority: "medium", title: "Book QC inspection", detail: "Schedule SGS inspection before May 18 ex-factory.", done: false },
  { id: "a5", shipment: "PO-1003", sender: "System", type: "task", priority: "medium", title: "Select factory quote", detail: "Foshan Grid Factory quote pending approval.", done: true },
];

const typeIcon = (t: string) => {
  if (t === "reply") return <Send size={11} className="text-[#9000FF]" />;
  if (t === "payment") return <CreditCard size={11} className="text-amber-500" />;
  return <CheckCircle2 size={11} className="text-emerald-500" />;
};

export function CopilotAIDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeThread, setActiveThread] = useState("t1");
  const [actions, setActions] = useState(ALL_ACTIONS);
  const [activeRightTab, setActiveRightTab] = useState("message");

  const pendingCount = actions.filter(a => !a.done).length;
  const done = (id: string) => setActions(prev => prev.map(a => a.id === id ? { ...a, done: true } : a));

  return (
    <div className="h-screen flex overflow-hidden bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      {/* Far-left icon strip */}
      <div className="w-14 shrink-0 bg-white border-r border-[#E5EAF0] flex flex-col items-center py-3 gap-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center mb-3">
          <Zap size={16} className="text-white" />
        </div>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${item.id === "inbox" ? "bg-[#9000FF]/10 text-[#9000FF]" : "text-[#9E9FAE] hover:text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
            <item.icon size={17} />
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9E9FAE] hover:bg-[#F0F4F8]"><Bell size={16} /></button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center text-white text-[10px] font-bold">JM</div>
      </div>

      {/* Left filter panel */}
      <div className="w-52 shrink-0 bg-white border-r border-[#E5EAF0] flex flex-col overflow-hidden">
        <div className="h-11 border-b border-[#E5EAF0] flex items-center px-3 gap-2 shrink-0">
          <Search size={13} className="text-[#9E9FAE]" />
          <input placeholder="Search…" className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-[#C0C8D4]" />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1">Messages</p>
          {[{ id: "all", label: "All Inbox", count: 8 }, { id: "gmail", label: "Gmail", count: 2 }, { id: "whatsapp", label: "WhatsApp", count: 4 }].map(ch => (
            <button key={ch.id} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#5E687B] hover:bg-[#F0F4F8] rounded-lg mx-1">
              <span className="flex-1 text-[11px] font-medium">{ch.label}</span>
              <span className="text-[9px] font-bold bg-[#F0F4F8] text-[#9E9FAE] px-1.5 py-0.5 rounded-full">{ch.count}</span>
            </button>
          ))}

          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-4">Views</p>
          {VIEWS.map(v => (
            <button key={v.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#5E687B] hover:bg-[#F0F4F8] transition-colors rounded-lg mx-1">
              <v.icon size={13} className={v.color} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[#212833] truncate">{v.label}</p>
                <p className="text-[9px] text-[#9E9FAE]">{v.sub}</p>
              </div>
              <ChevronRight size={11} className="text-[#C0C8D4]" />
            </button>
          ))}
        </div>
        <div className="shrink-0 p-2 border-t border-[#E5EAF0]">
          <button className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-[#9000FF] hover:bg-[#9000FF]/5">
            <Upload size={12} />
            <span className="text-[10px] font-semibold">Import Documents</span>
          </button>
        </div>
      </div>

      {/* Middle: Thread list */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
        <div className="h-11 border-b border-[#E5EAF0] flex items-center px-3 gap-2 shrink-0">
          <span className="text-xs font-bold text-[#212833] flex-1">8 threads</span>
          <Filter size={13} className="text-[#9E9FAE]" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {THREADS.map(t => (
            <button key={t.id} onClick={() => setActiveThread(t.id)}
              className={`w-full text-left px-3 py-3 border-b border-[#F0F4F8] flex gap-2.5 transition-colors ${t.id === activeThread ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : "hover:bg-[#FAFBFF]"}`}>
              <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF] text-[9px] font-bold shrink-0">
                {t.sender.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`text-[11px] font-semibold truncate ${t.unread ? "text-[#212833]" : "text-[#5E687B]"}`}>{t.sender}</span>
                  {t.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0" />}
                  <span className="text-[9px] text-[#9E9FAE] ml-auto">{t.time}</span>
                </div>
                <p className="text-[10px] text-[#5E687B] truncate">{t.snippet}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Message detail + sliding copilot drawer */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center px-4 gap-3 shrink-0 z-10">
          <span className="text-[10px] font-mono font-bold text-[#212833]">PO-1002-783656</span>
          <span className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-1.5 py-0.5 rounded font-medium">Northbound Outfitters</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-0.5"><Check size={8} />on-track</span>
          <div className="flex-1" />
          {/* Copilot toggle button — persistent in header */}
          <button onClick={() => setDrawerOpen(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${drawerOpen ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-amber-200 hover:text-amber-700"}`}>
            <Sparkles size={12} className={drawerOpen ? "text-amber-500" : "text-[#9E9FAE]"} />
            Copilot
            {pendingCount > 0 && (
              <span className="text-[8px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
            <ChevronDown size={11} className={`transition-transform ${drawerOpen ? "rotate-180" : ""}`} />
          </button>
          <div className="text-right">
            <p className="text-[9px] font-bold text-[#5E687B]">EX-FACTORY</p>
            <p className="text-[10px] font-bold text-[#212833]">May 18</p>
          </div>
        </div>

        {/* Copilot slide-down drawer */}
        {drawerOpen && (
          <div className="shrink-0 bg-amber-50/80 border-b border-amber-200 shadow-sm z-10">
            <div className="px-4 pt-2 pb-1 flex items-center gap-2">
              <Sparkles size={12} className="text-amber-500" />
              <span className="text-[11px] font-bold text-amber-800">Copilot · {pendingCount} actions across your portfolio</span>
              <button onClick={() => setDrawerOpen(false)} className="ml-auto p-0.5 text-amber-400 hover:text-amber-600"><X size={13} /></button>
            </div>
            {/* Horizontal action strip */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
              {actions.filter(a => !a.done).map(action => (
                <div key={action.id} className="flex-none w-64 bg-white border border-amber-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FAFBFC] border border-[#E5EAF0] flex items-center justify-center shrink-0">
                      {typeIcon(action.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#212833] leading-tight">{action.title}</p>
                      <p className="text-[9px] text-[#9E9FAE]">{action.shipment} · {action.sender}</p>
                    </div>
                    <span className={`text-[7px] font-bold px-1 py-0.5 rounded border shrink-0 ${action.priority === "high" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                      {action.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#5E687B] mb-2 leading-relaxed">{action.detail}</p>
                  <button onClick={() => done(action.id)}
                    className="w-full bg-[#9000FF] text-white text-[9px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-[#7A00D9] transition-colors">
                    <Check size={9} />Approve
                  </button>
                </div>
              ))}
              {pendingCount === 0 && (
                <div className="flex items-center gap-2 py-2 text-amber-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[11px] font-semibold">All actions handled — great work!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="shrink-0 bg-white border-b border-[#E5EAF0] flex items-center px-4">
          {["Message", "Docs 3", "Risk"].map((tab, i) => (
            <button key={tab} onClick={() => setActiveRightTab(tab.toLowerCase().split(" ")[0])}
              className={`text-[11px] font-semibold py-2.5 px-3 border-b-2 transition-colors ${activeRightTab === tab.toLowerCase().split(" ")[0] ? "border-[#9000FF] text-[#9000FF]" : "border-transparent text-[#9E9FAE] hover:text-[#5E687B]"}`}>{tab}</button>
          ))}
          <div className="flex-1" />
          {/* Payment chips */}
          <div className="flex gap-1.5">
            {[{ label: "Deposit: $1,512 paid", paid: true }, { label: "Balance: $3,528 due May 20", paid: false }].map((p, i) => (
              <span key={i} className={`flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded border ${p.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                {p.paid ? <CheckCircle2 size={8} /> : <CreditCard size={8} />}{p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Message content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#FAFBFC]">
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600 shrink-0">SL</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#212833]">Shenzhen LEDPro</span>
                <Mail size={10} className="text-[#9E9FAE]" />
                <span className="text-[10px] text-[#9E9FAE]">Just now</span>
              </div>
              <div className="bg-white rounded-xl border border-[#E5EAF0] p-3 shadow-sm">
                <p className="text-[11px] text-[#212833] leading-relaxed">Hello, production update on PO-2026-0157. PCB soldering is complete and units are now entering housing assembly. On track for May 18 ex-factory. Balance of $11,900 due before release.</p>
              </div>
            </div>
          </div>

          {/* AI draft */}
          <div className="mx-9 bg-[#9000FF]/5 border border-[#9000FF]/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={11} className="text-[#9000FF]" />
              <span className="text-[10px] font-bold text-[#9000FF]">AI Draft</span>
            </div>
            <p className="text-[11px] text-[#212833] leading-relaxed">Thanks David — noted on progress. Please send final QC photos before ex-factory release. We'll arrange balance wire transfer once inspection passes.</p>
            <div className="flex gap-2 mt-2">
              <button className="text-[9px] font-bold bg-[#9000FF] text-white px-2.5 py-1 rounded-lg flex items-center gap-1"><Check size={9} />Use Draft</button>
              <button className="text-[9px] font-semibold text-[#5E687B] border border-[#E5EAF0] px-2.5 py-1 rounded-lg">Edit</button>
            </div>
          </div>
        </div>

        {/* Compose */}
        <div className="shrink-0 border-t border-[#E5EAF0] bg-white px-4 py-3">
          <div className="flex items-center gap-2 bg-[#F8F9FB] border border-[#E5EAF0] rounded-xl px-3 py-2">
            <input placeholder="Type a reply or use AI Draft above…" className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-[#C0C8D4]" />
            <Paperclip size={13} className="text-[#9E9FAE]" />
            <Sparkles size={13} className="text-[#9E9FAE]" />
            <button className="bg-[#9000FF] text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Send size={10} />Reply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
