import React, { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, ListTodo,
  ChevronDown, ChevronUp, ArrowUpRight, Clock,
  CheckCircle2, AlertCircle, BarChart3, Package,
  ChevronsUpDown, RefreshCw,
} from "lucide-react";
import {
  useListShipments,
  useListTasks,
  useListSuppliers,
  useListStages,
} from "@workspace/api-client-react";
import type { Shipment, Task } from "@workspace/api-client-react";
import { shortDate } from "@/lib/adapters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const TODAY = new Date("2026-05-18T00:00:00Z");

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function daysDiff(iso: string) {
  return Math.ceil((new Date(iso).getTime() - TODAY.getTime()) / 86_400_000);
}

function trafficLight(days: number) {
  if (days < 0)  return { bar: "bg-red-500",    text: "text-red-600",    badge: "bg-red-50 text-red-700 border-red-100",    label: "Overdue"  };
  if (days <= 7) return { bar: "bg-amber-500",  text: "text-amber-600",  badge: "bg-amber-50 text-amber-700 border-amber-100",  label: `${days}d`  };
  return               { bar: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", label: `${days}d` };
}

// ─── Shared mini bar component ───────────────────────────────────────────────
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 bg-[#F0F4F8] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%`, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── SortableHeader ──────────────────────────────────────────────────────────
type SortDir = "asc" | "desc";
function SortHeader({
  label, col, sort, onSort,
}: { label: string; col: string; sort: { col: string; dir: SortDir }; onSort: (c: string) => void }) {
  const active = sort.col === col;
  return (
    <th
      className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2 cursor-pointer select-none hover:text-[#212833] transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? sort.dir === "asc"
            ? <ChevronUp className="w-3 h-3 text-[#9000FF]" />
            : <ChevronDown className="w-3 h-3 text-[#9000FF]" />
          : <ChevronsUpDown className="w-3 h-3 opacity-30" />
        }
      </span>
    </th>
  );
}

// ─── ReportCard ──────────────────────────────────────────────────────────────
interface ReportCardProps {
  id: string;
  icon: React.ElementType;
  title: string;
  iconColor: string;
  iconBg: string;
  kpi: React.ReactNode;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ReportCard({ icon: Icon, title, iconColor, iconBg, kpi, subtitle, expanded, onToggle, children }: ReportCardProps) {
  return (
    <div className={`border rounded-xl bg-white transition-all ${expanded ? "border-[#9000FF]/25 shadow-md" : "border-[#E5EAF0] hover:border-[#D6E3EB] hover:shadow-sm"}`}>
      {/* Collapsed header — always visible */}
      <button
        className="w-full text-left p-5 flex items-center gap-4"
        onClick={onToggle}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-0.5">{title}</div>
          <div className="text-xl font-bold text-[#212833] leading-none">{kpi}</div>
          <div className="text-[11px] text-[#9E9FAE] mt-0.5">{subtitle}</div>
        </div>
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${expanded ? "border-[#9000FF]/30 bg-[#9000FF]/5 text-[#9000FF]" : "border-[#E5EAF0] text-[#9E9FAE]"}`}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#E5EAF0] p-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Finance Card ─────────────────────────────────────────────────────────────
function FinanceCardContent({ shipments }: { shipments: Shipment[] }) {
  const allPayments = useMemo(() => shipments.flatMap(s => s.payments), [shipments]);

  const totalUnpaid  = allPayments.filter(p => !p.paid).reduce((s, p) => s + p.amountUsd, 0);
  const totalPaid    = allPayments.filter(p =>  p.paid).reduce((s, p) => s + p.amountUsd, 0);
  const totalExposure = totalUnpaid + totalPaid;

  const buckets = useMemo(() => {
    const overdue: typeof allPayments = [];
    const within30: typeof allPayments = [];
    const within60: typeof allPayments = [];
    const within90: typeof allPayments = [];
    for (const p of allPayments.filter(x => !x.paid)) {
      const d = daysDiff(p.dueDate);
      if (d < 0)       overdue.push(p);
      else if (d <= 30) within30.push(p);
      else if (d <= 60) within60.push(p);
      else if (d <= 90) within90.push(p);
    }
    return { overdue, within30, within60, within90 };
  }, [allPayments]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier: string; unpaid: number; overdue: number }>();
    for (const s of shipments) {
      for (const p of s.payments) {
        if (p.paid) continue;
        const existing = map.get(s.supplierName) ?? { supplier: s.supplierName, unpaid: 0, overdue: 0 };
        existing.unpaid += p.amountUsd;
        if (daysDiff(p.dueDate) < 0) existing.overdue += p.amountUsd;
        map.set(s.supplierName, existing);
      }
    }
    return [...map.values()].sort((a, b) => b.unpaid - a.unpaid);
  }, [shipments]);

  const bucketRows = [
    { label: "Overdue",    items: buckets.overdue,  barColor: "bg-red-500",    textColor: "text-red-600"    },
    { label: "≤ 30 days",  items: buckets.within30, barColor: "bg-amber-500",  textColor: "text-amber-600"  },
    { label: "31–60 days", items: buckets.within60, barColor: "bg-blue-400",   textColor: "text-blue-600"   },
    { label: "61–90 days", items: buckets.within90, barColor: "bg-emerald-400",textColor: "text-emerald-600"},
  ];

  const maxBucket = Math.max(...bucketRows.map(b => b.items.reduce((s, p) => s + p.amountUsd, 0)), 1);

  return (
    <div className="space-y-5">
      {/* Headline KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Unpaid",  value: fmtUsd(totalUnpaid),  color: "text-[#212833]" },
          { label: "Total Paid",    value: fmtUsd(totalPaid),    color: "text-emerald-600" },
          { label: "Total Exposure",value: fmtUsd(totalExposure),color: "text-[#5E687B]"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3 text-center">
            <div className={`text-lg font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Cash flow buckets */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2">Cash Flow by Due Date</div>
        <div className="space-y-2">
          {bucketRows.map(({ label, items, barColor, textColor }) => {
            const total = items.reduce((s, p) => s + p.amountUsd, 0);
            const pct   = (total / maxBucket) * 100;
            return (
              <div key={label} className="flex items-center gap-3 text-[12px]">
                <span className="w-20 shrink-0 text-[#5E687B]">{label}</span>
                <MiniBar pct={pct} color={barColor} />
                <span className={`w-16 text-right font-semibold shrink-0 ${textColor}`}>{fmtUsd(total)}</span>
                <span className="w-8 text-right text-[10px] text-[#9E9FAE] shrink-0">({items.length})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unpaid by supplier */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2">Unpaid by Supplier</div>
        {bySupplier.length === 0
          ? <p className="text-xs text-[#9E9FAE]">All payments are up to date.</p>
          : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#E5EAF0]">
                  <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-0 py-2">Supplier</th>
                  <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-0 py-2">Unpaid</th>
                  <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-0 py-2 pr-0">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {bySupplier.map(row => (
                  <tr key={row.supplier} className="border-b border-[#F0F4F8] last:border-0">
                    <td className="py-2 text-[#212833] font-medium">{row.supplier}</td>
                    <td className="py-2 text-right font-semibold text-[#212833]">{fmtUsd(row.unpaid)}</td>
                    <td className="py-2 text-right pr-0">
                      {row.overdue > 0
                        ? <span className="text-red-600 font-semibold">{fmtUsd(row.overdue)}</span>
                        : <span className="text-[#9E9FAE]">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

// ─── Pipeline Card ────────────────────────────────────────────────────────────
function PipelineCardContent({ shipments, stageOrder }: { shipments: Shipment[]; stageOrder: string[] }) {
  const onTime   = shipments.filter(s => s.status === "on-track").length;
  const atRisk   = shipments.filter(s => s.status === "at-risk").length;
  const delayed  = shipments.filter(s => s.status === "delayed").length;
  const total    = shipments.length || 1;

  const stageCounts = useMemo(() => {
    const map = new Map<string, { count: number; label: string }>();
    for (const s of shipments) {
      const e = map.get(s.currentStageId) ?? { count: 0, label: s.currentStageId };
      e.count++;
      map.set(s.currentStageId, e);
    }
    return map;
  }, [shipments]);

  const sortedStages = useMemo(() => {
    return stageOrder
      .map(id => ({ id, count: stageCounts.get(id)?.count ?? 0 }))
      .filter(s => s.count > 0);
  }, [stageOrder, stageCounts]);

  const maxCount = Math.max(...sortedStages.map(s => s.count), 1);

  const exFactoryList = useMemo(() => {
    return [...shipments]
      .filter(s => s.exFactoryDate)
      .sort((a, b) => new Date(a.exFactoryDate).getTime() - new Date(b.exFactoryDate).getTime())
      .slice(0, 10);
  }, [shipments]);

  return (
    <div className="space-y-5">
      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "On Track", count: onTime,  pct: Math.round((onTime / total)  * 100), bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
          { label: "At Risk",  count: atRisk,  pct: Math.round((atRisk / total)  * 100), bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-700",   dot: "bg-amber-500"   },
          { label: "Delayed",  count: delayed, pct: Math.round((delayed / total) * 100), bg: "bg-red-50",     border: "border-red-100",     text: "text-red-700",     dot: "bg-red-500"     },
        ].map(({ label, count, pct, bg, border, text, dot }) => (
          <div key={label} className={`${bg} border ${border} rounded-lg p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className={`text-[10px] font-bold ${text} uppercase tracking-wide`}>{label}</span>
            </div>
            <div className={`text-xl font-bold ${text}`}>{count}</div>
            <div className={`text-[10px] ${text} opacity-70`}>{pct}% of portfolio</div>
          </div>
        ))}
      </div>

      {/* Stage funnel */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2">Stage Distribution</div>
        <div className="space-y-1.5">
          {sortedStages.map(({ id, count }) => {
            const pct = (count / maxCount) * 100;
            return (
              <div key={id} className="flex items-center gap-3 text-[12px]">
                <span className="w-32 shrink-0 truncate text-[#5E687B] text-[11px]">{id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                <MiniBar pct={pct} color="bg-[#9000FF]/50" />
                <span className="w-6 text-right font-semibold text-[#212833] shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ex-factory countdown */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2">Ex-Factory Countdown</div>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#E5EAF0]">
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">PO</th>
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2 pl-2">Product</th>
              <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Ex-Factory</th>
              <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Days</th>
            </tr>
          </thead>
          <tbody>
            {exFactoryList.map(s => {
              const days = daysDiff(s.exFactoryDate);
              const tl   = trafficLight(days);
              return (
                <tr key={s.id} className="border-b border-[#F0F4F8] last:border-0">
                  <td className="py-1.5">
                    <span className="font-mono text-[10px] bg-[#FAFBFC] border border-[#E5EAF0] px-1.5 py-0.5 rounded text-[#5E687B]">
                      {s.poNumber}
                    </span>
                  </td>
                  <td className="py-1.5 pl-2 text-[#212833] font-medium max-w-[180px] truncate">{s.product}</td>
                  <td className="py-1.5 text-right text-[#5E687B]">{shortDate(s.exFactoryDate)}</td>
                  <td className="py-1.5 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tl.badge}`}>
                      {days < 0 ? `${Math.abs(days)}d late` : tl.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Suppliers Card ───────────────────────────────────────────────────────────
interface SupplierRow {
  name: string;
  country: string;
  active: number;
  onTimePct: number;
  openTasks: number;
  avgUnitPrice: number | null;
}

function SuppliersCardContent({ shipments, tasks }: { shipments: Shipment[]; tasks: Task[] }) {
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: "active", dir: "desc" });

  const rows: SupplierRow[] = useMemo(() => {
    const map = new Map<string, SupplierRow>();
    for (const s of shipments) {
      const r = map.get(s.supplierName) ?? {
        name: s.supplierName, country: "CN",
        active: 0, onTimePct: 0, openTasks: 0, avgUnitPrice: null,
      };
      r.active++;
      map.set(s.supplierName, r);
    }
    // on-time %
    const onTimeCount = new Map<string, { on: number; total: number }>();
    for (const s of shipments) {
      const e = onTimeCount.get(s.supplierName) ?? { on: 0, total: 0 };
      e.total++;
      if (s.status === "on-track") e.on++;
      onTimeCount.set(s.supplierName, e);
    }
    for (const [name, { on, total }] of onTimeCount) {
      const r = map.get(name);
      if (r) r.onTimePct = total > 0 ? Math.round((on / total) * 100) : 0;
    }
    // open tasks per supplier (match by shipment)
    const supplierShipIds = new Map<string, Set<number>>();
    for (const s of shipments) {
      const set = supplierShipIds.get(s.supplierName) ?? new Set();
      set.add(s.id);
      supplierShipIds.set(s.supplierName, set);
    }
    for (const t of tasks) {
      if (t.done) continue;
      for (const [name, ids] of supplierShipIds) {
        if (ids.has(t.shipmentId)) {
          const r = map.get(name);
          if (r) r.openTasks++;
        }
      }
    }
    // avg unit price from selected quotes
    const priceAccum = new Map<string, { sum: number; n: number }>();
    for (const s of shipments) {
      const selected = s.quotes.find(q => q.selected);
      if (!selected) continue;
      const e = priceAccum.get(s.supplierName) ?? { sum: 0, n: 0 };
      e.sum += selected.unitPrice;
      e.n++;
      priceAccum.set(s.supplierName, e);
    }
    for (const [name, { sum, n }] of priceAccum) {
      const r = map.get(name);
      if (r) r.avgUnitPrice = n > 0 ? sum / n : null;
    }
    return [...map.values()];
  }, [shipments, tasks]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const mul = sort.dir === "asc" ? 1 : -1;
      if (sort.col === "name")       return mul * a.name.localeCompare(b.name);
      if (sort.col === "active")     return mul * (a.active - b.active);
      if (sort.col === "onTimePct")  return mul * (a.onTimePct - b.onTimePct);
      if (sort.col === "openTasks")  return mul * (a.openTasks - b.openTasks);
      if (sort.col === "avgUnit") {
        const ap = a.avgUnitPrice ?? -1;
        const bp = b.avgUnitPrice ?? -1;
        return mul * (ap - bp);
      }
      return 0;
    });
  }, [rows, sort]);

  function toggleSort(col: string) {
    setSort(prev => prev.col === col
      ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { col, dir: "desc" }
    );
  }

  return (
    <div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#E5EAF0]">
            <SortHeader label="Supplier"   col="name"      sort={sort} onSort={toggleSort} />
            <SortHeader label="Active POs" col="active"    sort={sort} onSort={toggleSort} />
            <SortHeader label="On-Time %"  col="onTimePct" sort={sort} onSort={toggleSort} />
            <SortHeader label="Open Tasks" col="openTasks" sort={sort} onSort={toggleSort} />
            <SortHeader label="Avg Unit $" col="avgUnit"   sort={sort} onSort={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => {
            const otColor = row.onTimePct >= 70 ? "text-emerald-600" : row.onTimePct >= 40 ? "text-amber-600" : "text-red-600";
            return (
              <tr key={row.name} className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] transition-colors">
                <td className="px-3 py-2.5 font-medium text-[#212833]">
                  <span>{row.name}</span>
                  <span className="ml-1.5 text-[9px] text-[#9E9FAE] font-normal">{row.country}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="text-[#212833] font-semibold">{row.active}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MiniBar pct={row.onTimePct} color={row.onTimePct >= 70 ? "bg-emerald-500" : row.onTimePct >= 40 ? "bg-amber-500" : "bg-red-500"} />
                    <span className={`w-10 text-right font-semibold text-[11px] shrink-0 ${otColor}`}>{row.onTimePct}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {row.openTasks > 0
                    ? <span className={`font-bold ${row.openTasks >= 3 ? "text-red-600" : row.openTasks >= 1 ? "text-amber-600" : "text-[#212833]"}`}>{row.openTasks}</span>
                    : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  }
                </td>
                <td className="px-3 py-2.5 text-right text-[#5E687B]">
                  {row.avgUnitPrice != null ? `$${row.avgUnitPrice.toFixed(2)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tasks Card ───────────────────────────────────────────────────────────────
function isAging(sourceAge: string): boolean {
  const match = sourceAge.match(/^(\d+)d\s+ago$/i);
  if (match && parseInt(match[1]) >= 3) return true;
  const dowPattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i;
  return dowPattern.test(sourceAge.trim());
}

function TasksCardContent({ tasks, shipments }: { tasks: Task[]; shipments: Shipment[] }) {
  const shipMap = useMemo(() => new Map(shipments.map(s => [s.id, s.poNumber])), [shipments]);

  const incomplete = tasks.filter(t => !t.done);
  const actionable = incomplete.filter(t => !isAging(t.sourceAge));
  const aging      = incomplete.filter(t =>  isAging(t.sourceAge));

  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...actionable].sort((a, b) =>
    urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder]
  );

  function urgencyBadge(u: string) {
    if (u === "high")   return "bg-red-50 text-red-700 border-red-100";
    if (u === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";
  }

  function TaskRow({ task }: { task: Task }) {
    const po = shipMap.get(task.shipmentId);
    return (
      <div className="flex items-start gap-3 py-2 border-b border-[#F0F4F8] last:border-0">
        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${task.urgency === "high" ? "bg-red-500" : task.urgency === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[#212833] leading-snug line-clamp-2">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {po && <span className="font-mono text-[9px] bg-[#FAFBFC] border border-[#E5EAF0] px-1.5 py-0.5 rounded text-[#5E687B]">{po}</span>}
            <span className="text-[10px] text-[#9E9FAE]">{task.source}</span>
            <span className="text-[10px] text-[#9E9FAE] opacity-50">·</span>
            <span className={`text-[10px] ${task.urgency === "high" ? "text-red-500 font-semibold" : "text-[#9E9FAE]"}`}>{task.sourceAge}</span>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${urgencyBadge(task.urgency)}`}>
          {task.urgency}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "High Urgency",  count: incomplete.filter(t => t.urgency === "high").length,   color: "text-red-600",     bg: "bg-red-50",     border: "border-red-100"     },
          { label: "Medium",        count: incomplete.filter(t => t.urgency === "medium").length, color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-100"   },
          { label: "Aging (3d+)",   count: aging.length,                                          color: "text-[#5E687B]",   bg: "bg-[#FAFBFC]",  border: "border-[#E5EAF0]"   },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-lg p-3 text-center`}>
            <div className={`text-xl font-bold ${color}`}>{count}</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Needs action */}
      {sorted.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-[#9000FF]" /> Needs Action
          </div>
          <div>{sorted.map(t => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}

      {/* Aging */}
      {aging.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" /> Aging — Not Touched in 3+ Days
          </div>
          <div>{aging.map(t => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}

      {incomplete.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-[#9E9FAE]">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm">All tasks are complete.</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Reports page ────────────────────────────────────────────────────────
export function Reports() {
  const { data: apiShipments, isLoading: loadingShipments } = useListShipments();
  const { data: apiTasks,     isLoading: loadingTasks     } = useListTasks();
  const { data: apiStages,    isLoading: loadingStages    } = useListStages();

  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  const shipments = apiShipments ?? [];
  const tasks     = apiTasks ?? [];
  const stageOrder = useMemo(() => {
    if (!apiStages) return [];
    return [...apiStages].sort((a, b) => a.sortOrder - b.sortOrder).map(s => s.id);
  }, [apiStages]);

  const isLoading = loadingShipments || loadingTasks || loadingStages;

  // headline KPIs for collapsed cards
  const totalUnpaid = (apiShipments ?? []).flatMap(s => s.payments).filter(p => !p.paid).reduce((s, p) => s + p.amountUsd, 0);
  const onTimeCount = shipments.filter(s => s.status === "on-track").length;
  const onTimePct   = shipments.length > 0 ? Math.round((onTimeCount / shipments.length) * 100) : 0;
  const supplierSet = new Set(shipments.map(s => s.supplierName));
  const openTaskCount = tasks.filter(t => !t.done).length;
  const highUrgent    = tasks.filter(t => !t.done && t.urgency === "high").length;

  const cards = [
    {
      id: "finance",
      icon: DollarSign,
      title: "Finance",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      kpi: fmtUsd(totalUnpaid),
      subtitle: "total unpaid across all shipments",
      content: <FinanceCardContent shipments={shipments} />,
    },
    {
      id: "pipeline",
      icon: TrendingUp,
      title: "Pipeline",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      kpi: <span>{onTimePct}% <span className="text-sm font-medium text-[#5E687B]">on-time</span></span>,
      subtitle: `${shipments.length} active shipments across ${stageOrder.length} stages`,
      content: <PipelineCardContent shipments={shipments} stageOrder={stageOrder} />,
    },
    {
      id: "suppliers",
      icon: Users,
      title: "Suppliers",
      iconColor: "text-[#9000FF]",
      iconBg: "bg-[#9000FF]/10",
      kpi: supplierSet.size,
      subtitle: "active suppliers in portfolio",
      content: <SuppliersCardContent shipments={shipments} tasks={tasks} />,
    },
    {
      id: "tasks",
      icon: ListTodo,
      title: "Tasks & Actions",
      iconColor: highUrgent > 0 ? "text-red-600" : "text-[#5E687B]",
      iconBg: highUrgent > 0 ? "bg-red-50" : "bg-[#F0F4F8]",
      kpi: (
        <span>
          {openTaskCount}{" "}
          {highUrgent > 0 && (
            <span className="text-sm font-medium text-red-500">{highUrgent} high</span>
          )}
        </span>
      ),
      subtitle: "open tasks across all shipments",
      content: <TasksCardContent tasks={tasks} shipments={shipments} />,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC] overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#212833]">Reports</h1>
              <p className="text-[11px] text-[#5E687B]">Portfolio-wide actionable insights across finance, pipeline, suppliers, and tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#5E687B]">
            <Package className="w-3.5 h-3.5" />
            <span className="font-medium">{shipments.length} shipments</span>
            <span className="text-[#D6E3EB]">·</span>
            <span>as of {shortDate(TODAY)}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 gap-2 text-[#9E9FAE]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading reports…</span>
            </div>
          ) : (
            cards.map(card => (
              <ReportCard
                key={card.id}
                id={card.id}
                icon={card.icon}
                title={card.title}
                iconColor={card.iconColor}
                iconBg={card.iconBg}
                kpi={card.kpi}
                subtitle={card.subtitle}
                expanded={expanded === card.id}
                onToggle={() => toggle(card.id)}
              >
                {card.content}
              </ReportCard>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
