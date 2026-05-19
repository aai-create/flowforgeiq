import { useState } from "react";
import {
  Inbox, Package, BarChart3, ShieldAlert, Sparkles, Mail, MessageSquare,
  FileSpreadsheet, FileText, ChevronRight, Check, AlertCircle, CreditCard,
  CheckCircle2, Clock, Star, Search, Filter, MoreHorizontal, Send,
  Paperclip, ArrowUpRight, User, Settings, Upload, Bell, Zap
} from "lucide-react";

const NAV_ITEMS = [
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "shipments", icon: Package, label: "Shipments" },
  { id: "reports", icon: BarChart3, label: "Reports" },
  { id: "risk", icon: ShieldAlert, label: "Risk" },
  { id: "docs", icon: FileText, label: "Docs" },
];

const CHANNELS = [
  { id: "all", label: "All Inbox", count: 8 },
  { id: "gmail", label: "Gmail", icon: Mail, count: 2 },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, count: 4 },
  { id: "sheets", label: "Sheets", icon: FileSpreadsheet, count: 1 },
  { id: "pdfs", label: "PDFs", icon: FileText, count: 1 },
];

const VIEWS = [
  { id: "risk", icon: ShieldAlert, label: "Risk Radar", sub: "24 active POs", color: "text-purple-600" },
  { id: "shipments", icon: Package, label: "Shipments", sub: "47 total", color: "text-blue-600" },
  { id: "reports", icon: BarChart3, label: "Reports", sub: "3 dashboards", color: "text-emerald-600" },
  { id: "copilot", icon: Sparkles, label: "Copilot", sub: "5 actions ready", color: "text-amber-600" },
];

const POS = ["PO-1001-778143", "PO-1002-783656", "PO-1003-F18SAF0259", "PO-1004-792884"];

const SUPPLIERS = [
  { name: "Shenzhen LEDPro", count: 4 },
  { name: "Hangzhou Timber Co.", count: 1 },
  { name: "Foshan Precision", count: 1 },
  { name: "Guangzhou Metalworks", count: 2 },
];

const THREADS = [
  { id: "t1", sender: "Shenzhen LEDPro", channel: "gmail", time: "Just now", snippet: "Production update: PCB soldering complete, entering housing assembly. On track for May 18.", unread: true, tags: ["milestone: production", "payment: balance due"], po: "PO-1002" },
  { id: "t2", sender: "Guangzhou Metalworks", channel: "whatsapp", time: "10:42 AM", snippet: "Strike-off finish coat needs +2 days, polishing line backed up. Please advise.", unread: true, tags: ["risk: delay 2d", "milestone: sample approval"], po: "PO-1001" },
  { id: "t3", sender: "Hangzhou Timber Co.", channel: "whatsapp", time: "Yesterday", snippet: "Port congestion at Tianjin terminal. Revised ex-factory: June 6.", unread: false, tags: ["risk: port congestion", "delay: 4d"], po: "PO-1004" },
  { id: "t4", sender: "Cost Sheet — PO-0168", channel: "sheets", time: "Tue", snippet: "Cell D18 updated: Grid panel unit price $6.10. Margin: 34.2%", unread: false, tags: ["update: quote selected", "margin: 34.2%"], po: "PO-1003" },
  { id: "t5", sender: "Foshan Precision Parts", channel: "pdf", time: "Mon", snippet: "QC inspection passed — 840 sqm, AQL 2.5. SGS report attached.", unread: false, tags: ["milestone: QC passed", "payment: balance due"], po: "PO-1003" },
];

function channelIcon(ch: string) {
  if (ch === "gmail") return <Mail size={10} className="text-blue-500" />;
  if (ch === "whatsapp") return <MessageSquare size={10} className="text-green-500" />;
  if (ch === "sheets") return <FileSpreadsheet size={10} className="text-green-600" />;
  if (ch === "pdf") return <FileText size={10} className="text-red-400" />;
  return null;
}

export function UnifiedInbox() {
  const [activeThread, setActiveThread] = useState("t1");
  const [activeChannel, setActiveChannel] = useState("all");
  const active = THREADS.find(t => t.id === activeThread)!;

  return (
    <div className="h-screen flex overflow-hidden bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      {/* Far-left icon strip */}
      <div className="w-14 shrink-0 bg-white border-r border-[#E5EAF0] flex flex-col items-center py-3 gap-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center mb-3">
          <Zap size={16} className="text-white" />
        </div>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${item.id === "inbox" ? "bg-[#9000FF]/10 text-[#9000FF]" : "text-[#9E9FAE] hover:text-[#5E687B] hover:bg-[#F0F4F8]"}`}
            title={item.label}>
            <item.icon size={17} />
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9E9FAE] hover:text-[#5E687B] hover:bg-[#F0F4F8]"><Bell size={16} /></button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center text-white text-[10px] font-bold">JM</div>
      </div>

      {/* Left filter panel */}
      <div className="w-52 shrink-0 bg-white border-r border-[#E5EAF0] flex flex-col overflow-hidden">
        <div className="h-11 border-b border-[#E5EAF0] flex items-center px-3 gap-2 shrink-0">
          <Search size={13} className="text-[#9E9FAE]" />
          <input placeholder="Search…" className="flex-1 text-[11px] bg-transparent outline-none text-[#212833] placeholder:text-[#C0C8D4]" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Messages section */}
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-1">Messages</p>
          {CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors rounded-lg mx-1 ${activeChannel === ch.id ? "bg-[#9000FF]/8 text-[#9000FF]" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
              {ch.icon ? <ch.icon size={13} className={activeChannel === ch.id ? "text-[#9000FF]" : "text-[#9E9FAE]"} /> : <Inbox size={13} className={activeChannel === ch.id ? "text-[#9000FF]" : "text-[#9E9FAE]"} />}
              <span className="flex-1 text-[11px] font-medium">{ch.label}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeChannel === ch.id ? "bg-[#9000FF]/15 text-[#9000FF]" : "bg-[#F0F4F8] text-[#9E9FAE]"}`}>{ch.count}</span>
            </button>
          ))}

          {/* Views section */}
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

          {/* Purchase Orders */}
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-4">Purchase Orders</p>
          {POS.map(po => (
            <button key={po} className="w-full flex items-center gap-2 px-3 py-1 text-left text-[#5E687B] hover:bg-[#F0F4F8] transition-colors rounded-lg mx-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[10px] font-mono truncate">{po}</span>
            </button>
          ))}

          {/* Suppliers */}
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-4">Suppliers</p>
          {SUPPLIERS.map(s => (
            <button key={s.name} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F0F4F8] transition-colors rounded-lg mx-1">
              <span className="flex-1 text-[11px] text-[#5E687B] truncate">{s.name}</span>
              <span className="text-[9px] font-bold text-[#9E9FAE]">{s.count}</span>
            </button>
          ))}
        </div>

        <div className="shrink-0 p-2 border-t border-[#E5EAF0]">
          <button className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-[#9000FF] hover:bg-[#9000FF]/5 transition-colors">
            <Upload size={12} />
            <span className="text-[10px] font-semibold">Import Documents</span>
          </button>
        </div>
      </div>

      {/* Middle: Thread list */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
        <div className="h-11 border-b border-[#E5EAF0] flex items-center px-3 gap-2 shrink-0">
          <span className="text-xs font-bold text-[#212833] flex-1">8 threads</span>
          <button className="p-1.5 rounded-lg hover:bg-[#F0F4F8] text-[#9E9FAE]"><Filter size={13} /></button>
          <button className="p-1.5 rounded-lg hover:bg-[#F0F4F8] text-[#9E9FAE]"><MoreHorizontal size={13} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {THREADS.map(t => (
            <button key={t.id} onClick={() => setActiveThread(t.id)}
              className={`w-full text-left px-3 py-3 border-b border-[#F0F4F8] flex gap-2.5 transition-colors ${t.id === activeThread ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : "hover:bg-[#FAFBFF]"}`}>
              <div className="w-8 h-8 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[#9000FF] text-[10px] font-bold shrink-0">
                {t.sender.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {channelIcon(t.channel)}
                  <span className={`text-[11px] font-semibold truncate ${t.unread ? "text-[#212833]" : "text-[#5E687B]"}`}>{t.sender}</span>
                  {t.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0" />}
                  <span className="text-[9px] text-[#9E9FAE] ml-auto shrink-0">{t.time}</span>
                </div>
                <p className="text-[10px] text-[#5E687B] truncate mb-1">{t.snippet}</p>
                <div className="flex gap-1 flex-wrap">
                  {t.tags.map(tag => (
                    <span key={tag} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${tag.startsWith("risk") || tag.startsWith("delay") ? "bg-red-50 text-red-600" : tag.startsWith("milestone") ? "bg-[#9000FF]/8 text-[#9000FF]" : tag.startsWith("payment") ? "bg-amber-50 text-amber-700" : "bg-[#F0F4F8] text-[#5E687B]"}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Detail panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Shipment header bar */}
        <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center px-4 gap-3 shrink-0">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#212833]">PO-1002-783656</span>
            <span className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-1.5 py-0.5 rounded font-medium">Northbound Outfitters</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-0.5"><Check size={8} />on-track</span>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Ex-Factory</div>
            <div className="text-[10px] font-bold text-[#212833]">May 18</div>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-4 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">QC Inspection · Stage 7 of 11</span>
          </div>
          <div className="flex gap-1 mb-1.5">
            {["Factory Quote", "Sample", "Production", "QC Inspection", "Ex-Factory", "In Transit", "Delivered"].map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${i < 3 ? "bg-[#9000FF]" : i === 3 ? "bg-[#9000FF]/50" : "bg-[#E5EAF0]"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {["QC Inspection", "Ex-Factory", "In Transit", "Payment Clearance", "Delivered"].map((s, i) => (
              <span key={s} className={`text-[9px] font-semibold px-2 py-0.5 rounded ${i === 0 ? "bg-[#9000FF]/10 text-[#9000FF]" : "text-[#9E9FAE]"}`}>{s}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 bg-white border-b border-[#E5EAF0] flex items-center px-4">
          {["Message", "Docs 3", "Risk"].map((tab, i) => (
            <button key={tab} className={`text-[11px] font-semibold py-2.5 px-3 border-b-2 transition-colors ${i === 0 ? "border-[#9000FF] text-[#9000FF]" : "border-transparent text-[#9E9FAE] hover:text-[#5E687B]"}`}>{tab}</button>
          ))}
          <div className="flex-1" />
          <div className="flex gap-1.5">
            {[{ label: "Deposit (30%): $1,512", paid: true }, { label: "Balance (70%): $3,528 due May 20", paid: false }].map((p, i) => (
              <button key={i} className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded border ${p.paid ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"}`}>
                {p.paid ? <CheckCircle2 size={9} /> : <CreditCard size={9} />}{p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#FAFBFC]">
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600 shrink-0">SL</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#212833]">Shenzhen LEDPro</span>
                <Mail size={10} className="text-[#9E9FAE]" />
                <span className="text-[10px] text-[#9E9FAE]">via Gmail · Just now</span>
              </div>
              <div className="bg-white rounded-xl border border-[#E5EAF0] p-3 shadow-sm">
                <p className="text-[11px] text-[#212833] leading-relaxed">Hello,<br /><br />Production update on PO-2026-0157. PCB soldering is complete and units are now entering housing assembly. We are currently on track for May 18 ex-factory.<br /><br />Balance payment of $11,900 will be due before release.</p>
              </div>
            </div>
          </div>

          {/* AI draft */}
          <div className="mx-9 bg-[#9000FF]/5 border border-[#9000FF]/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={11} className="text-[#9000FF]" />
              <span className="text-[10px] font-bold text-[#9000FF]">AI Draft</span>
              <span className="text-[9px] text-[#9E9FAE] ml-1">· Acknowledge update and schedule QC inspection</span>
            </div>
            <p className="text-[11px] text-[#212833] leading-relaxed">Thanks David — noted on progress. Please send final QC photos before ex-factory release. We'll arrange balance wire transfer once inspection passes.</p>
          </div>
        </div>

        {/* Compose bar */}
        <div className="shrink-0 border-t border-[#E5EAF0] bg-white px-4 py-3">
          <div className="flex items-center gap-2 bg-[#F8F9FB] border border-[#E5EAF0] rounded-xl px-3 py-2">
            <input placeholder="Type a reply or use Edit Draft above…" className="flex-1 text-[11px] bg-transparent outline-none text-[#212833] placeholder:text-[#C0C8D4]" />
            <button className="p-1 text-[#9E9FAE] hover:text-[#9000FF]"><Paperclip size={14} /></button>
            <button className="p-1 text-[#9E9FAE] hover:text-[#9000FF]"><Sparkles size={14} /></button>
            <button className="bg-[#9000FF] text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7A00D9]">
              <Send size={10} />Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
