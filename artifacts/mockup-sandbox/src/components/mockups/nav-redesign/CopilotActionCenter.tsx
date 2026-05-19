import { useState } from "react";
import {
  Inbox, Package, BarChart3, ShieldAlert, Sparkles, FileText,
  Check, AlertCircle, Bell, Zap, Send, Paperclip, Mail,
  MessageSquare, ChevronRight, CreditCard, RefreshCw, ArrowUpRight,
  CheckCircle2, X, Clock, Filter, Search, Upload
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
  { id: "t1", sender: "Shenzhen LEDPro", channel: "gmail", time: "Just now", snippet: "Production update: PCB soldering complete, entering housing assembly.", unread: true, po: "PO-1002" },
  { id: "t2", sender: "Guangzhou Metalworks", channel: "whatsapp", time: "10:42 AM", snippet: "Strike-off finish coat needs +2 days, polishing line backed up.", unread: true, po: "PO-1001" },
  { id: "t3", sender: "Hangzhou Timber Co.", channel: "whatsapp", time: "Yesterday", snippet: "Port congestion at Tianjin terminal. Revised ex-factory: June 6.", unread: false, po: "PO-1004" },
];

// Copilot actions for the active thread
const COPILOT_ACTIONS = [
  {
    id: "a1",
    type: "reply",
    priority: "high",
    title: "Send acknowledgment reply",
    summary: "Confirm production progress, request QC photos, schedule balance payment.",
    draft: "Thanks David — noted on progress. Please send final QC photos before ex-factory release. We'll arrange balance wire transfer once inspection passes.",
    impact: "Keeps PO-1002 on track for May 18",
    approved: false,
  },
  {
    id: "a2",
    type: "payment",
    priority: "high",
    title: "Schedule balance payment — $11,900",
    summary: "Balance due before container release. PO-1002-783656 · Shenzhen LEDPro",
    draft: null,
    impact: "Unblocks ex-factory on May 18",
    approved: false,
  },
  {
    id: "a3",
    type: "task",
    priority: "medium",
    title: "Book QC inspection — Shenzhen LEDPro",
    summary: "Units entering final assembly. Inspection needed before ex-factory release.",
    draft: null,
    impact: "Ensures quality gate before shipment",
    approved: false,
  },
];

const priorityColor = (p: string) =>
  p === "high" ? "text-red-600 bg-red-50 border-red-100" : "text-amber-600 bg-amber-50 border-amber-100";

const typeIcon = (t: string) => {
  if (t === "reply") return <Send size={11} className="text-[#9000FF]" />;
  if (t === "payment") return <CreditCard size={11} className="text-amber-500" />;
  return <CheckCircle2 size={11} className="text-emerald-500" />;
};

export function CopilotActionCenter() {
  const [activeThread, setActiveThread] = useState("t1");
  const [actions, setActions] = useState(COPILOT_ACTIONS);
  const [activeTab, setActiveTab] = useState<"message" | "copilot" | "docs">("copilot");

  const approve = (id: string) => setActions(prev => prev.map(a => a.id === id ? { ...a, approved: true } : a));
  const dismiss = (id: string) => setActions(prev => prev.filter(a => a.id !== id));

  const pendingCount = actions.filter(a => !a.approved).length;

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
        <div className="relative">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9E9FAE] hover:bg-[#F0F4F8]"><Bell size={16} /></button>
        </div>
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
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors rounded-lg mx-1 ${v.id === "copilot" ? "bg-amber-50 text-amber-700" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
              <v.icon size={13} className={v.id === "copilot" ? "text-amber-500" : v.color} />
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${v.id === "copilot" ? "text-amber-800" : "text-[#212833]"}`}>{v.label}</p>
                <p className="text-[9px] text-[#9E9FAE]">{v.sub}</p>
              </div>
              {v.id === "copilot" ? (
                <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">5</span>
              ) : (
                <ChevronRight size={11} className="text-[#C0C8D4]" />
              )}
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
      <div className="w-[300px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
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

      {/* Right: Detail + Copilot panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Shipment header */}
        <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center px-4 gap-3 shrink-0">
          <span className="text-[10px] font-mono font-bold text-[#212833]">PO-1002-783656</span>
          <span className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-1.5 py-0.5 rounded font-medium">Northbound Outfitters</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-0.5"><Check size={8} />on-track</span>
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-[9px] font-bold text-[#5E687B]">EX-FACTORY</p>
            <p className="text-[10px] font-bold text-[#212833]">May 18</p>
          </div>
        </div>

        {/* Tabs — Copilot as a first-class tab */}
        <div className="shrink-0 bg-white border-b border-[#E5EAF0] flex items-center px-4 gap-1">
          {([
            { id: "message", label: "Message" },
            { id: "copilot", label: "Copilot" },
            { id: "docs", label: "Docs 3" },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-[11px] font-semibold py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === tab.id
                ? tab.id === "copilot" ? "border-amber-400 text-amber-700" : "border-[#9000FF] text-[#9000FF]"
                : "border-transparent text-[#9E9FAE] hover:text-[#5E687B]"}`}>
              {tab.id === "copilot" && <Sparkles size={11} className={activeTab === "copilot" ? "text-amber-500" : "text-[#9E9FAE]"} />}
              {tab.label}
              {tab.id === "copilot" && pendingCount > 0 && (
                <span className="text-[8px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "copilot" ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#FAFBFC]">
            {/* Context summary */}
            <div className="bg-[#9000FF]/5 border border-[#9000FF]/15 rounded-xl p-3 flex items-start gap-2">
              <Sparkles size={14} className="text-[#9000FF] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[#9000FF] mb-0.5">Copilot · 3 actions for this thread</p>
                <p className="text-[10px] text-[#5E687B]">Shenzhen LEDPro just updated production progress. Balance payment due before release. QC inspection not yet scheduled.</p>
              </div>
            </div>

            {/* Action cards */}
            {actions.map(action => (
              <div key={action.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${action.approved ? "opacity-60 border-emerald-100" : "border-[#E5EAF0]"}`}>
                <div className="flex items-start gap-3 p-3">
                  <div className="w-7 h-7 rounded-lg bg-[#FAFBFC] border border-[#E5EAF0] flex items-center justify-center shrink-0">
                    {typeIcon(action.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-[#212833]">{action.title}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${priorityColor(action.priority)}`}>{action.priority}</span>
                      {action.approved && <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5 ml-auto"><CheckCircle2 size={9} />Approved</span>}
                    </div>
                    <p className="text-[10px] text-[#5E687B]">{action.summary}</p>
                    {action.impact && (
                      <p className="text-[9px] text-emerald-600 mt-1 flex items-center gap-0.5">
                        <ArrowUpRight size={9} />{action.impact}
                      </p>
                    )}
                  </div>
                </div>

                {/* Draft preview */}
                {action.draft && !action.approved && (
                  <div className="mx-3 mb-3 bg-[#9000FF]/4 border border-[#9000FF]/15 rounded-lg p-2.5">
                    <p className="text-[9px] font-bold text-[#9000FF] mb-1">Draft reply</p>
                    <p className="text-[10px] text-[#212833] leading-relaxed">{action.draft}</p>
                  </div>
                )}

                {!action.approved && (
                  <div className="border-t border-[#F0F4F8] px-3 py-2 flex items-center gap-2 bg-[#FAFBFC]">
                    <button onClick={() => approve(action.id)}
                      className="flex items-center gap-1.5 bg-[#9000FF] text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#7A00D9] transition-colors">
                      <Check size={10} />Approve & Execute
                    </button>
                    {action.draft && (
                      <button className="text-[10px] font-semibold text-[#5E687B] px-2 py-1.5 rounded-lg hover:bg-[#F0F4F8] border border-[#E5EAF0]">
                        Edit draft
                      </button>
                    )}
                    <button onClick={() => dismiss(action.id)} className="ml-auto p-1 text-[#C0C8D4] hover:text-[#9E9FAE]"><X size={13} /></button>
                  </div>
                )}
              </div>
            ))}

            {actions.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-center py-8">
                <div>
                  <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#212833]">All actions handled</p>
                  <p className="text-[11px] text-[#9E9FAE]">Copilot will surface new suggestions as threads update.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Message tab */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#FAFBFC]">
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600 shrink-0">SL</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-[#212833]">Shenzhen LEDPro</span>
                    <Mail size={10} className="text-[#9E9FAE]" />
                    <span className="text-[10px] text-[#9E9FAE]">Just now</span>
                  </div>
                  <div className="bg-white rounded-xl border border-[#E5EAF0] p-3">
                    <p className="text-[11px] text-[#212833] leading-relaxed">Production update on PO-2026-0157. PCB soldering is complete. Units entering housing assembly. On track for May 18 ex-factory. Balance of $11,900 due before release.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-[#E5EAF0] bg-white px-4 py-3">
              <div className="flex items-center gap-2 bg-[#F8F9FB] border border-[#E5EAF0] rounded-xl px-3 py-2">
                <input placeholder="Type a reply…" className="flex-1 text-[11px] bg-transparent outline-none placeholder:text-[#C0C8D4]" />
                <Paperclip size={13} className="text-[#9E9FAE]" />
                <button className="bg-[#9000FF] text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"><Send size={10} />Reply</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
