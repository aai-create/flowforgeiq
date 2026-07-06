import { useState } from "react";
import { useLocation } from "wouter";
import { useListSampleRequests, useListBuyers, useListSuppliers } from "@workspace/api-client-react";
import type { SampleRequest } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { useTranslation } from "react-i18next";
import {
  Package, Plus, Clock, Truck, CheckCircle2, XCircle, Loader2,
} from "lucide-react";

type SampleMilestone = "sample_requested" | "sample_shipped" | "sample_received" | "approved" | "rejected";

const MILESTONE_CONFIG: Record<SampleMilestone, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  sample_requested: { label: "Requested", color: "#64748b", bg: "#f1f5f9", Icon: Clock },
  sample_shipped: { label: "Shipped", color: "#2563eb", bg: "#eff6ff", Icon: Truck },
  sample_received: { label: "Received", color: "#d97706", bg: "#fffbeb", Icon: Package },
  approved: { label: "Approved", color: "#16a34a", bg: "#f0fdf4", Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", Icon: XCircle },
};

function MilestonePill({ milestone }: { milestone: SampleMilestone }) {
  const cfg = MILESTONE_CONFIG[milestone];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={10} color={cfg.color} />
      {cfg.label}
    </span>
  );
}

function SampleCard({ sample, onPress, supplierName, buyerName }: {
  sample: SampleRequest;
  onPress: () => void;
  supplierName: string;
  buyerName: string;
}) {
  return (
    <button
      onClick={onPress}
      className="w-full bg-card border border-border rounded-xl p-4 text-left active:opacity-75 transition-opacity"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-foreground truncate">{sample.product}</p>
          <p className="text-[12px] text-muted-foreground truncate">{supplierName}</p>
        </div>
        <MilestonePill milestone={sample.milestone as SampleMilestone} />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {buyerName !== "—" && <span>Buyer: <span className="font-medium text-foreground">{buyerName}</span></span>}
        {sample.quantity && <span>{sample.quantity.toLocaleString()} units</span>}
        {sample.trackingCode && (
          <span className="inline-flex items-center gap-1">
            <Truck size={10} /> {sample.trackingCode}
          </span>
        )}
      </div>
    </button>
  );
}

const MILESTONE_ORDER: SampleMilestone[] = ["sample_requested", "sample_shipped", "sample_received", "approved", "rejected"];

export default function SamplesPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<SampleMilestone | "all">("all");

  const { data: rawSamples = [], isLoading } = useListSampleRequests({ includeArchived: true });
  const { data: suppliers = [] } = useListSuppliers();
  const { data: buyers = [] } = useListBuyers();

  const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
  const buyerMap = new Map(buyers.map(b => [b.id, b.name]));

  const samples = filter === "all" ? rawSamples : rawSamples.filter(s => s.milestone === filter);

  const activeSamples = rawSamples.filter(s => s.milestone !== "rejected" && s.milestone !== "approved");

  return (
    <AppShell>
      <GradientHeader
        title="Samples"
        subtitle={`${activeSamples.length} active`}
        align="start"
      />
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 no-scrollbar">
        {(["all", ...MILESTONE_ORDER] as const).map(m => {
          const active = filter === m;
          const label = m === "all" ? "All" : MILESTONE_CONFIG[m].label;
          return (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className="shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors"
              style={{
                background: active ? "hsl(var(--primary))" : "transparent",
                color: active ? "white" : "hsl(var(--muted-foreground))",
                borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--primary))" }} />
          </div>
        ) : samples.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={40} className="mb-3 opacity-20" />
            <p className="font-semibold text-[14px] text-muted-foreground">
              {filter === "all" ? "No sample requests yet" : `No ${MILESTONE_CONFIG[filter as SampleMilestone]?.label ?? filter} samples`}
            </p>
          </div>
        ) : (
          samples.map(s => (
            <SampleCard
              key={s.id}
              sample={s}
              onPress={() => navigate(`/samples/${s.id}`)}
              supplierName={s.supplierName ?? supplierMap.get(s.supplierId ?? -1) ?? "—"}
              buyerName={s.buyerName ?? buyerMap.get(s.buyerId ?? -1) ?? "—"}
            />
          ))
        )}
      </div>

      {/* FAB placeholder */}
      <div className="shrink-0 px-4 pb-4">
        <button
          onClick={() => navigate("/capture")}
          className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:opacity-75 transition-opacity"
          style={{ background: "hsl(var(--primary))", color: "white" }}
        >
          <Plus size={16} /> New Sample Request
        </button>
      </div>
    </AppShell>
  );

  void t;
}
