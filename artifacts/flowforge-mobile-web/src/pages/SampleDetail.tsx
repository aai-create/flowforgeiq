import { useParams, useLocation } from "wouter";
import { useListSampleRequests, useUpdateSampleRequest, useListSuppliers, useListBuyers } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import {
  Clock, Truck, Package, CheckCircle2, XCircle, Check,
  ArrowRight, Loader2,
} from "lucide-react";
import { useState } from "react";

type SampleMilestone = "sample_requested" | "sample_shipped" | "sample_received" | "approved" | "rejected";

const MILESTONE_ORDER: SampleMilestone[] = ["sample_requested", "sample_shipped", "sample_received", "approved"];

const MILESTONE_CONFIG: Record<SampleMilestone, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  sample_requested: { label: "Requested", color: "#64748b", bg: "#f1f5f9", Icon: Clock },
  sample_shipped: { label: "Shipped", color: "#2563eb", bg: "#eff6ff", Icon: Truck },
  sample_received: { label: "Received", color: "#d97706", bg: "#fffbeb", Icon: Package },
  approved: { label: "Approved", color: "#16a34a", bg: "#f0fdf4", Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", Icon: XCircle },
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SampleDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data: allSamples = [], refetch } = useListSampleRequests({ includeArchived: true });
  const { data: suppliers = [] } = useListSuppliers();
  const { data: buyers = [] } = useListBuyers();
  const updateMutation = useUpdateSampleRequest();

  const sample = allSamples.find(s => s.id === id);
  const supplierName = sample?.supplierName ?? suppliers.find(s => s.id === sample?.supplierId)?.name ?? "—";
  const buyerName = sample?.buyerName ?? buyers.find(b => b.id === sample?.buyerId)?.name ?? "—";

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function advanceMilestone(to: SampleMilestone) {
    if (!sample) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: sample.id, data: { milestone: to } });
      await refetch();
      showToast(`Marked as ${MILESTONE_CONFIG[to].label}`);
    } finally {
      setSaving(false);
    }
  }

  if (!sample && allSamples.length > 0) {
    return (
      <AppShell>
        <GradientHeader title="Sample" back={() => navigate("/samples")} align="start" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Sample not found.</p>
        </div>
      </AppShell>
    );
  }

  if (!sample) {
    return (
      <AppShell>
        <GradientHeader title="Sample" back={() => navigate("/samples")} align="start" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--primary))" }} />
        </div>
      </AppShell>
    );
  }

  const milestone = sample.milestone as SampleMilestone;
  const currentIdx = MILESTONE_ORDER.indexOf(milestone);
  const isRejected = milestone === "rejected";
  const isApproved = milestone === "approved";
  const nextMilestone = MILESTONE_ORDER[currentIdx + 1] as SampleMilestone | undefined;

  return (
    <AppShell>
      <GradientHeader
        title={sample.product}
        subtitle={supplierName}
        back={() => navigate("/samples")}
        align="start"
        logoSize={24}
      />
      <div className="flex-1 overflow-y-auto pb-6">
        {toast && (
          <div className="mx-4 mt-3 p-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: "hsl(var(--primary))", color: "white" }}>
            {toast}
          </div>
        )}

        {/* Info card */}
        <div className="mx-4 mt-4 bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Status</span>
            {(() => {
              const cfg = MILESTONE_CONFIG[milestone];
              const Icon = cfg.Icon;
              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: cfg.color, background: cfg.bg }}>
                  <Icon size={10} color={cfg.color} />{cfg.label}
                </span>
              );
            })()}
          </div>
          {supplierName !== "—" && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Supplier</span>
              <span className="text-[13px] font-semibold text-foreground">{supplierName}</span>
            </div>
          )}
          {buyerName !== "—" && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Buyer</span>
              <span className="text-[13px] font-semibold text-foreground">{buyerName}</span>
            </div>
          )}
          {sample.quantity && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Quantity</span>
              <span className="text-[13px] font-semibold text-foreground">{sample.quantity.toLocaleString()} units</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Created</span>
            <span className="text-[13px] font-semibold text-foreground">{shortDate(sample.createdAt)}</span>
          </div>
          {sample.trackingCode && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">Tracking</span>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-foreground">{sample.trackingCode}</p>
                {sample.carrierName && <p className="text-[11px] text-muted-foreground">{sample.carrierName}</p>}
              </div>
            </div>
          )}
          {sample.convertedShipmentId && (
            <div className="p-2 rounded-lg text-[12px] font-semibold" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              ✓ Converted to PO #{sample.convertedShipmentId}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="mx-4 mt-4 bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Progress</p>
          <div className="space-y-3">
            {MILESTONE_ORDER.map((m, idx) => {
              const done = isApproved || (!isRejected && idx <= currentIdx);
              const current = m === milestone;
              const cfg = MILESTONE_CONFIG[m];
              const Icon = cfg.Icon;
              return (
                <div key={m} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: done ? "hsl(var(--primary))" : "#f0f4f8" }}>
                    {done ? <Check size={13} color="white" /> : <Icon size={13} color="#9ca3af" />}
                  </div>
                  <span className="text-[13px]"
                    style={{ fontWeight: current ? 700 : 400, color: current ? "#111827" : done ? "#374151" : "#9ca3af" }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {isRejected && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                  <XCircle size={13} color="#dc2626" />
                </div>
                <span className="text-[13px] font-bold" style={{ color: "#dc2626" }}>Rejected</span>
              </div>
            )}
          </div>
        </div>

        {sample.notes && (
          <div className="mx-4 mt-4 bg-card border border-border rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
            <p className="text-[13px] text-foreground">{sample.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isRejected && !sample.convertedShipmentId && (
        <div className="shrink-0 px-4 pb-4 space-y-2">
          {nextMilestone && (
            <button
              disabled={saving}
              onClick={() => advanceMilestone(nextMilestone)}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:opacity-75 transition-opacity"
              style={{ background: "hsl(var(--primary))", color: "white" }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Mark as {MILESTONE_CONFIG[nextMilestone].label}
            </button>
          )}
          {!isRejected && milestone !== "approved" && (
            <button
              disabled={saving}
              onClick={() => advanceMilestone("rejected")}
              className="w-full h-10 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 active:opacity-75 transition-opacity border"
              style={{ borderColor: "#fca5a5", color: "#dc2626" }}
            >
              <XCircle size={14} /> Reject
            </button>
          )}
        </div>
      )}
    </AppShell>
  );
}
