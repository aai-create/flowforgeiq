import React, { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, ListTodo,
  ChevronDown, ChevronUp, AlertCircle, BarChart3, Package,
  ChevronsUpDown, RefreshCw, Clock, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer,
} from "recharts";
import {
  useListShipments,
  useListTasks,
  useListSuppliers,
  useListStages,
} from "@workspace/api-client-react";
import type { Shipment, Task, SupplierSummary } from "@workspace/api-client-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { shortDate } from "@/lib/adapters";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  if (days < 0)  return { badge: "bg-red-50 text-red-700 border-red-100",       label: `${Math.abs(days)}d late` };
  if (days <= 7) return { badge: "bg-amber-50 text-amber-700 border-amber-100", label: `${days}d`               };
  return               { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", label: `${days}d`          };
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
function ReportCard({
  icon: Icon, title, iconColor, iconBg, kpi, subtitle, expanded, onToggle, children,
}: {
  icon: React.ElementType; title: string; iconColor: string; iconBg: string;
  kpi: React.ReactNode; subtitle: string;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={`border rounded-xl bg-white transition-all ${expanded ? "border-[#9000FF]/25 shadow-md" : "border-[#E5EAF0] hover:border-[#D6E3EB] hover:shadow-sm"}`}>
      <button className="w-full text-left p-5 flex items-center gap-4" onClick={onToggle}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#5E687B] mb-0.5">{title}</div>
          <div className="text-xl font-bold text-[#212833] leading-none">{kpi}</div>
          <div className="text-[11px] text-[#9E9FAE] mt-0.5">{subtitle}</div>
        </div>
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${expanded ? "border-[#9000FF]/30 bg-[#9000FF]/5 text-[#9000FF]" : "border-[#E5EAF0] text-[#9E9FAE]"}`}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[#E5EAF0] p-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Finance Card ─────────────────────────────────────────────────────────────
const financeChartConfig: ChartConfig = {
  paid:   { label: "Paid",   color: "#10B981" },
  unpaid: { label: "Unpaid", color: "#9000FF" },
};

function FinanceCardContent({ shipments }: { shipments: Shipment[] }) {
  const allPayments = useMemo(() => shipments.flatMap(s => s.payments), [shipments]);

  const totalUnpaid  = allPayments.filter(p => !p.paid).reduce((s, p) => s + p.amountUsd, 0);
  const totalPaid    = allPayments.filter(p =>  p.paid).reduce((s, p) => s + p.amountUsd, 0);

  // Bucket payments by due-date proximity
  const chartData = useMemo(() => {
    const buckets: Record<string, { paid: number; unpaid: number }> = {
      "Overdue":    { paid: 0, unpaid: 0 },
      "≤ 30 days":  { paid: 0, unpaid: 0 },
      "31–60 days": { paid: 0, unpaid: 0 },
      "61–90 days": { paid: 0, unpaid: 0 },
    };
    for (const p of allPayments) {
      const d = daysDiff(p.dueDate);
      const key =
        d < 0         ? "Overdue"
        : d <= 30     ? "≤ 30 days"
        : d <= 60     ? "31–60 days"
        : d <= 90     ? "61–90 days"
        : null;
      if (!key) continue;
      if (p.paid) buckets[key].paid   += p.amountUsd;
      else        buckets[key].unpaid += p.amountUsd;
    }
    return Object.entries(buckets).map(([name, v]) => ({ name, ...v }));
  }, [allPayments]);

  // Unpaid ranked by supplier
  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier: string; unpaid: number; overdue: number }>();
    for (const s of shipments) {
      for (const p of s.payments) {
        if (p.paid) continue;
        const e = map.get(s.supplierName) ?? { supplier: s.supplierName, unpaid: 0, overdue: 0 };
        e.unpaid += p.amountUsd;
        if (daysDiff(p.dueDate) < 0) e.overdue += p.amountUsd;
        map.set(s.supplierName, e);
      }
    }
    return [...map.values()].sort((a, b) => b.unpaid - a.unpaid);
  }, [shipments]);

  return (
    <div className="space-y-5">
      {/* KPI trio */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Unpaid",  value: fmtUsd(totalUnpaid),           color: "text-[#212833]"   },
          { label: "Total Paid",    value: fmtUsd(totalPaid),             color: "text-emerald-600" },
          { label: "Total Exposure",value: fmtUsd(totalUnpaid + totalPaid), color: "text-[#5E687B]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3 text-center">
            <div className={`text-lg font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Paid vs Unpaid bar chart per time bucket */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-3">
          Cash Flow by Due Date — Paid vs Unpaid
        </div>
        <ChartContainer config={financeChartConfig} className="h-[180px] w-full">
          <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
            <CartesianGrid vertical={false} stroke="#F0F4F8" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5E687B" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtUsd(Number(v))} tick={{ fontSize: 10, fill: "#9E9FAE" }} axisLine={false} tickLine={false} width={52} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [`${fmtUsd(Number(v))}`, n === "paid" ? "Paid" : "Unpaid"]} />} />
            <Bar dataKey="paid"   fill="var(--color-paid)"   radius={[3, 3, 0, 0]} />
            <Bar dataKey="unpaid" fill="var(--color-unpaid)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
        <div className="flex items-center gap-4 justify-center mt-1">
          <span className="flex items-center gap-1.5 text-[10px] text-[#5E687B]"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Paid</span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#5E687B]"><span className="w-2.5 h-2.5 rounded-sm bg-[#9000FF] inline-block" />Unpaid</span>
        </div>
      </div>

      {/* Unpaid by supplier table */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2">Unpaid by Supplier</div>
        {bySupplier.length === 0
          ? <p className="text-xs text-[#9E9FAE]">All payments are up to date.</p>
          : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#E5EAF0]">
                  <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Supplier</th>
                  <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Unpaid</th>
                  <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {bySupplier.map(row => (
                  <tr key={row.supplier} className="border-b border-[#F0F4F8] last:border-0">
                    <td className="py-2 text-[#212833] font-medium">{row.supplier}</td>
                    <td className="py-2 text-right font-semibold text-[#212833]">{fmtUsd(row.unpaid)}</td>
                    <td className="py-2 text-right">
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
const pipelineChartConfig: ChartConfig = {
  count: { label: "Shipments", color: "#9000FF" },
};

function PipelineCardContent({ shipments, stageOrder }: { shipments: Shipment[]; stageOrder: { id: string; label: string }[] }) {
  const onTime  = shipments.filter(s => s.status === "on-track").length;
  const atRisk  = shipments.filter(s => s.status === "at-risk").length;
  const delayed = shipments.filter(s => s.status === "delayed").length;
  const total   = shipments.length || 1;

  const stageChartData = useMemo(() => {
    const countById = new Map<string, number>();
    for (const s of shipments) {
      countById.set(s.currentStageId, (countById.get(s.currentStageId) ?? 0) + 1);
    }
    return stageOrder
      .map(({ id, label }) => ({ name: label.length > 12 ? label.slice(0, 11) + "…" : label, count: countById.get(id) ?? 0 }))
      .filter(s => s.count > 0);
  }, [shipments, stageOrder]);

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
          { label: "On Track", count: onTime,  pct: Math.round((onTime / total)  * 100), bg: "bg-emerald-50 border-emerald-100", dot: "bg-emerald-500", text: "text-emerald-700" },
          { label: "At Risk",  count: atRisk,  pct: Math.round((atRisk / total)  * 100), bg: "bg-amber-50 border-amber-100",   dot: "bg-amber-500",   text: "text-amber-700"   },
          { label: "Delayed",  count: delayed, pct: Math.round((delayed / total) * 100), bg: "bg-red-50 border-red-100",       dot: "bg-red-500",     text: "text-red-700"     },
        ].map(({ label, count, pct, bg, dot, text }) => (
          <div key={label} className={`border rounded-lg p-3 ${bg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className={`text-[10px] font-bold ${text} uppercase tracking-wide`}>{label}</span>
            </div>
            <div className={`text-xl font-bold ${text}`}>{count}</div>
            <div className={`text-[10px] ${text} opacity-70`}>{pct}% of portfolio</div>
          </div>
        ))}
      </div>

      {/* Stage distribution bar chart */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-3">Stage Distribution</div>
        <ChartContainer config={pipelineChartConfig} className="h-[160px] w-full">
          <BarChart data={stageChartData} layout="vertical" barCategoryGap="25%">
            <CartesianGrid horizontal={false} stroke="#F0F4F8" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#9E9FAE" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#5E687B" }} axisLine={false} tickLine={false} width={80} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 3, 3, 0]}>
              {stageChartData.map((entry, index) => (
                <Cell key={index} fill={`rgba(144, 0, 255, ${0.3 + (entry.count / (Math.max(...stageChartData.map(d => d.count)) || 1)) * 0.7})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
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
                      {tl.label}
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
  id: number;
  name: string;
  country: string;
  active: number;
  onTimePct: number;
  openTasks: number;
  avgUnitPrice: number | null;
}

function SuppliersCardContent({
  shipments, tasks, suppliers,
}: { shipments: Shipment[]; tasks: Task[]; suppliers: SupplierSummary[] }) {
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: "active", dir: "desc" });

  const rows: SupplierRow[] = useMemo(() => {
    const countryById = new Map(suppliers.map(s => [s.id, s.country]));

    const map = new Map<number, SupplierRow>();
    for (const s of shipments) {
      const r = map.get(s.supplierId) ?? {
        id: s.supplierId,
        name: s.supplierName,
        country: countryById.get(s.supplierId) ?? "—",
        active: 0, onTimePct: 0, openTasks: 0, avgUnitPrice: null,
      };
      r.active++;
      map.set(s.supplierId, r);
    }

    // on-time %
    const onTimeCount = new Map<number, { on: number; total: number }>();
    for (const s of shipments) {
      const e = onTimeCount.get(s.supplierId) ?? { on: 0, total: 0 };
      e.total++;
      if (s.status === "on-track") e.on++;
      onTimeCount.set(s.supplierId, e);
    }
    for (const [id, { on, total }] of onTimeCount) {
      const r = map.get(id);
      if (r) r.onTimePct = total > 0 ? Math.round((on / total) * 100) : 0;
    }

    // open tasks per supplier keyed by supplierId on the shipment
    const supplierShipIds = new Map<number, Set<number>>();
    for (const s of shipments) {
      const set = supplierShipIds.get(s.supplierId) ?? new Set();
      set.add(s.id);
      supplierShipIds.set(s.supplierId, set);
    }
    for (const t of tasks) {
      if (t.done) continue;
      for (const [suppId, ids] of supplierShipIds) {
        if (ids.has(t.shipmentId)) {
          const r = map.get(suppId);
          if (r) r.openTasks++;
        }
      }
    }

    // avg unit price from selected quotes
    const priceAccum = new Map<number, { sum: number; n: number }>();
    for (const s of shipments) {
      const selected = s.quotes.find(q => q.selected);
      if (!selected) continue;
      const e = priceAccum.get(s.supplierId) ?? { sum: 0, n: 0 };
      e.sum += selected.unitPrice;
      e.n++;
      priceAccum.set(s.supplierId, e);
    }
    for (const [id, { sum, n }] of priceAccum) {
      const r = map.get(id);
      if (r) r.avgUnitPrice = n > 0 ? sum / n : null;
    }

    return [...map.values()];
  }, [shipments, tasks, suppliers]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const mul = sort.dir === "asc" ? 1 : -1;
      if (sort.col === "name")       return mul * a.name.localeCompare(b.name);
      if (sort.col === "active")     return mul * (a.active - b.active);
      if (sort.col === "onTimePct")  return mul * (a.onTimePct - b.onTimePct);
      if (sort.col === "openTasks")  return mul * (a.openTasks - b.openTasks);
      if (sort.col === "avgUnit") {
        return mul * ((a.avgUnitPrice ?? -1) - (b.avgUnitPrice ?? -1));
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
            <tr key={row.id} className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] transition-colors">
              <td className="px-3 py-2.5 font-medium text-[#212833]">
                {row.name}
                <span className="ml-1.5 text-[9px] text-[#9E9FAE] font-normal">{row.country}</span>
              </td>
              <td className="px-3 py-2.5 text-center font-semibold text-[#212833]">{row.active}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#F0F4F8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.onTimePct >= 70 ? "bg-emerald-500" : row.onTimePct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${row.onTimePct}%`, transition: "width 0.6s ease" }}
                    />
                  </div>
                  <span className={`w-10 text-right font-semibold text-[11px] shrink-0 ${otColor}`}>{row.onTimePct}%</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-center">
                {row.openTasks > 0
                  ? <span className={`font-bold ${row.openTasks >= 3 ? "text-red-600" : "text-amber-600"}`}>{row.openTasks}</span>
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
  );
}

// ─── Tasks Card ───────────────────────────────────────────────────────────────
function isAging(sourceAge: string): boolean {
  const match = sourceAge.match(/^(\d+)d\s+ago$/i);
  if (match && parseInt(match[1]) >= 3) return true;
  return /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i.test(sourceAge.trim());
}

function urgencyBadgeCls(u: string) {
  if (u === "high")   return "bg-red-50 text-red-700 border-red-100";
  if (u === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";
}

function TasksCardContent({ tasks, shipments }: { tasks: Task[]; shipments: Shipment[] }) {
  const [collapsedShipments, setCollapsedShipments] = useState<Set<number>>(new Set());

  const shipMap = useMemo(() => new Map(shipments.map(s => [s.id, s])), [shipments]);
  const urgencyOrder = { high: 0, medium: 1, low: 2 };

  const incomplete = tasks.filter(t => !t.done);
  const actionable = incomplete.filter(t => !isAging(t.sourceAge));
  const aging      = incomplete.filter(t =>  isAging(t.sourceAge));

  // Group tasks by shipmentId
  function groupByShipment(list: Task[]) {
    const map = new Map<number, Task[]>();
    for (const t of list) {
      const arr = map.get(t.shipmentId) ?? [];
      arr.push(t);
      map.set(t.shipmentId, arr);
    }
    // Sort within each group by urgency
    for (const [id, arr] of map) {
      arr.sort((a, b) =>
        urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder]
      );
      map.set(id, arr);
    }
    // Sort groups: group with highest-urgency task first
    return [...map.entries()].sort(([, a], [, b]) => {
      const topA = urgencyOrder[a[0].urgency as keyof typeof urgencyOrder];
      const topB = urgencyOrder[b[0].urgency as keyof typeof urgencyOrder];
      return topA - topB;
    });
  }

  function toggleShipment(id: number) {
    setCollapsedShipments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ShipmentGroup({ shipmentId, tasks: groupTasks }: { shipmentId: number; tasks: Task[] }) {
    const ship = shipMap.get(shipmentId);
    const collapsed = collapsedShipments.has(shipmentId);
    const topUrgency = groupTasks[0]?.urgency ?? "low";
    const dotColor = topUrgency === "high" ? "bg-red-500" : topUrgency === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]";

    return (
      <div className="border border-[#E5EAF0] rounded-lg overflow-hidden mb-2 last:mb-0">
        {/* Shipment header */}
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-[#FAFBFC] hover:bg-[#F0F4F8] transition-colors text-left"
          onClick={() => toggleShipment(shipmentId)}
        >
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="font-mono text-[10px] bg-white border border-[#E5EAF0] px-1.5 py-0.5 rounded text-[#5E687B] shrink-0">
            {ship?.poNumber ?? `#${shipmentId}`}
          </span>
          {ship && (
            <span className="text-[11px] font-medium text-[#212833] truncate flex-1">{ship.product}</span>
          )}
          <span className="text-[10px] text-[#9E9FAE] shrink-0 ml-auto mr-1">{groupTasks.length} task{groupTasks.length > 1 ? "s" : ""}</span>
          {collapsed ? <ChevronDown className="w-3 h-3 text-[#9E9FAE] shrink-0" /> : <ChevronUp className="w-3 h-3 text-[#9E9FAE] shrink-0" />}
        </button>
        {/* Tasks within shipment */}
        {!collapsed && (
          <div className="divide-y divide-[#F0F4F8]">
            {groupTasks.map(task => (
              <div key={task.id} className="flex items-start gap-3 px-3 py-2.5">
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${task.urgency === "high" ? "bg-red-500" : task.urgency === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#212833] leading-snug line-clamp-2">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#9E9FAE]">{task.source}</span>
                    <span className="text-[10px] text-[#9E9FAE] opacity-40">·</span>
                    <span className={`text-[10px] ${task.urgency === "high" ? "text-red-500 font-semibold" : "text-[#9E9FAE]"}`}>{task.sourceAge}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${urgencyBadgeCls(task.urgency)}`}>
                  {task.urgency}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const actionableGroups = groupByShipment(actionable);
  const agingGroups      = groupByShipment(aging);

  return (
    <div className="space-y-4">
      {/* KPI trio */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "High Urgency", count: incomplete.filter(t => t.urgency === "high").length,   bg: "bg-red-50 border-red-100",       color: "text-red-600"   },
          { label: "Medium",       count: incomplete.filter(t => t.urgency === "medium").length, bg: "bg-amber-50 border-amber-100",   color: "text-amber-600" },
          { label: "Aging (3d+)",  count: aging.length,                                          bg: "bg-[#FAFBFC] border-[#E5EAF0]",  color: "text-[#5E687B]" },
        ].map(({ label, count, bg, color }) => (
          <div key={label} className={`border rounded-lg p-3 text-center ${bg}`}>
            <div className={`text-xl font-bold ${color}`}>{count}</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Needs Action — grouped by shipment */}
      {actionableGroups.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-[#9000FF]" /> Needs Action
          </div>
          {actionableGroups.map(([shipmentId, groupTasks]) => (
            <ShipmentGroup key={shipmentId} shipmentId={shipmentId} tasks={groupTasks} />
          ))}
        </div>
      )}

      {/* Aging — grouped by shipment */}
      {agingGroups.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" /> Aging — Not Touched in 3+ Days
          </div>
          {agingGroups.map(([shipmentId, groupTasks]) => (
            <ShipmentGroup key={shipmentId} shipmentId={shipmentId} tasks={groupTasks} />
          ))}
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
  const { data: apiSuppliers, isLoading: loadingSuppliers } = useListSuppliers();

  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  const shipments  = apiShipments ?? [];
  const tasks      = apiTasks     ?? [];
  const suppliers  = apiSuppliers ?? [];

  const stageOrder = useMemo(() => {
    if (!apiStages) return [];
    return [...apiStages].sort((a, b) => a.sortOrder - b.sortOrder).map(s => ({ id: s.id, label: s.label }));
  }, [apiStages]);

  const isLoading = loadingShipments || loadingTasks || loadingStages || loadingSuppliers;

  // Collapsed KPIs
  const totalUnpaid   = shipments.flatMap(s => s.payments).filter(p => !p.paid).reduce((s, p) => s + p.amountUsd, 0);
  const onTimeCount   = shipments.filter(s => s.status === "on-track").length;
  const onTimePct     = shipments.length > 0 ? Math.round((onTimeCount / shipments.length) * 100) : 0;
  const supplierCount = new Set(shipments.map(s => s.supplierId)).size;
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
      kpi: supplierCount,
      subtitle: "active suppliers in portfolio",
      content: <SuppliersCardContent shipments={shipments} tasks={tasks} suppliers={suppliers} />,
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
          {highUrgent > 0 && <span className="text-sm font-medium text-red-500">{highUrgent} high</span>}
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
