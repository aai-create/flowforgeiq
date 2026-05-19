import { useState } from "react";
import {
  Inbox, Package, BarChart3, ShieldAlert, Sparkles, FileText,
  ChevronRight, Check, AlertCircle, Search, Bell, Zap, Upload,
  DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle2,
  Target, Calendar, RefreshCw, ArrowUpRight
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

const REPORT_SECTIONS = [
  { id: "overview", label: "Portfolio Overview", icon: BarChart3, desc: "Summary KPIs & health", color: "text-blue-600" },
  { id: "risk", label: "Risk Report", icon: ShieldAlert, desc: "Risk Radar · exposure × probability", color: "text-purple-600", active: true },
  { id: "supplier", label: "Supplier Performance", icon: Target, desc: "On-time rate, delays, quality", color: "text-emerald-600" },
  { id: "financial", label: "Financial Tracker", icon: DollarSign, desc: "Payments, balances, margins", color: "text-amber-600" },
  { id: "timeline", label: "Timeline View", icon: Calendar, desc: "Milestone gantt by shipment", color: "text-orange-600" },
];

const RISK_ITEMS = [
  { rank: 1, po: "PO-1001-P201353881", product: "Engineered Oak Flooring — Plank — Coffee", supplier: "Ningbo Hardwood Mill", score: 38, level: "low", exposure: "$27.4k", total: "$72.1k", conf: 78, signal: "Target date passed 28 day(s) ago", etaMin: "Apr 20", etaMax: "Apr 28" },
  { rank: 2, po: "PO-1019-P200920425", product: "Engineered Oak Flooring — Chevron — Whitewash", supplier: "Hangzhou Timber Co.", score: 55, level: "medium", exposure: "$21.7k", total: "$39.5k", conf: 65, signal: "Shipment is 30% behind expected schedule progress", etaMin: "May 07", etaMax: "May 17" },
  { rank: 3, po: "PO-1022-P211094302", product: "Chrome Retail Hanger — Heavy Duty", supplier: "Guangzhou Metalworks", score: 72, level: "high", exposure: "$19.2k", total: "$18.4k", conf: 81, signal: "2-day delay approved, balance payment overdue", etaMin: "May 20", etaMax: "May 30" },
  { rank: 4, po: "PO-1005-P198423011", product: "Wire Grid Panel Display", supplier: "Tianjin Wire Works", score: 61, level: "medium", exposure: "$12.8k", total: "$7.5k", conf: 55, signal: "Port congestion — 4-day delay reported", etaMin: "Jun 02", etaMax: "Jun 10" },
];

function riskColor(score: number) {
  if (score >= 70) return { dot: "bg-red-500", text: "text-red-600", badge: "bg-red-50 text-red-700 border-red-100", bar: "bg-red-400" };
  if (score >= 45) return { dot: "bg-amber-500", text: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-100", bar: "bg-amber-400" };
  return { dot: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", bar: "bg-emerald-400" };
}

export function ReportsRisk() {
  const [activeSection, setActiveSection] = useState("risk");
  const [selectedItem, setSelectedItem] = useState<string | null>("PO-1022-P211094302");

  return (
    <div className="h-screen flex overflow-hidden bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      {/* Far-left icon strip */}
      <div className="w-14 shrink-0 bg-white border-r border-[#E5EAF0] flex flex-col items-center py-3 gap-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center mb-3">
          <Zap size={16} className="text-white" />
        </div>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${item.id === "reports" ? "bg-[#9000FF]/10 text-[#9000FF]" : "text-[#9E9FAE] hover:text-[#5E687B] hover:bg-[#F0F4F8]"}`}
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
          <input placeholder="Search reports…" className="flex-1 text-[11px] bg-transparent outline-none text-[#212833] placeholder:text-[#C0C8D4]" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-1">Messages</p>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#5E687B] hover:bg-[#F0F4F8] rounded-lg mx-1">
            <Inbox size={13} className="text-[#9E9FAE]" />
            <span className="flex-1 text-[11px] font-medium">All Inbox</span>
            <span className="text-[9px] font-bold bg-[#F0F4F8] text-[#9E9FAE] px-1.5 py-0.5 rounded-full">8</span>
          </button>

          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-4">Views</p>
          {VIEWS.map(v => (
            <button key={v.id}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors rounded-lg mx-1 ${v.id === "reports" ? "bg-[#9000FF]/8 text-[#9000FF]" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
              <v.icon size={13} className={v.id === "reports" ? "text-[#9000FF]" : v.color} />
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${v.id === "reports" ? "text-[#9000FF]" : "text-[#212833]"}`}>{v.label}</p>
                <p className="text-[9px] text-[#9E9FAE]">{v.sub}</p>
              </div>
              {v.id !== "reports" && <ChevronRight size={11} className="text-[#C0C8D4]" />}
            </button>
          ))}

          {/* Report sections sub-nav */}
          <div className="mt-3 px-2">
            <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-1 mb-1">Report Sections</p>
            {REPORT_SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${activeSection === sec.id ? "bg-[#9000FF]/6 text-[#9000FF]" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                <sec.icon size={12} className={activeSection === sec.id ? "text-[#9000FF]" : sec.color} />
                <span className="text-[11px] font-medium flex-1 truncate">{sec.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 px-3">
            <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-2">Date Range</p>
            <select className="w-full text-[10px] border border-[#E5EAF0] rounded-lg px-2 py-1.5 bg-[#FAFBFC] text-[#5E687B]">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This quarter</option>
            </select>
          </div>
        </div>

        <div className="shrink-0 p-2 border-t border-[#E5EAF0]">
          <button className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-[#9000FF] hover:bg-[#9000FF]/5">
            <Upload size={12} />
            <span className="text-[10px] font-semibold">Import Documents</span>
          </button>
        </div>
      </div>

      {/* Middle: Risk item list */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
        {/* Report header */}
        <div className="shrink-0 border-b border-[#E5EAF0] bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center">
                <ShieldAlert size={13} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#212833]">Risk Report</h2>
                <p className="text-[9px] text-[#9E9FAE]">Exposure × probability · last refresh 2m ago</p>
              </div>
            </div>
            <button className="text-[10px] text-[#5E687B] flex items-center gap-1 hover:text-[#212833]"><RefreshCw size={11} /></button>
          </div>
          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Risk Exposure", value: "$146k", color: "text-[#9000FF]", bg: "bg-[#F8F5FF]" },
              { label: "High Risk", value: "3", color: "text-red-600", bg: "bg-red-50" },
              { label: "Medium Risk", value: "8", color: "text-amber-600", bg: "bg-amber-50" },
            ].map(chip => (
              <div key={chip.label} className={`${chip.bg} rounded-xl p-2 text-center`}>
                <p className={`text-base font-bold ${chip.color}`}>{chip.value}</p>
                <p className="text-[9px] text-[#9E9FAE]">{chip.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risk list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F0F4F8]">
          {RISK_ITEMS.map(item => {
            const c = riskColor(item.score);
            const isSelected = selectedItem === item.po;
            return (
              <button key={item.po} onClick={() => setSelectedItem(isSelected ? null : item.po)}
                className={`w-full text-left px-4 py-3 transition-colors ${isSelected ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : "hover:bg-[#FAFBFC]"}`}>
                <div className="flex items-start gap-3">
                  <div className="relative w-10 h-10 shrink-0">
                    <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#F0F4F8" strokeWidth="3.5" />
                      <circle cx="20" cy="20" r="16" fill="none"
                        stroke={item.score >= 70 ? "#EF4444" : item.score >= 45 ? "#F59E0B" : "#10B981"}
                        strokeWidth="3.5" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 16}`}
                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - item.score / 100)}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[10px] font-bold ${c.text}`}>{item.score}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-mono text-[#9E9FAE] truncate">{item.po}</span>
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full border ${c.badge}`}>{item.level === "high" ? "High" : item.level === "medium" ? "Medium" : "Low"}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#212833] truncate">{item.product}</p>
                    <p className="text-[9px] text-[#9E9FAE] truncate">{item.supplier}</p>
                    <p className="text-[9px] text-[#5E687B] mt-0.5 italic truncate">"{item.signal}"</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-[#212833]">{item.exposure}</p>
                    <p className="text-[9px] text-[#9E9FAE]">exposure</p>
                    <p className="text-[9px] text-[#C0C8D4]">{item.total} total</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Risk detail */}
      {selectedItem ? (() => {
        const item = RISK_ITEMS.find(r => r.po === selectedItem)!;
        const c = riskColor(item.score);
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center px-4 gap-3 shrink-0">
              <span className="text-[10px] font-mono font-bold text-[#5E687B]">{item.po}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${c.badge}`}>{item.level.charAt(0).toUpperCase() + item.level.slice(1)} Risk</span>
              <div className="flex-1" />
              <button className="text-[10px] text-[#9000FF] font-semibold flex items-center gap-1 hover:underline">
                Open Shipment <ArrowUpRight size={10} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Score card */}
              <div className={`border rounded-xl p-4 ${item.score >= 70 ? "bg-red-50 border-red-100" : item.score >= 45 ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"}`}>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="white" strokeWidth="4.5" />
                      <circle cx="32" cy="32" r="28" fill="none"
                        stroke={item.score >= 70 ? "#EF4444" : item.score >= 45 ? "#F59E0B" : "#10B981"}
                        strokeWidth="4.5" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - item.score / 100)}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-xl font-bold ${c.text}`}>{item.score}</span>
                      <span className="text-[8px] text-[#9E9FAE]">risk</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#212833]">{item.product}</p>
                    <p className="text-[11px] text-[#5E687B]">{item.supplier}</p>
                    <p className="text-[10px] text-[#9E9FAE] mt-1">{item.exposure} exposure · {item.total} PO total</p>
                  </div>
                </div>
              </div>

              {/* Signal + ETA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-[#E5EAF0] rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Zap size={9} className="text-[#9000FF]" /> Top Risk Signal
                  </p>
                  <p className="text-[11px] text-[#212833]">{item.signal}</p>
                </div>
                <div className="bg-white border border-[#E5EAF0] rounded-xl p-3">
                  <p className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar size={9} className="text-[#9000FF]" /> Predicted ETA
                  </p>
                  <p className="text-[11px] text-[#212833]">{item.etaMin} – {item.etaMax}</p>
                  <p className="text-[9px] text-[#9E9FAE]">{item.conf}% confidence</p>
                </div>
              </div>

              {/* Model accuracy mini card */}
              <div className="bg-white border border-[#E5EAF0] rounded-xl p-3">
                <p className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <BarChart3 size={9} className="text-[#9000FF]" /> Model Accuracy
                </p>
                <div className="space-y-2">
                  {[{ label: "Within 3 days", pct: 67 }, { label: "Within 7 days", pct: 84 }].map(m => (
                    <div key={m.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#5E687B] w-24 shrink-0">{m.label}</span>
                      <div className="flex-1 h-1.5 bg-[#F0F4F8] rounded-full">
                        <div className="h-full bg-[#9000FF] rounded-full" style={{ width: `${m.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#9000FF] w-8 text-right">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })() : (
        <div className="flex-1 flex items-center justify-center text-[#C0C8D4] flex-col gap-2">
          <ShieldAlert size={32} className="opacity-30" />
          <p className="text-sm">Select a shipment to view risk detail</p>
        </div>
      )}
    </div>
  );
}
