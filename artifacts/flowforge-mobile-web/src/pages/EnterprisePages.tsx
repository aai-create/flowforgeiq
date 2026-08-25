import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Inbox,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  useGetPipelineReport,
  useGetRiskRadar,
  useListBuyers,
  useListRfqs,
  useListShipments,
  useListSuppliers,
  useListTasks,
} from "@workspace/api-client-react";
import type { RiskRadarItem, RfqWithQuotes, Shipment } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { useTranslation } from "react-i18next";

function LoadingState({ label }: { label: string }) {
  return <div className="flex flex-col items-center justify-center gap-3 py-20"><div className="app-spinner" /><p className="text-sm text-muted-foreground">{label}</p></div>;
}

function EmptyState({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center"><div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center"><Icon size={22} className="text-primary" /></div><p className="font-semibold text-foreground">{title}</p><p className="text-sm text-muted-foreground max-w-[260px]">{body}</p></div>;
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const normalized = status.toLowerCase();
  const tone = normalized.includes("delay") ? "red" : normalized.includes("risk") ? "amber" : normalized.includes("complete") || normalized.includes("track") ? "green" : "slate";
  const label = normalized === "on-track" ? t("status.onTrack") : normalized === "at-risk" ? t("status.atRisk") : normalized === "delayed" ? t("status.delayed") : normalized === "completed" ? t("status.completed") : status;
  return <span className={`status-pill status-${tone}`}>{label}</span>;
}

function OrderRow({ shipment, onClick }: { shipment: Shipment; onClick: () => void }) {
  return <button onClick={onClick} className="enterprise-row w-full text-left flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0"><Package size={17} className="text-primary" /></div>
    <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate text-foreground">PO {shipment.poNumber}</p><p className="text-[11px] mt-0.5 truncate text-muted-foreground">{shipment.product} · {shipment.supplierName}</p></div>
    <div className="flex flex-col items-end gap-1 shrink-0"><StatusPill status={shipment.status} /><span className="text-[10px] text-muted-foreground">{shipment.dueDate ? new Date(shipment.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</span></div>
    <ChevronRight size={15} className="text-muted-foreground shrink-0" />
  </button>;
}

export function OrdersPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isRefetching } = useListShipments({ includeArchived: true });
  const [query, setQuery] = useState("");
  const orders = (data ?? []).filter((s) => {
    const q = query.toLowerCase().trim();
    return !q || [s.poNumber, s.product, s.supplierName, s.customerName].some((v) => v?.toLowerCase().includes(q));
  });
  return <AppShell><GradientHeader title={t("nav.orders")} subtitle={t("orders.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4">
    <div className="flex items-center gap-2 px-3 py-2.5 bg-card rounded-lg border border-border mb-3"><Search size={15} className="text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("orders.search")} className="flex-1 min-w-0 bg-transparent outline-none text-sm" /><button onClick={() => refetch()} aria-label={t("common.refresh")} className="text-muted-foreground"><RefreshCw size={15} className={isRefetching ? "animate-spin" : ""} /></button></div>
    <div className="grid grid-cols-3 gap-2 mb-3"><Metric value={orders.filter((s) => s.status !== "completed").length} label={t("orders.active")} /><Metric value={orders.filter((s) => s.status === "at-risk" || s.status === "delayed").length} label={t("orders.attention")} tone="amber" /><Metric value={orders.filter((s) => s.status === "completed").length} label={t("orders.complete")} /></div>
    {isLoading ? <LoadingState label={t("common.loading")} /> : isError ? <EmptyState icon={ShieldAlert} title={t("orders.loadError")} body={t("orders.loadErrorBody")} /> : orders.length === 0 ? <EmptyState icon={Package} title={t("orders.empty")} body={t("orders.emptyBody")} /> : <div className="section-panel overflow-hidden">{orders.map((shipment) => <OrderRow key={shipment.id} shipment={shipment} onClick={() => navigate(`/shipment/${shipment.id}`)} />)}</div>}
  </div></AppShell>;
}

function Metric({ value, label, tone }: { value: number | string; label: string; tone?: "amber" }) {
  return <div className="metric-card"><p className={`text-xl font-bold ${tone === "amber" ? "text-amber-600" : "text-foreground"}`}>{value}</p><p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p></div>;
}

function RiskRow({ item, onClick }: { item: RiskRadarItem; onClick: () => void }) {
  const { t } = useTranslation();
  const high = item.riskScore >= 70;
  const medium = item.riskScore >= 45;
  const color = high ? "red" : medium ? "amber" : "green";
  return <button onClick={onClick} className="enterprise-row w-full text-left flex items-start gap-3">
    <div className={`risk-score risk-${color}`}><span>{item.riskScore}</span></div>
    <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-semibold truncate">PO {item.poNumber}</p><StatusPill status={item.status} /></div><p className="text-[11px] text-muted-foreground truncate mt-1">{item.product} · {item.supplierName}</p><p className="text-[11px] text-muted-foreground truncate mt-1">{item.topSignal || t("risk.noSignal")}</p></div>
    <ChevronRight size={15} className="text-muted-foreground mt-1" />
  </button>;
}

export function RiskPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isRefetching } = useGetRiskRadar();
  const items = [...(data?.items ?? [])].sort((a, b) => b.riskScore - a.riskScore);
  return <AppShell><GradientHeader title={t("nav.risk")} subtitle={t("risk.subtitle")} right={<button onClick={() => refetch()} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground" aria-label={t("common.refresh")}><RefreshCw size={16} className={isRefetching ? "animate-spin" : ""} /></button>} /><div className="flex-1 scroll-area px-4 pt-3 pb-4">
    <div className="grid grid-cols-2 gap-2 mb-3"><div className="metric-card"><p className="text-xl font-bold text-red-600">{data?.highRiskCount ?? "—"}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{t("risk.highRisk")}</p></div><div className="metric-card"><p className="text-xl font-bold text-foreground">{data?.totalExposureUsd != null ? `$${Math.round(data.totalExposureUsd).toLocaleString()}` : "—"}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{t("risk.exposure")}</p></div></div>
    <p className="section-label mb-2">{t("risk.activeShipments")}</p>
    {isLoading ? <LoadingState label={t("common.loading")} /> : isError ? <EmptyState icon={ShieldAlert} title={t("risk.loadError")} body={t("orders.loadErrorBody")} /> : items.length === 0 ? <EmptyState icon={CheckCircle2} title={t("risk.empty")} body={t("risk.emptyBody")} /> : <div className="section-panel overflow-hidden">{items.map((item) => <RiskRow key={item.shipmentId} item={item} onClick={() => navigate(`/shipment/${item.shipmentId}`)} />)}</div>}
  </div></AppShell>;
}

export function ReportsPage() {
  const { t } = useTranslation();
  const { data: shipments } = useListShipments();
  const { data: pipeline, isLoading } = useGetPipelineReport();
  const { data: radar } = useGetRiskRadar();
  const active = (shipments ?? []).filter((s) => s.status !== "completed");
  const onTrack = active.filter((s) => s.status === "on-track").length;
  const spend = active.reduce((sum, s) => sum + (s.payments?.reduce((p, item) => p + (item.amountUsd || 0), 0) ?? 0), 0);
  const agents = pipeline?.agents ?? [];
  const maxAgent = Math.max(...agents.map((a) => a.shipmentCount), 1);
  return <AppShell><GradientHeader title={t("nav.reports")} subtitle={t("reports.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4">
    {isLoading ? <LoadingState label={t("common.loading")} /> : <><div className="grid grid-cols-2 gap-2"><Metric value={spend ? `$${(spend / 1000).toFixed(1)}K` : "—"} label={t("reports.committed")} /><Metric value={active.length} label={t("reports.activePos")} /><Metric value={radar?.highRiskCount ?? 0} label={t("reports.atRisk")} tone="amber" /><Metric value={active.length ? `${Math.round(onTrack / active.length * 100)}%` : "—"} label={t("reports.onTime")} /></div>
      <div className="section-panel p-4 mt-3"><div className="flex items-center justify-between mb-3"><p className="section-label">{t("reports.pipelineByOwner")}</p><BarChart3 size={15} className="text-primary" /></div>{agents.length === 0 ? <p className="text-sm text-muted-foreground">{t("reports.noPipeline")}</p> : agents.slice(0, 6).map((agent) => <div key={agent.assigneeId ?? agent.assigneeName} className="mb-3 last:mb-0"><div className="flex justify-between text-xs mb-1"><span className="font-medium truncate">{agent.assigneeName}</span><span className="text-muted-foreground">{agent.shipmentCount}</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${agent.shipmentCount / maxAgent * 100}%` }} /></div></div>)}</div>
      <div className="section-panel p-4 mt-3"><p className="section-label mb-3">{t("reports.riskMix")}</p><div className="flex gap-2 h-3 rounded-full overflow-hidden bg-muted"><div className="bg-red-500" style={{ width: `${(radar?.highRiskCount ?? 0) / Math.max(radar?.items.length ?? 1, 1) * 100}%` }} /><div className="bg-amber-400" style={{ width: `${(radar?.items.filter((i) => i.riskScore >= 45 && i.riskScore < 70).length ?? 0) / Math.max(radar?.items.length ?? 1, 1) * 100}%` }} /><div className="bg-emerald-500 flex-1" /></div><div className="flex justify-between mt-2 text-[11px] text-muted-foreground"><span>{t("risk.highRisk")}</span><span>{t("risk.mediumRisk")}</span><span>{t("risk.lowRisk")}</span></div></div>
    </>}
  </div></AppShell>;
}

const overflowItems = [
  { href: "/rfqs", icon: FileText, key: "nav.rfqs" },
  { href: "/pipeline", icon: Sparkles, key: "nav.pipeline" },
  { href: "/suppliers", icon: Building2, key: "nav.suppliers" },
  { href: "/buyers", icon: Users, key: "nav.buyers" },
  { href: "/calendar", icon: CalendarDays, key: "nav.calendar" },
  { href: "/tasks", icon: ClipboardList, key: "nav.tasks" },
  { href: "/documents", icon: Inbox, key: "nav.documents" },
  { href: "/capture", icon: ArrowUpRight, key: "nav.capture" },
];

export function MorePage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  return <AppShell><GradientHeader title={t("nav.more")} subtitle={t("more.subtitle")} /><div className="flex-1 scroll-area px-4 pt-4 pb-4"><p className="section-label mb-2">{t("more.enterpriseTools")}</p><div className="section-panel overflow-hidden">{overflowItems.map(({ href, icon: Icon, key }) => <button key={href} onClick={() => navigate(href)} className="enterprise-row flex items-center gap-3 w-full text-left"><span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"><Icon size={16} className="text-primary" /></span><span className="flex-1 text-sm font-medium">{t(key)}</span><ChevronRight size={15} className="text-muted-foreground" /></button>)}</div></div></AppShell>;
}

export function RfqsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useListRfqs();
  const [selected, setSelected] = useState<RfqWithQuotes | null>(null);
  return <AppShell><GradientHeader title={t("nav.rfqs")} subtitle={t("rfqs.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4"><p className="section-label mb-2">{t("rfqs.openRequests")}</p>{isLoading ? <LoadingState label={t("common.loading")} /> : !data?.length ? <EmptyState icon={FileText} title={t("rfqs.empty")} body={t("rfqs.emptyBody")} /> : <div className="section-panel overflow-hidden">{data.map((rfq) => <button key={rfq.id} onClick={() => setSelected(rfq)} className="enterprise-row flex items-center gap-3 w-full text-left"><div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><FileText size={16} className="text-primary" /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{rfq.product}</p><p className="text-[11px] text-muted-foreground mt-1 truncate">{rfq.buyerName} · {rfq.quantity.toLocaleString()} {t("rfqs.units")}</p></div><div className="flex flex-col items-end gap-1"><StatusPill status={rfq.status} /><span className="text-[10px] text-muted-foreground">{rfq.quotes.length} {t("rfqs.quotes")}</span></div><ChevronRight size={15} className="text-muted-foreground" /></button>)}</div>}</div>{selected && <RfqSheet rfq={selected} onClose={() => setSelected(null)} />}</AppShell>;
}

function RfqSheet({ rfq, onClose }: { rfq: RfqWithQuotes; onClose: () => void }) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { document.removeEventListener("keydown", onKeyDown); lastFocusedRef.current?.focus(); };
  }, [onClose]);
  return <><button className="fixed inset-0 z-40 bg-slate-950/35" onClick={onClose} aria-label={t("common.close")} /><div ref={sheetRef} role="dialog" aria-modal="true" aria-label={t("rfqs.lineReview")} className="safe-bottom fixed z-50 bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-2xl bg-card border-t border-border p-4 pb-4 shadow-2xl"><div className="flex items-center justify-between mb-4"><div><p className="section-label">{t("rfqs.lineReview")}</p><p className="font-semibold text-foreground mt-1">{rfq.product}</p></div><button ref={closeButtonRef} onClick={onClose} aria-label={t("common.close")} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><X size={16} /></button></div><div className="space-y-2 text-sm">{[[t("rfqs.buyer"), rfq.buyerName],[t("rfqs.quantity"), rfq.quantity.toLocaleString()],[t("rfqs.targetPrice"), `$${rfq.targetPriceUsd.toFixed(2)}`],[t("rfqs.deadline"), new Date(rfq.deadline).toLocaleDateString()]].map(([label, value]) => <div key={label} className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>)}</div><p className="text-xs text-muted-foreground mt-4">{t("rfqs.actionUnavailable")}</p><button onClick={onClose} className="w-full mt-3 py-3 rounded-lg border border-border text-sm font-semibold">{t("common.close")}</button></div></>;
}

export function DirectoryPage({ kind }: { kind: "suppliers" | "buyers" }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: suppliers, isLoading: suppliersLoading } = useListSuppliers();
  const { data: buyers, isLoading: buyersLoading } = useListBuyers();
  const items = kind === "suppliers" ? suppliers ?? [] : buyers ?? [];
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return <AppShell><GradientHeader title={t(`nav.${kind}`)} subtitle={t("directory.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4"><div className="flex items-center gap-2 px-3 py-2.5 bg-card rounded-lg border border-border mb-3"><Search size={15} className="text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("directory.search")} className="flex-1 bg-transparent outline-none text-sm" /></div>{(kind === "suppliers" ? suppliersLoading : buyersLoading) ? <LoadingState label={t("common.loading")} /> : !filtered.length ? <EmptyState icon={kind === "suppliers" ? Building2 : Users} title={t("directory.empty")} body={t("directory.emptyBody")} /> : <div className="section-panel overflow-hidden">{filtered.map((item) => <div key={item.id} className="enterprise-row flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{item.name.slice(0, 2).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{item.name}</p><p className="text-[11px] text-muted-foreground truncate mt-1">{("country" in item ? item.country : item.region) || t("directory.noRegion")}</p></div><ChevronRight size={15} className="text-muted-foreground" /></div>)}</div>}</div></AppShell>;
}

export function PipelinePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetPipelineReport();
  return <AppShell><GradientHeader title={t("nav.pipeline")} subtitle={t("pipeline.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4">{isLoading ? <LoadingState label={t("common.loading")} /> : <div className="section-panel overflow-hidden">{(data?.agents ?? []).map((agent) => <div className="enterprise-row flex items-center gap-3" key={agent.assigneeId ?? agent.assigneeName}><div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-primary">{agent.assigneeName.slice(0, 1)}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{agent.assigneeName}</p><p className="text-[11px] text-muted-foreground mt-1">{agent.shipmentCount} {t("pipeline.orders")} · ${Math.round(agent.totalValueUsd).toLocaleString()}</p></div><span className="text-xs font-semibold text-primary">{agent.avgSpreadPct != null ? `${agent.avgSpreadPct.toFixed(1)}%` : "—"}</span></div>)}</div>}</div></AppShell>;
}

export function TasksPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useListTasks();
  const open = (data ?? []).filter((task) => !task.done);
  return <AppShell><GradientHeader title={t("nav.tasks")} subtitle={t("tasks.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4">{isLoading ? <LoadingState label={t("common.loading")} /> : !open.length ? <EmptyState icon={CheckCircle2} title={t("tasks.empty")} body={t("tasks.emptyBody")} /> : <div className="section-panel overflow-hidden">{open.map((task) => <div key={task.id} className="enterprise-row flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle size={15} className="text-amber-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold">{task.title}</p><p className="text-[11px] text-muted-foreground mt-1">{task.action} · {task.source}</p></div><span className="status-pill status-amber">{task.urgency}</span></div>)}</div>}</div></AppShell>;
}

export function CalendarPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useListShipments();
  const dates = useMemo(() => (data ?? []).filter((s) => s.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 20), [data]);
  return <AppShell><GradientHeader title={t("nav.calendar")} subtitle={t("calendar.subtitle")} /><div className="flex-1 scroll-area px-4 pt-3 pb-4">{isLoading ? <LoadingState label={t("common.loading")} /> : <div className="section-panel overflow-hidden">{dates.map((shipment) => <div className="enterprise-row flex items-center gap-3" key={shipment.id}><div className="w-9 h-9 rounded-lg bg-accent flex flex-col items-center justify-center text-primary"><span className="text-[9px] font-bold uppercase">{new Date(shipment.dueDate).toLocaleDateString(undefined, { month: "short" })}</span><span className="text-sm font-bold leading-none">{new Date(shipment.dueDate).getDate()}</span></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">PO {shipment.poNumber}</p><p className="text-[11px] text-muted-foreground mt-1 truncate">{shipment.product} · {shipment.currentStageId}</p></div><StatusPill status={shipment.status} /></div>)}</div>}</div></AppShell>;
}