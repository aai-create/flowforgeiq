import { useState } from "react";
import {
  Inbox, Package, BarChart3, ShieldAlert, Sparkles, FileText,
  ChevronRight, Check, AlertCircle, Clock, Search, Filter, MoreHorizontal,
  Bell, Zap, CheckSquare, Square, Calendar, Tag, TrendingDown, ArrowUpRight,
  MessageSquare, Mail, FileSpreadsheet, Upload
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

const STATUS_FILTERS = ["All", "On Track", "At Risk", "Delayed", "Complete"];

const SHIPMENTS = [
  { id: "s1", po: "PO-1001-778143", product: "Chrome Retail Hanger — Heavy Duty", supplier: "Guangzhou Metalworks", customer: "Northbound Outfitters", stage: "Sample Approval", dueDate: "May 28", status: "at-risk", progress: 20, tasks: 3, value: "$18,400" },
  { id: "s2", po: "PO-1002-783656", product: "LED Display Cabinet — Warm White", supplier: "Shenzhen LEDPro", customer: "Northbound Outfitters", stage: "QC Inspection", dueDate: "May 18", status: "on-track", progress: 65, tasks: 1, value: "$23,800" },
  { id: "s3", po: "PO-1003-F18", product: "Engineered Oak Flooring — Velvet", supplier: "Hangzhou Timber Co.", customer: "Pioneer Goods Co.", stage: "Ex-Factory", dueDate: "May 22", status: "on-track", progress: 80, tasks: 2, value: "$31,200" },
  { id: "s4", po: "PO-1004-792884", product: "Chrome Retail Hanger — Slimline", supplier: "Guangzhou Metalworks", customer: "Marlowe & Sons", stage: "Factory Quote", dueDate: "Jun 10", status: "on-track", progress: 10, tasks: 4, value: "$9,600" },
  { id: "s5", po: "PO-1005-801233", product: "Wire Grid Panel Display", supplier: "Tianjin Wire Works", customer: "Cedar Hollow Homes", stage: "Production", dueDate: "Jun 06", status: "delayed", progress: 40, tasks: 2, value: "$7,500" },
  { id: "s6", po: "PO-1006-812944", product: "Steel Shelf Bracket — Matte Black", supplier: "Foshan Precision Parts", customer: "Marlowe & Sons", stage: "In Transit", dueDate: "May 25", status: "on-track", progress: 90, tasks: 0, value: "$14,200" },
];

const TASKS = [
  { id: "tk1", text: "Approve 2-day delay — Guangzhou (PO-0142)", urgency: "high", done: false },
  { id: "tk2", text: "Balance payment overdue — $8,960 due May 15", urgency: "high", done: false },
  { id: "tk3", text: "Port congestion reply — Tianjin Wire Works", urgency: "high", done: false },
  { id: "tk4", text: "Select factory quote — PO-0168 Grid Panel", urgency: "medium", done: false },
  { id: "tk5", text: "Schedule QC inspection — Shenzhen LEDPro", urgency: "medium", done: true },
];

function statusCls(s: string) {
  if (s === "at-risk") return "bg-red-50 text-red-600 border-red-100";
  if (s === "delayed") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

export function UnifiedShipments() {
  const [activeShipment, setActiveShipment] = useState("s1");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tasks, setTasks] = useState(TASKS);
  const ship = SHIPMENTS.find(s => s.id === activeShipment)!;

  const filtered = SHIPMENTS.filter(s =>
    statusFilter === "All" ? true :
    statusFilter === "On Track" ? s.status === "on-track" :
    statusFilter === "At Risk" ? s.status === "at-risk" :
    statusFilter === "Delayed" ? s.status === "delayed" : true
  );

  return (
    <div className="h-screen flex overflow-hidden bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      {/* Far-left icon strip */}
      <div className="w-14 shrink-0 bg-white border-r border-[#E5EAF0] flex flex-col items-center py-3 gap-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center mb-3">
          <Zap size={16} className="text-white" />
        </div>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${item.id === "shipments" ? "bg-[#9000FF]/10 text-[#9000FF]" : "text-[#9E9FAE] hover:text-[#5E687B] hover:bg-[#F0F4F8]"}`}
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
          <input placeholder="Search shipments…" className="flex-1 text-[11px] bg-transparent outline-none text-[#212833] placeholder:text-[#C0C8D4]" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Messages section - collapsed */}
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-1">Messages</p>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#5E687B] hover:bg-[#F0F4F8] rounded-lg mx-1">
            <Inbox size={13} className="text-[#9E9FAE]" />
            <span className="flex-1 text-[11px] font-medium">All Inbox</span>
            <span className="text-[9px] font-bold bg-[#F0F4F8] text-[#9E9FAE] px-1.5 py-0.5 rounded-full">8</span>
          </button>

          {/* Views section - Shipments active */}
          <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-3 mb-1 mt-4">Views</p>
          {VIEWS.map(v => (
            <button key={v.id}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors rounded-lg mx-1 ${v.id === "shipments" ? "bg-[#9000FF]/8 text-[#9000FF]" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
              <v.icon size={13} className={v.id === "shipments" ? "text-[#9000FF]" : v.color} />
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${v.id === "shipments" ? "text-[#9000FF]" : "text-[#212833]"}`}>{v.label}</p>
                <p className="text-[9px] text-[#9E9FAE]">{v.sub}</p>
              </div>
              {v.id !== "shipments" && <ChevronRight size={11} className="text-[#C0C8D4]" />}
            </button>
          ))}

          {/* Status filter (sub-nav for shipments view) */}
          <div className="mt-3 px-2">
            <p className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider px-1 mb-1">Status</p>
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`w-full text-left text-[11px] px-2 py-1 rounded-lg transition-colors ${statusFilter === f ? "text-[#9000FF] font-semibold bg-[#9000FF]/6" : "text-[#5E687B] hover:bg-[#F0F4F8]"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 p-2 border-t border-[#E5EAF0]">
          <button className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-[#9000FF] hover:bg-[#9000FF]/5 transition-colors">
            <Upload size={12} />
            <span className="text-[10px] font-semibold">Import Documents</span>
          </button>
        </div>
      </div>

      {/* Middle: Shipment list */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
        <div className="h-11 border-b border-[#E5EAF0] flex items-center px-3 gap-2 shrink-0">
          <span className="text-xs font-bold text-[#212833] flex-1">{filtered.length} shipments</span>
          <button className="p-1.5 rounded-lg hover:bg-[#F0F4F8] text-[#9E9FAE]"><Filter size={13} /></button>
          <button className="p-1.5 rounded-lg hover:bg-[#F0F4F8] text-[#9E9FAE]"><MoreHorizontal size={13} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(s => (
            <button key={s.id} onClick={() => setActiveShipment(s.id)}
              className={`w-full text-left px-3 py-3 border-b border-[#F0F4F8] flex flex-col gap-1.5 transition-colors ${s.id === activeShipment ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : "hover:bg-[#FAFBFF]"}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-mono font-bold text-[#5E687B]">{s.po}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusCls(s.status)}`}>{s.status === "on-track" ? "On Track" : s.status === "at-risk" ? "At Risk" : "Delayed"}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#212833] truncate">{s.product}</p>
                  <p className="text-[10px] text-[#9E9FAE] truncate">{s.supplier}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-[#212833]">{s.value}</p>
                  <p className="text-[9px] text-[#9E9FAE]">{s.dueDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.status === "at-risk" ? "bg-red-400" : s.status === "delayed" ? "bg-amber-400" : "bg-[#9000FF]"}`} style={{ width: `${s.progress}%` }} />
                </div>
                <span className="text-[9px] text-[#9E9FAE]">{s.stage}</span>
                {s.tasks > 0 && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">{s.tasks} tasks</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Shipment detail + tasks */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-11 border-b border-[#E5EAF0] bg-white flex items-center px-4 gap-3 shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#212833]">{ship.po}</span>
              <span className="text-[9px] bg-[#F0F4F8] text-[#5E687B] px-1.5 py-0.5 rounded font-medium">{ship.customer}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${statusCls(ship.status)}`}>
                {ship.status === "on-track" ? <Check size={8} /> : <AlertCircle size={8} />}{ship.status}
              </span>
            </div>
            <p className="text-[10px] text-[#5E687B]">{ship.product}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Ex-Factory</p>
            <p className="text-[10px] font-bold text-[#212833]">{ship.dueDate}</p>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-4 py-2.5">
          <div className="flex gap-1 mb-1.5">
            {["Factory Quote", "Sample", "Production", "QC Inspection", "Ex-Factory", "In Transit", "Delivered"].map((st, i) => (
              <div key={st} className={`flex-1 h-1.5 rounded-full ${i < 1 ? "bg-[#9000FF]" : i === 1 ? "bg-[#9000FF]/40" : "bg-[#E5EAF0]"}`} />
            ))}
          </div>
          <div className="flex gap-1">
            {["Factory Quote", "Sample Approval", "Production", "QC Inspection", "Ex-Factory", "In Transit", "Delivered"].map((st, i) => (
              <span key={st} className={`text-[8px] flex-1 text-center font-semibold ${i === 1 ? "text-[#9000FF]" : "text-[#C0C8D4]"}`}>{st.split(" ")[0]}</span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Task list */}
          <div className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0F4F8] bg-[#FAFBFC]">
              <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Shipment Tasks</span>
              <span className="text-[9px] text-[#9E9FAE]">{tasks.filter(t => !t.done).length} open</span>
            </div>
            <div className="divide-y divide-[#F0F4F8]">
              {tasks.map(task => (
                <button key={task.id} onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#FAFBFC] text-left">
                  {task.done ? <CheckSquare size={14} className="text-emerald-500 mt-0.5 shrink-0" /> : <Square size={14} className={`mt-0.5 shrink-0 ${task.urgency === "high" ? "text-red-400" : "text-[#C0C8D4]"}`} />}
                  <span className={`text-[11px] flex-1 ${task.done ? "line-through text-[#C0C8D4]" : task.urgency === "high" ? "text-[#212833] font-medium" : "text-[#5E687B]"}`}>{task.text}</span>
                  {!task.done && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${task.urgency === "high" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{task.urgency}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Quick info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Supplier", value: ship.supplier, icon: Tag },
              { label: "Ex-Factory", value: ship.dueDate, icon: Calendar },
              { label: "PO Value", value: ship.value, icon: ArrowUpRight },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white border border-[#E5EAF0] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className="text-[#9000FF]" />
                  <span className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-[12px] font-semibold text-[#212833]">{value}</p>
              </div>
            ))}
          </div>

          {/* Recent messages */}
          <div className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0F4F8] bg-[#FAFBFC]">
              <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Recent Messages</span>
              <button className="text-[10px] text-[#9000FF] font-semibold flex items-center gap-0.5">Open thread <ArrowUpRight size={10} /></button>
            </div>
            <div className="divide-y divide-[#F0F4F8]">
              {[
                { from: "Guangzhou Metalworks", time: "10:42 AM", msg: "Strike-off finish coat needs +2 days…", ch: "whatsapp" },
                { from: "You", time: "Yesterday", msg: "Understood — please advise on revised schedule.", ch: "gmail" },
              ].map((m, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2">
                  {m.ch === "whatsapp" ? <MessageSquare size={11} className="text-green-500 mt-0.5 shrink-0" /> : <Mail size={11} className="text-blue-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#212833]">{m.from}</span>
                      <span className="text-[9px] text-[#9E9FAE]">{m.time}</span>
                    </div>
                    <p className="text-[10px] text-[#5E687B] truncate">{m.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
