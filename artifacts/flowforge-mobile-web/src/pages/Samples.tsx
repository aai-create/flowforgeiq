import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListSampleRequests,
  useListBuyers,
  useListSuppliers,
  useCreateSampleRequest,
} from "@workspace/api-client-react";
import type { SampleRequest } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { useTranslation } from "react-i18next";
import {
  Package, Plus, Clock, Truck, CheckCircle2, XCircle, Loader2, X, ChevronDown,
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

function NewSampleSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: suppliers = [] } = useListSuppliers();
  const createMutation = useCreateSampleRequest();

  const [product, setProduct] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setProduct("");
    setSupplierId("");
    setQuantity("");
    setNotes("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createMutation.mutateAsync({
        data: {
          product: product.trim(),
          supplierId: supplierId !== "" ? supplierId : undefined,
          quantity: quantity ? Number(quantity) : undefined,
          notes: notes.trim() || undefined,
        },
      });
      reset();
      onCreated();
      onClose();
    } catch {
      setError("Failed to create sample request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={handleClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-xl"
        style={{ maxHeight: "85dvh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[16px] font-bold text-foreground">New Sample Request</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-muted transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: "calc(85dvh - 100px)" }}>
          {/* Product */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
              Product <span style={{ color: "hsl(var(--primary))" }}>*</span>
            </label>
            <input
              type="text"
              value={product}
              onChange={e => setProduct(e.target.value)}
              placeholder="e.g. Cotton Crew-Neck Tee"
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2"
              style={{ focusRingColor: "hsl(var(--primary))" } as React.CSSProperties}
              autoFocus
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
              Supplier
            </label>
            <div className="relative">
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : "")}
                className="w-full h-11 pl-3 pr-8 rounded-xl border border-border bg-card text-[14px] text-foreground appearance-none focus:outline-none focus:ring-2"
              >
                <option value="">No supplier selected</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
              Quantity (units)
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="e.g. 500"
              className="w-full h-11 px-3 rounded-xl border border-border bg-card text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Colorways, size range, special requirements…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none"
            />
          </div>

          {error && (
            <p className="text-[13px] font-semibold" style={{ color: "#dc2626" }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !product.trim()}
            className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "Creating…" : "Create Sample Request"}
          </button>
        </form>
      </div>
    </>
  );
}

export default function SamplesPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<SampleMilestone | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: rawSamples = [], isLoading, refetch } = useListSampleRequests({ includeArchived: true });
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

      {/* New Sample Request button */}
      <div className="shrink-0 px-4 pb-4">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:opacity-75 transition-opacity"
          style={{ background: "hsl(var(--primary))", color: "white" }}
        >
          <Plus size={16} /> New Sample Request
        </button>
      </div>

      <NewSampleSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={() => void refetch()}
      />
    </AppShell>
  );

  void t;
}
