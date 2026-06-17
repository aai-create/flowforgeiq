import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { NavSidebar } from "@/components/NavSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useCopilotHint } from "@/lib/CopilotContext";
import {
  DollarSign, TrendingUp, Users, ListTodo,
  ChevronDown, ChevronUp, AlertCircle, BarChart3, Package,
  ChevronsUpDown, RefreshCw, Clock, CheckCircle2, ArrowRight, ArrowLeft,
  CalendarRange, X, Layers, ExternalLink, TrendingDown,
  Inbox, ShieldAlert,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer,
} from "recharts";
import {
  useListShipments,
  useListTasks,
  useListSuppliers,
  useListStages,
  useListDeals,
  updatePayment,
  getListShipmentsQueryKey,
} from "@workspace/api-client-react";
import type { Shipment, Task, SupplierSummary, DealWithSpread } from "@workspace/api-client-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { shortDate } from "@/lib/adapters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

// Matches the project-wide demo seed date (see scripts/src/build-seed-data.ts and adapters.ts).
// All shipment dates are shifted relative to this anchor, so runtime Date.now() would make
// every bucket appear "overdue". Update here and in adapters.ts if the seed anchor changes.
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

function inRange(iso: string, start: Date | null, end: Date | null): boolean {
  const d = new Date(iso);
  if (start && d < start) return false;
  if (end) {
    // Extend to end-of-day in UTC so the end date is inclusive
    const endOfDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
    if (d > endOfDay) return false;
  }
  return true;
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

const monthlyChartConfig: ChartConfig = {
  total: { label: "Paid", color: "#10B981" },
};

interface RecoveryForm { paymentId: number; amount: string; date: string; }

function FinanceCardContent({
  shipments, rangeStart, rangeEnd,
}: { shipments: Shipment[]; rangeStart: Date | null; rangeEnd: Date | null }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [recoveryForm, setRecoveryForm] = useState<RecoveryForm | null>(null);
  const [recoveryOverrides, setRecoveryOverrides] = useState<Record<number, number>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const allPayments = useMemo(() => {
    const payments = shipments.flatMap(s => s.payments);
    if (!rangeStart && !rangeEnd) return payments;
    return payments.filter(p => inRange(p.dueDate, rangeStart, rangeEnd));
  }, [shipments, rangeStart, rangeEnd]);

  // Both totals use paidAt (actual recorded payment date) as the source of truth.
  // A payment is "paid to date" when paidAt is set; "outstanding" when paidAt is null.
  const totalPaidToDate  = allPayments.filter(p => p.paidAt != null).reduce((s, p) => s + p.amountUsd, 0);
  const totalOutstanding = allPayments.filter(p => p.paidAt == null).reduce((s, p) => s + p.amountUsd, 0);

  // Monthly payments chart — buckets payments by the month of paidAt
  const monthlyPaidData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPayments) {
      if (p.paidAt == null) continue;
      const d = new Date(p.paidAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + p.amountUsd);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [y, m] = key.split("-");
        const label = new Date(Number(y), Number(m) - 1, 1)
          .toLocaleString("en-US", { month: "short", year: "2-digit" });
        return { name: label, total };
      });
  }, [allPayments]);

  // Per-payment rows for the Intermediary Recovery section
  const intermediaryPayments = useMemo(() => {
    return shipments.flatMap(s =>
      s.payments
        .filter(p => (p.intermediaryAdvanceUsd ?? 0) > 0)
        .filter(p => inRange(p.dueDate, rangeStart, rangeEnd))
        .map(p => {
          const recoveredUsd = recoveryOverrides[p.id] ?? (p.intermediaryRecoveredUsd ?? 0);
          return {
            paymentId: p.id,
            shipmentId: s.id,
            shipmentPo: s.poNumber,
            supplierName: s.supplierName,
            label: p.label,
            advanceUsd: p.intermediaryAdvanceUsd ?? 0,
            recoveredUsd,
            outstandingUsd: Math.max(0, (p.intermediaryAdvanceUsd ?? 0) - recoveredUsd),
          };
        })
    ).sort((a, b) => b.outstandingUsd - a.outstandingUsd);
  }, [shipments, rangeStart, rangeEnd, recoveryOverrides]);

  // Intermediary totals derived from the per-payment list (respects overrides)
  const totalIntermediaryAdvance      = intermediaryPayments.reduce((s, p) => s + p.advanceUsd, 0);
  const totalIntermediaryRecovered    = intermediaryPayments.reduce((s, p) => s + p.recoveredUsd, 0);
  const totalIntermediaryOutstanding  = Math.max(0, totalIntermediaryAdvance - totalIntermediaryRecovered);
  const hasIntermediaryData           = totalIntermediaryAdvance > 0;

  const openRecovery = (paymentId: number, currentRecoveredUsd: number) => {
    setRecoveryForm({
      paymentId,
      amount: String(currentRecoveredUsd > 0 ? currentRecoveredUsd : ""),
      date: new Date().toISOString().split("T")[0],
    });
  };

  const saveRecovery = async () => {
    if (!recoveryForm) return;
    const { paymentId, amount, date } = recoveryForm;
    const amountUsd = Math.round(Number(amount));
    if (isNaN(amountUsd) || amountUsd < 0) return;
    const recoveredAt = date ? new Date(date + "T00:00:00Z").toISOString() : new Date().toISOString();
    setSavingId(paymentId);
    setRecoveryOverrides(prev => ({ ...prev, [paymentId]: amountUsd }));
    setRecoveryForm(null);
    try {
      await updatePayment(paymentId, { intermediaryRecoveredUsd: amountUsd, intermediaryRecoveredAt: recoveredAt });
      void queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
    } catch {
      // rollback on error
      setRecoveryOverrides(prev => { const next = { ...prev }; delete next[paymentId]; return next; });
    } finally {
      setSavingId(null);
    }
  };

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
      if (p.paidAt != null) buckets[key].paid   += p.amountUsd;
      else                  buckets[key].unpaid += p.amountUsd;
    }
    return Object.entries(buckets).map(([name, v]) => ({ name, ...v }));
  }, [allPayments]);

  // Outstanding ranked by supplier — includes intermediary advance breakdown
  // Uses paidAt == null (recorded-payment semantics) consistent with totalOutstanding above
  const bySupplier = useMemo(() => {
    const map = new Map<string, { supplier: string; unpaid: number; overdue: number; intermediaryAdvance: number; intermediaryRecovered: number }>();
    for (const s of shipments) {
      for (const p of s.payments) {
        if (p.paidAt != null) continue;
        if (!inRange(p.dueDate, rangeStart, rangeEnd)) continue;
        const e = map.get(s.supplierName) ?? { supplier: s.supplierName, unpaid: 0, overdue: 0, intermediaryAdvance: 0, intermediaryRecovered: 0 };
        e.unpaid += p.amountUsd;
        if (daysDiff(p.dueDate) < 0) e.overdue += p.amountUsd;
        e.intermediaryAdvance   += (p.intermediaryAdvanceUsd  ?? 0);
        e.intermediaryRecovered += (p.intermediaryRecoveredUsd ?? 0);
        map.set(s.supplierName, e);
      }
    }
    return [...map.values()].sort((a, b) => b.unpaid - a.unpaid);
  }, [shipments, rangeStart, rangeEnd]);

  return (
    <div className="space-y-5">
      {/* KPI trio */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Outstanding Balance", value: fmtUsd(totalOutstanding), color: "text-[#212833]",   title: "Milestones with no recorded paidAt date" },
          { label: "Paid to Date",        value: fmtUsd(totalPaidToDate),  color: "text-emerald-600", title: "Milestones with a recorded paidAt date" },
          { label: "Total Exposure",      value: fmtUsd(totalOutstanding + totalPaidToDate), color: "text-[#5E687B]", title: "Outstanding + Paid to date" },
        ].map(({ label, value, color, title }) => (
          <div key={label} className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3 text-center" title={title}>
            <div className={`text-lg font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Monthly payments timeline — grouped by paidAt */}
      {monthlyPaidData.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-3">
            Payments Recorded by Month
          </div>
          <ChartContainer config={monthlyChartConfig} className="h-[160px] w-full">
            <BarChart data={monthlyPaidData} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="#F0F4F8" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5E687B" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtUsd(Number(v))} tick={{ fontSize: 10, fill: "#9E9FAE" }} axisLine={false} tickLine={false} width={52} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => [fmtUsd(Number(v)), "Paid"]} />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="flex items-center gap-1.5 justify-center mt-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-[10px] text-[#5E687B]">Payments recorded (paidAt date)</span>
          </div>
        </div>
      )}

      {/* Paid vs Unpaid bar chart per time bucket */}
      <div>
        <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-3">
          Cash Flow by Due Date — Paid vs Outstanding
        </div>
        <ChartContainer config={financeChartConfig} className="h-[180px] w-full">
          <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
            <CartesianGrid vertical={false} stroke="#F0F4F8" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5E687B" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtUsd(Number(v))} tick={{ fontSize: 10, fill: "#9E9FAE" }} axisLine={false} tickLine={false} width={52} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => [`${fmtUsd(Number(v))}`, n === "paid" ? "Paid" : "Outstanding"]} />} />
            <Bar dataKey="paid"   fill="var(--color-paid)"   radius={[3, 3, 0, 0]} />
            <Bar dataKey="unpaid" fill="var(--color-unpaid)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
        <div className="flex items-center gap-4 justify-center mt-1">
          <span className="flex items-center gap-1.5 text-[10px] text-[#5E687B]"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Paid</span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#5E687B]"><span className="w-2.5 h-2.5 rounded-sm bg-[#9000FF] inline-block" />Outstanding</span>
        </div>
      </div>

      {/* Unpaid by supplier table */}
      <div>
        <div className="mb-2">
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">Unpaid by Supplier</div>
          <div className="text-[10px] text-[#9E9FAE] mt-0.5">owed by Buyer</div>
        </div>
        {bySupplier.length === 0
          ? <p className="text-xs text-[#9E9FAE]">All payments are up to date.</p>
          : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#E5EAF0]">
                  <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Supplier</th>
                  <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">
                    <span title="Amount the Buyer has not yet remitted to this Supplier">Unpaid</span>
                  </th>
                  <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">
                    <span title="Unpaid amount where the Buyer's due date has already passed">Overdue</span>
                  </th>
                  {hasIntermediaryData && (
                    <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">
                      <span title="Amount the Intermediary has already fronted to this Supplier on behalf of the Buyer">Intermediary Advance</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {bySupplier.map(row => (
                  <tr
                    key={row.supplier}
                    className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors group"
                    onClick={() => navigate(`/?supplier=${encodeURIComponent(row.supplier)}`)}
                    title={`Open inbox filtered by ${row.supplier}`}
                  >
                    <td className="py-2 text-[#212833] font-medium">
                      <span className="flex items-center gap-1.5">
                        {row.supplier}
                        <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold text-[#212833]">{fmtUsd(row.unpaid)}</td>
                    <td className="py-2 text-right">
                      {row.overdue > 0
                        ? <span className="text-red-600 font-semibold">{fmtUsd(row.overdue)}</span>
                        : <span className="text-[#9E9FAE]">—</span>
                      }
                    </td>
                    {hasIntermediaryData && (
                      <td className="py-2 text-right">
                        {row.intermediaryAdvance > 0
                          ? (
                            <span className="text-amber-600 font-semibold" title={`${fmtUsd(row.intermediaryRecovered)} recovered so far`}>
                              {fmtUsd(row.intermediaryAdvance)}
                            </span>
                          )
                          : <span className="text-[#9E9FAE]">—</span>
                        }
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Intermediary Recovery section — only shown when advance data exists */}
      {hasIntermediaryData && (
        <div className="border border-amber-100 bg-amber-50 rounded-lg p-3 space-y-3">
          <div>
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Intermediary Recovery</div>
            <div className="text-[10px] text-amber-600 mt-0.5">amount the Intermediary is owed by Buyer</div>
          </div>

          {/* KPI trio */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Advanced",   value: fmtUsd(totalIntermediaryAdvance),     color: "text-amber-800", title: "Total amount the Intermediary has fronted to Suppliers across all payments" },
              { label: "Recovered",        value: fmtUsd(totalIntermediaryRecovered),   color: "text-emerald-700", title: "Amount the Buyer has already repaid to the Intermediary" },
              { label: "Outstanding",      value: fmtUsd(totalIntermediaryOutstanding), color: totalIntermediaryOutstanding > 0 ? "text-red-600" : "text-[#5E687B]", title: "Remaining advance the Buyer still owes the Intermediary" },
            ].map(({ label, value, color, title }) => (
              <div key={label} className="bg-white border border-amber-100 rounded p-2 text-center" title={title}>
                <div className={`text-sm font-bold ${color}`}>{value}</div>
                <div className="text-[10px] text-amber-700 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Per-payment rows */}
          <div className="bg-white border border-amber-100 rounded-lg overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-amber-100 bg-amber-50/60">
                  <th className="text-left text-[10px] font-bold text-amber-700 uppercase tracking-wide px-3 py-2">Payment</th>
                  <th className="text-right text-[10px] font-bold text-amber-700 uppercase tracking-wide px-3 py-2">Advanced</th>
                  <th className="text-right text-[10px] font-bold text-amber-700 uppercase tracking-wide px-3 py-2">Recovered</th>
                  <th className="text-right text-[10px] font-bold text-amber-700 uppercase tracking-wide px-3 py-2">Outstanding</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {intermediaryPayments.map(row => {
                  const isOpen = recoveryForm?.paymentId === row.paymentId;
                  const isSaving = savingId === row.paymentId;
                  return (
                    <React.Fragment key={row.paymentId}>
                      <tr
                        className="border-b border-amber-50 last:border-0 hover:bg-amber-50/60 cursor-pointer transition-colors group/irow"
                        onClick={() => navigate(`/?shipment=${row.shipmentId}&from=reports`)}
                        title={`Open ${row.shipmentPo} in inbox`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-[#212833] truncate max-w-[140px] flex items-center gap-1" title={row.supplierName}>
                            {row.supplierName}
                            <ArrowRight className="w-2.5 h-2.5 text-[#9000FF] opacity-0 group-hover/irow:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="text-[10px] text-[#9E9FAE]">{row.shipmentPo} · {row.label}</div>
                        </td>
                        <td className="px-3 py-2 text-right text-amber-700 font-semibold">{fmtUsd(row.advanceUsd)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-semibold">
                          {row.recoveredUsd > 0 ? fmtUsd(row.recoveredUsd) : <span className="text-[#9E9FAE]">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {row.outstandingUsd > 0
                            ? <span className="text-red-600">{fmtUsd(row.outstandingUsd)}</span>
                            : <span className="text-emerald-600">Settled</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={e => { e.stopPropagation(); isOpen ? setRecoveryForm(null) : openRecovery(row.paymentId, row.recoveredUsd); }}
                            className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                              isOpen
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                            } disabled:opacity-50`}
                          >
                            {isSaving ? "Saving…" : isOpen ? "Cancel" : "Record Recovery"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-amber-50">
                          <td colSpan={5} className="px-3 py-2 bg-amber-50/60">
                            <div className="flex items-end gap-2 flex-wrap">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Recovered Amount (USD)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={recoveryForm.amount}
                                  onChange={e => setRecoveryForm(f => f ? { ...f, amount: e.target.value } : f)}
                                  className="w-32 text-xs border border-amber-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Recovery Date</label>
                                <input
                                  type="date"
                                  value={recoveryForm.date}
                                  onChange={e => setRecoveryForm(f => f ? { ...f, date: e.target.value } : f)}
                                  className="text-xs border border-amber-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={saveRecovery}
                                disabled={!recoveryForm.amount || Number(recoveryForm.amount) < 0}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
                              >
                                Save Recovery
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Card ────────────────────────────────────────────────────────────
const pipelineChartConfig: ChartConfig = {
  count: { label: "Shipments", color: "#9000FF" },
};

function PipelineCardContent({ shipments, stageOrder }: { shipments: Shipment[]; stageOrder: { id: string; label: string }[] }) {
  const [, navigate] = useLocation();
  // shipment.status is the authoritative backend field (set by the seed/API layer based on
  // delay flags and stage progress). Using it directly avoids divergence from the source of truth.
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
        {exFactoryList.length === 0
          ? <p className="text-xs text-[#9E9FAE]">No shipments with ex-factory dates in this window.</p>
          : (
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
                    <tr
                      key={s.id}
                      className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors group"
                      onClick={() => navigate(`/?shipment=${s.id}&from=reports`)}
                      title={`Open ${s.poNumber} in inbox`}
                    >
                      <td className="py-1.5">
                        <span className="font-mono text-[10px] bg-[#FAFBFC] border border-[#E5EAF0] px-1.5 py-0.5 rounded text-[#5E687B] group-hover:border-[#9000FF]/30 group-hover:text-[#9000FF] transition-colors">
                          {s.poNumber}
                        </span>
                      </td>
                      <td className="py-1.5 pl-2 text-[#212833] font-medium max-w-[180px] truncate">
                        <span className="flex items-center gap-1.5">
                          {s.product}
                          <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </span>
                      </td>
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
          )
        }
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
  const [, navigate] = useLocation();
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

  if (sorted.length === 0) {
    return <p className="text-xs text-[#9E9FAE] py-2">No suppliers have shipments in this window.</p>;
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
            <tr
              key={row.id}
              className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] transition-colors cursor-pointer group"
              onClick={() => navigate(`/?supplier=${encodeURIComponent(row.name)}`)}
              title={`Open inbox filtered by ${row.name}`}
            >
              <td className="px-3 py-2.5 font-medium text-[#212833]">
                <span className="flex items-center gap-1.5">
                  {row.name}
                  <span className="ml-0.5 text-[9px] text-[#9E9FAE] font-normal">{row.country}</span>
                  <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
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
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY_DOW = new Date("2026-05-18T00:00:00Z").getUTCDay(); // 1 = Monday

function isAging(sourceAge: string): boolean {
  // "Xd ago" for X >= 3 (7+ days old)
  const numericMatch = sourceAge.match(/^(\d+)d\s+ago$/i);
  if (numericMatch) return parseInt(numericMatch[1]) >= 3;

  // Weekday names cover days 2–6 old. Calculate exact delta from today's DOW.
  // "Just now", "Xh ago", "Yesterday" → not aging.
  const dow = WEEKDAY_NAMES.indexOf(sourceAge.trim());
  if (dow === -1) return false;

  let daysAgo = (TODAY_DOW - dow + 7) % 7;
  if (daysAgo === 0) daysAgo = 7; // same weekday name wraps to 7 (would be "7d ago" but guard anyway)
  return daysAgo >= 3;
}

function urgencyBadgeCls(u: string) {
  if (u === "high")   return "bg-red-50 text-red-700 border-red-100";
  if (u === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";
}

function TasksCardContent({ tasks, shipments }: { tasks: Task[]; shipments: Shipment[] }) {
  const [, navigate] = useLocation();
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
        <div className="flex items-center bg-[#FAFBFC] hover:bg-[#F0F4F8] transition-colors group/header">
          <button
            className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left"
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
          <button
            className="px-2 py-2 opacity-0 group-hover/header:opacity-100 transition-opacity text-[#9000FF] hover:text-[#7A00D9] shrink-0"
            onClick={() => navigate(`/?shipment=${shipmentId}&from=reports`)}
            title={`Open ${ship?.poNumber ?? `shipment #${shipmentId}`} in inbox`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Tasks within shipment */}
        {!collapsed && (
          <div className="divide-y divide-[#F0F4F8]">
            {groupTasks.map(task => (
              <button
                key={task.id}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[#FAFBFC] transition-colors group/row"
                onClick={() => navigate(`/?shipment=${shipmentId}&from=reports`)}
                title={`Open ${ship?.poNumber ?? `shipment #${shipmentId}`} in inbox`}
              >
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${task.urgency === "high" ? "bg-red-500" : task.urgency === "medium" ? "bg-amber-400" : "bg-[#C0C8D4]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#212833] leading-snug line-clamp-2 group-hover/row:text-[#9000FF] transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#9E9FAE]">{task.source}</span>
                    <span className="text-[10px] text-[#9E9FAE] opacity-40">·</span>
                    <span className={`text-[10px] ${task.urgency === "high" ? "text-red-500 font-semibold" : "text-[#9E9FAE]"}`}>{task.sourceAge}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover/row:opacity-100 transition-opacity" />
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${urgencyBadgeCls(task.urgency)}`}>
                    {task.urgency}
                  </span>
                </div>
              </button>
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

// ─── DateRangePicker ──────────────────────────────────────────────────────────
function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const PRESETS = [
  {
    label: "Next 30 days",
    getRange: () => {
      const start = new Date(TODAY);
      const end   = new Date(TODAY);
      end.setUTCDate(end.getUTCDate() + 30);
      return { start, end };
    },
  },
  {
    label: "Next 60 days",
    getRange: () => {
      const start = new Date(TODAY);
      const end   = new Date(TODAY);
      end.setUTCDate(end.getUTCDate() + 60);
      return { start, end };
    },
  },
  {
    label: "This quarter",
    getRange: () => {
      // Q2 2026: Apr 1 – Jun 30
      const year = TODAY.getUTCFullYear();
      const month = TODAY.getUTCMonth(); // 0-indexed
      const quarterStart = Math.floor(month / 3) * 3;
      const start = new Date(Date.UTC(year, quarterStart, 1));
      const end   = new Date(Date.UTC(year, quarterStart + 3, 0));
      return { start, end };
    },
  },
];

interface DateRangePickerProps {
  rangeStart: Date | null;
  rangeEnd:   Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

function DateRangePicker({ rangeStart, rangeEnd, onChange }: DateRangePickerProps) {
  const [calOpen, setCalOpen] = useState(false);
  const hasRange = rangeStart !== null || rangeEnd !== null;

  const activePreset = PRESETS.find(p => {
    const r = p.getRange();
    return (
      rangeStart?.getTime() === r.start.getTime() &&
      rangeEnd?.getTime()   === r.end.getTime()
    );
  });

  function applyPreset(preset: typeof PRESETS[0]) {
    const r = preset.getRange();
    onChange(r.start, r.end);
    setCalOpen(false);
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    onChange(range?.from ?? null, range?.to ?? null);
  }

  function clearRange() {
    onChange(null, null);
    setCalOpen(false);
  }

  const calValue: DateRange | undefined =
    rangeStart || rangeEnd
      ? { from: rangeStart ?? undefined, to: rangeEnd ?? undefined }
      : undefined;

  const buttonLabel = rangeStart && rangeEnd
    ? `${formatDateShort(rangeStart)} – ${formatDateShort(rangeEnd)}`
    : rangeStart
      ? `From ${formatDateShort(rangeStart)}`
      : "Select date range";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Preset chips */}
      {PRESETS.map(preset => (
        <button
          key={preset.label}
          onClick={() => applyPreset(preset)}
          className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
            activePreset?.label === preset.label
              ? "bg-[#9000FF] text-white border-[#9000FF] shadow-sm"
              : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#9000FF]/40 hover:text-[#9000FF]"
          }`}
        >
          {preset.label}
        </button>
      ))}

      <div className="w-px h-4 bg-[#E5EAF0]" />

      {/* Calendar popover trigger */}
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${
              hasRange && !activePreset
                ? "bg-[#9000FF]/8 text-[#9000FF] border-[#9000FF]/30"
                : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#9000FF]/40 hover:text-[#9000FF]"
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>{buttonLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <Calendar
            mode="range"
            selected={calValue}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            defaultMonth={rangeStart ?? TODAY}
          />
          <div className="border-t border-[#E5EAF0] mt-2 pt-2 flex justify-between items-center">
            <span className="text-[11px] text-[#9E9FAE]">
              {rangeStart && rangeEnd
                ? `${formatDateShort(rangeStart)} – ${formatDateShort(rangeEnd)}`
                : "Pick a start and end date"}
            </span>
            <button
              onClick={() => { onChange(null, null); setCalOpen(false); }}
              className="text-[11px] text-[#5E687B] hover:text-[#212833] underline"
            >
              Clear
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear badge — shown when any range active */}
      {hasRange && (
        <button
          onClick={clearRange}
          className="flex items-center gap-1 text-[11px] text-[#9E9FAE] hover:text-[#212833] transition-colors"
          title="Clear filter"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}

// ─── Spread Card ─────────────────────────────────────────────────────────────

function spreadColor(pct: number) {
  if (pct >= 25) return { bar: "#10B981", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= 18) return { bar: "#9000FF", text: "text-[#9000FF]",   badge: "bg-[#9000FF]/8 text-[#9000FF] border-[#9000FF]/20" };
  return          { bar: "#F59E0B", text: "text-amber-600",   badge: "bg-amber-50 text-amber-700 border-amber-200" };
}

function SpreadCardContent({ deals }: { deals: DealWithSpread[] }) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...deals].sort((a, b) => b.spreadPct - a.spreadPct),
    [deals]
  );

  const totalBuyer    = deals.reduce((s, d) => s + d.buyerTotalUsd,   0);
  const totalSupplier = deals.reduce((s, d) => s + d.supplierCostUsd, 0);
  const totalSpread   = totalBuyer - totalSupplier;
  const avgSpreadPct  = totalBuyer > 0 ? (totalSpread / totalBuyer) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Portfolio summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Buyer Value",    value: fmtUsd(totalBuyer),    sub: `${deals.length} deals` },
          { label: "Total Supplier Cost",  value: fmtUsd(totalSupplier), sub: "sum of all legs" },
          { label: "Portfolio Spread",     value: fmtUsd(totalSpread),   sub: `${avgSpreadPct.toFixed(1)}% avg margin` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg px-3 py-2.5 text-center">
            <p className="text-[10px] text-[#9E9FAE] font-medium uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-base font-bold text-[#212833]">{value}</p>
            <p className="text-[10px] text-[#9E9FAE]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Deal rows */}
      <div className="border border-[#E5EAF0] rounded-xl overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#FAFBFC] border-b border-[#E5EAF0]">
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2">Deal / Buyer PO</th>
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2">Customer</th>
              <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2">Buyer Value</th>
              <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2">Supplier Cost</th>
              <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2">Spread</th>
              <th className="text-center text-[10px] font-bold text-[#5E687B] uppercase tracking-wide px-3 py-2">Legs</th>
              <th className="w-6 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(deal => {
              const colors = spreadColor(deal.spreadPct);
              const isOpen = expanded === deal.id;
              return (
                <React.Fragment key={deal.id}>
                  <tr
                    className={`border-b border-[#F0F4F8] cursor-pointer transition-colors group/deal ${isOpen ? "bg-[#F8F4FF]" : "hover:bg-[#FAFBFC]"}`}
                    onClick={() => deal.legs.length > 0 && navigate(`/?shipment=${deal.legs[0].id}&from=reports`)}
                    title={deal.legs.length > 0 ? `Open ${deal.buyerPoNumber} in inbox` : deal.buyerPoNumber}
                  >
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <p className="font-semibold text-[#212833]">{deal.buyerPoNumber}</p>
                        <ArrowRight className="w-3 h-3 text-[#9000FF] opacity-0 group-hover/deal:opacity-100 transition-opacity shrink-0" />
                      </span>
                      {deal.notes && <p className="text-[9px] text-[#9E9FAE] truncate max-w-[180px]" title={deal.notes}>{deal.notes}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-[#5E687B]">{deal.customerName}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#212833]">{fmtUsd(deal.buyerTotalUsd)}</td>
                    <td className="px-3 py-2.5 text-right text-[#5E687B]">{fmtUsd(deal.supplierCostUsd)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`font-bold ${colors.text}`}>{fmtUsd(deal.spreadUsd)}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${colors.badge}`}>
                          {deal.spreadPct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[#9E9FAE]">{deal.legs.length}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        title={isOpen ? "Collapse legs" : "Expand legs"}
                        className="p-0.5 rounded hover:bg-[#9000FF]/10 transition-colors"
                        onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : deal.id); }}
                      >
                        {isOpen
                          ? <ChevronUp className="w-3 h-3 text-[#9000FF]" />
                          : <ChevronDown className="w-3 h-3 text-[#C0C8D4]" />}
                      </button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-[#F8F4FF] border-b border-[#E5EAF0]">
                      <td colSpan={7} className="px-4 pb-3 pt-1">
                        <div className="space-y-1.5">
                          {/* unit economics row */}
                          <div className="flex items-center gap-4 text-[10px] text-[#5E687B] pb-1 border-b border-[#E5EAF0]/60">
                            <span>Buyer unit price: <span className="font-semibold text-[#212833]">${deal.buyerUnitPrice.toFixed(2)}</span></span>
                            <span>·</span>
                            <span>Qty: <span className="font-semibold text-[#212833]">{deal.buyerQuantity.toLocaleString()}</span></span>
                            <span>·</span>
                            <span>Currency: <span className="font-semibold text-[#212833]">{deal.currency}</span></span>
                            <span>·</span>
                            <span>Supplier paid: <span className="font-semibold text-[#212833]">{fmtUsd(deal.supplierPaidUsd)}</span> of {fmtUsd(deal.supplierCostUsd)}</span>
                          </div>

                          {/* spread bar */}
                          <div className="flex items-center gap-2 py-1">
                            <span className="text-[9px] text-[#9E9FAE] w-20 shrink-0">Margin split</span>
                            <div className="flex-1 h-2 rounded-full bg-[#E5EAF0] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.min(deal.spreadPct, 100)}%`, background: colors.bar }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold w-10 text-right ${colors.text}`}>{deal.spreadPct.toFixed(1)}%</span>
                          </div>

                          {/* supplier legs */}
                          {deal.legs.length > 0 && (
                            <div className="mt-1 rounded-lg border border-[#E5EAF0] overflow-hidden">
                              <table className="w-full text-[10px]">
                                <thead>
                                  <tr className="bg-white border-b border-[#F0F4F8]">
                                    <th className="text-left font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Supplier PO</th>
                                    <th className="text-left font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Product</th>
                                    <th className="text-left font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Supplier</th>
                                    <th className="text-right font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Cost</th>
                                    <th className="text-right font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Paid</th>
                                    <th className="text-center font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Stage</th>
                                    <th className="text-center font-bold text-[#9E9FAE] uppercase tracking-wide px-3 py-1.5">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {deal.legs.map(leg => {
                                    const paidPct = leg.supplierCost > 0 ? ((leg.supplierPaid ?? 0) / leg.supplierCost) * 100 : 0;
                                    const statusColor = leg.status === "on-track"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : leg.status === "at-risk"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200";
                                    return (
                                      <tr
                                        key={leg.id}
                                        className="border-b border-[#F0F4F8] last:border-b-0 hover:bg-[#F8F4FF] cursor-pointer transition-colors group/leg"
                                        onClick={() => navigate(`/?shipment=${leg.id}&from=reports`)}
                                        title={`Open ${leg.poNumber} in inbox`}
                                      >
                                        <td className="px-3 py-1.5 font-mono text-[9px] text-[#5E687B]">
                                          <span className="flex items-center gap-1">
                                            {leg.poNumber}
                                            <ArrowRight className="w-2.5 h-2.5 text-[#9000FF] opacity-0 group-hover/leg:opacity-100 transition-opacity shrink-0" />
                                          </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-[#212833] max-w-[160px] truncate">{leg.product}</td>
                                        <td className="px-3 py-1.5 text-[#5E687B]">{leg.supplierName}</td>
                                        <td className="px-3 py-1.5 text-right font-semibold text-[#212833]">{fmtUsd(leg.supplierCost)}</td>
                                        <td className="px-3 py-1.5 text-right">
                                          <span className={paidPct >= 100 ? "text-emerald-600 font-semibold" : "text-[#5E687B]"}>
                                            {fmtUsd(leg.supplierPaid ?? 0)}
                                          </span>
                                          <span className="text-[#C0C8D4] ml-0.5">({paidPct.toFixed(0)}%)</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center text-[#9E9FAE] font-mono">{leg.currentStageId}</td>
                                        <td className="px-3 py-1.5 text-center">
                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${statusColor}`}>
                                            {leg.status}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Reports page ────────────────────────────────────────────────────────
export function Reports() {
  const [location, navigate] = useLocation();
  const { data: apiShipments, isLoading: loadingShipments } = useListShipments(
    { query: { queryKey: getListShipmentsQueryKey(), refetchInterval: 30_000 } },
  );
  const { data: apiTasks,     isLoading: loadingTasks     } = useListTasks();
  const { data: apiStages,    isLoading: loadingStages    } = useListStages();
  const { data: apiSuppliers, isLoading: loadingSuppliers } = useListSuppliers();
  const { data: apiDeals,     isLoading: loadingDeals     } = useListDeals();

  const [expanded, setExpanded] = useState<string | null>("spread");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd,   setRangeEnd]   = useState<Date | null>(null);

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  function handleRangeChange(start: Date | null, end: Date | null) {
    setRangeStart(start);
    setRangeEnd(end);
  }

  const allShipments = apiShipments ?? [];
  const allTasks     = apiTasks     ?? [];
  const suppliers    = apiSuppliers ?? [];

  const stageOrder = useMemo(() => {
    if (!apiStages) return [];
    return [...apiStages].sort((a, b) => a.sortOrder - b.sortOrder).map(s => ({ id: s.id, label: s.label }));
  }, [apiStages]);

  const deals = apiDeals ?? [];
  const isLoading = loadingShipments || loadingTasks || loadingStages || loadingSuppliers || loadingDeals;
  const hasRange  = rangeStart !== null || rangeEnd !== null;

  // For Pipeline, Suppliers, Tasks — filter shipments by exFactoryDate
  const filteredShipments = useMemo(() => {
    if (!hasRange) return allShipments;
    return allShipments.filter(s => {
      if (!s.exFactoryDate) return false;
      return inRange(s.exFactoryDate, rangeStart, rangeEnd);
    });
  }, [allShipments, rangeStart, rangeEnd, hasRange]);

  // For Tasks — only tasks belonging to filtered shipments
  const filteredShipmentIds = useMemo(
    () => new Set(filteredShipments.map(s => s.id)),
    [filteredShipments]
  );
  const filteredTasks = useMemo(() => {
    if (!hasRange) return allTasks;
    return allTasks.filter(t => filteredShipmentIds.has(t.shipmentId));
  }, [allTasks, filteredShipmentIds, hasRange]);

  // Collapsed KPIs — use filtered data to reflect the selected range
  const financePayments = useMemo(() => {
    const payments = allShipments.flatMap(s => s.payments);
    if (!hasRange) return payments;
    return payments.filter(p => inRange(p.dueDate, rangeStart, rangeEnd));
  }, [allShipments, rangeStart, rangeEnd, hasRange]);

  // Both outer KPI values use paidAt as source of truth (consistent with FinanceCardContent)
  const totalPaidToDate   = financePayments.filter(p => p.paidAt != null).reduce((s, p) => s + p.amountUsd, 0);
  const totalUnpaid       = financePayments.filter(p => p.paidAt == null).reduce((s, p) => s + p.amountUsd, 0);
  const onTimeCount   = filteredShipments.filter(s => s.status === "on-track").length;
  const onTimePct     = filteredShipments.length > 0 ? Math.round((onTimeCount / filteredShipments.length) * 100) : 0;
  const supplierCount = new Set(filteredShipments.map(s => s.supplierId)).size;
  const openTaskCount = filteredTasks.filter(t => !t.done).length;
  const highUrgent    = filteredTasks.filter(t => !t.done && t.urgency === "high").length;

  const totalBuyerKpi  = deals.reduce((s, d) => s + d.buyerTotalUsd, 0);
  const totalSpreadKpi = deals.reduce((s, d) => s + d.spreadUsd, 0);
  const avgSpreadPctKpi = totalBuyerKpi > 0 ? (totalSpreadKpi / totalBuyerKpi) * 100 : 0;

  const cards = [
    {
      id: "spread",
      icon: Layers,
      title: "Deals & Spread",
      iconColor: "text-[#9000FF]",
      iconBg: "bg-[#9000FF]/10",
      kpi: (
        <span>
          {fmtUsd(totalSpreadKpi)}{" "}
          <span className="text-sm font-medium text-[#5E687B]">{avgSpreadPctKpi.toFixed(1)}% margin</span>
        </span>
      ),
      subtitle: `${deals.length} buyer deal${deals.length !== 1 ? "s" : ""} · ${fmtUsd(totalBuyerKpi)} total buyer value`,
      content: <SpreadCardContent deals={deals} />,
    },
    {
      id: "finance",
      icon: DollarSign,
      title: "Finance",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      kpi: (
        <span>
          {fmtUsd(totalPaidToDate)}{" "}
          <span className="text-sm font-medium text-[#5E687B]">paid to date</span>
        </span>
      ),
      subtitle: `${fmtUsd(totalUnpaid)} outstanding${hasRange ? " in selected window" : " across all shipments"}`,
      content: <FinanceCardContent shipments={allShipments} rangeStart={rangeStart} rangeEnd={rangeEnd} />,
    },
    {
      id: "pipeline",
      icon: TrendingUp,
      title: "Pipeline",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      kpi: <span>{onTimePct}% <span className="text-sm font-medium text-[#5E687B]">on-time</span></span>,
      subtitle: `${filteredShipments.length} shipment${filteredShipments.length !== 1 ? "s" : ""} across ${stageOrder.length} stages${hasRange ? " in window" : ""}`,
      content: <PipelineCardContent shipments={filteredShipments} stageOrder={stageOrder} />,
    },
    {
      id: "suppliers",
      icon: Users,
      title: "Suppliers",
      iconColor: "text-[#9000FF]",
      iconBg: "bg-[#9000FF]/10",
      kpi: supplierCount,
      subtitle: hasRange ? "suppliers with shipments in window" : "active suppliers in portfolio",
      content: <SuppliersCardContent shipments={filteredShipments} tasks={filteredTasks} suppliers={suppliers} />,
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
      subtitle: hasRange ? "open tasks for shipments in window" : "open tasks across all shipments",
      content: <TasksCardContent tasks={filteredTasks} shipments={filteredShipments} />,
    },
  ];

  useCopilotHint("Compare supplier performance or summarize financials", [
    "Which supplier has the best on-time rate?",
    "Summarize outstanding payments this month",
    "Compare deposit vs balance payments across suppliers",
  ]);

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC] overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      <AppHeader pageLabel="Reports" />

      <div className="flex-1 flex overflow-hidden">
      <NavSidebar showBrand={false} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          {/* Date range filter bar */}
          <div className="bg-white border border-[#E5EAF0] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5E687B] uppercase tracking-wide shrink-0">
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Date range</span>
            </div>
            <div className="w-px h-4 bg-[#E5EAF0] shrink-0" />
            <DateRangePicker
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onChange={handleRangeChange}
            />
            {hasRange && (
              <span className="ml-auto text-[11px] text-[#9000FF] font-medium bg-[#9000FF]/8 px-2.5 py-1 rounded-full border border-[#9000FF]/20 shrink-0">
                Filtered
              </span>
            )}
          </div>

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
      </div>
    </div>
  );
}
