import { useLocation, useParams } from "wouter";
import { useListShipments, useListShipmentStageEvents, useListMessages } from "@workspace/api-client-react";
import { ArrowLeft, Package, MessageSquare, Zap } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  "on-track": { color: "#22c55e", label: "On Track" },
  "at-risk": { color: "#f59e0b", label: "At Risk" },
  delayed: { color: "#e63946", label: "Delayed" },
  completed: { color: "#8896a7", label: "Completed" },
};

function fmtUsd(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const shipmentId = Number(id);

  const { data: shipments, isLoading } = useListShipments();
  const { data: stageEvents } = useListShipmentStageEvents(shipmentId);
  const { data: messages } = useListMessages();

  const shipment = (shipments ?? []).find((s) => s.id === shipmentId) ?? null;

  const recentMessages = (messages ?? [])
    .filter((m) => m.shipmentId === shipmentId)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-4 flex items-center gap-3" style={{ background: "hsl(var(--primary))" }}>
          <button onClick={() => navigate("/home")}><ArrowLeft size={20} color="white" /></button>
          <p className="text-white font-bold text-lg">Shipment</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-4 flex items-center gap-3" style={{ background: "hsl(var(--primary))" }}>
          <button onClick={() => navigate("/home")}><ArrowLeft size={20} color="white" /></button>
          <p className="text-white font-bold text-lg">Shipment</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <Package size={36} color="hsl(var(--muted-foreground))" />
          <p className="text-muted-foreground text-center">Shipment not found.</p>
          <button onClick={() => navigate("/home")} className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: "hsl(var(--primary))" }}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[shipment.status ?? ""] ?? STATUS_CONFIG["on-track"];
  const spread = (shipment as any).spreadUsd;
  const spreadPct = (shipment as any).spreadPct;

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto overflow-hidden">
      <div className="status-bar-pad px-5 pb-4 flex items-start gap-3 shrink-0" style={{ background: "hsl(var(--primary))" }}>
        <button onClick={() => navigate("/home")} className="mt-0.5"><ArrowLeft size={20} color="white" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg leading-tight">PO {shipment.poNumber}</p>
          <p className="text-white/70 text-xs mt-0.5 truncate">{shipment.product}</p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full mt-0.5 shrink-0"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}25` }}
        >
          {cfg.label}
        </span>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">
        {/* Overview card */}
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Overview</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "Supplier", value: shipment.supplierName },
              { label: "Buyer PO", value: shipment.buyerPoNumber ?? "—" },
              { label: "Destination", value: shipment.destination ?? "—" },
              { label: "Via", value: shipment.via ?? "—" },
              { label: "Ex-Factory", value: shipment.exFactoryDate ? formatDate(shipment.exFactoryDate) : "—" },
              { label: "Due Date", value: shipment.dueDate ? formatDate(shipment.dueDate) : "—" },
              { label: "Quantity", value: shipment.quantity != null ? shipment.quantity.toLocaleString() : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground max-w-[60%] text-right truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financials */}
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Financials</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: "hsl(var(--accent))" }}>
              <p className="text-xs text-muted-foreground">Unit Cost</p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtUsd(shipment.unitCostUsd)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "hsl(var(--accent))" }}>
              <p className="text-xs text-muted-foreground">Buyer Price</p>
              <p className="text-base font-bold text-foreground mt-0.5">{fmtUsd((shipment as any).buyerUnitPrice)}</p>
            </div>
            {spread != null && (
              <div className="col-span-2 rounded-xl p-3" style={{ backgroundColor: spread >= 0 ? "#22c55e12" : "#e6394612", borderColor: spread >= 0 ? "#22c55e30" : "#e6394630" }}>
                <p className="text-xs text-muted-foreground">Spread</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-base font-bold" style={{ color: spread >= 0 ? "#22c55e" : "#e63946" }}>{fmtUsd(spread)}</p>
                  {spreadPct != null && (
                    <p className="text-xs font-medium" style={{ color: spread >= 0 ? "#22c55e" : "#e63946" }}>({spreadPct.toFixed(1)}%)</p>
                  )}
                </div>
              </div>
            )}
          </div>
          {shipment.payments && shipment.payments.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <p className="text-xs font-semibold text-muted-foreground">Payments</p>
              {shipment.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.paid ? "#22c55e" : "hsl(var(--muted-foreground))" }} />
                    <span className="text-xs text-foreground">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{fmtUsd(p.amountUsd)}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: p.paid ? "#22c55e" : "#f59e0b", backgroundColor: p.paid ? "#22c55e18" : "#f59e0b18" }}>
                      {p.paid ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stage timeline */}
        {stageEvents && stageEvents.length > 0 && (
          <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Stage History</p>
            <div className="flex flex-col gap-3">
              {stageEvents.slice(0, 5).map((ev, i) => (
                <div key={ev.id} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: i === 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                    {i < stageEvents.slice(0, 5).length - 1 && (
                      <div className="w-px flex-1 mt-1 mb-0.5 min-h-[16px]" style={{ backgroundColor: "hsl(var(--border))" }} />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-medium text-foreground">{ev.toStageId}</p>
                    {ev.note && <p className="text-xs text-muted-foreground mt-0.5">{ev.note}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent messages */}
        {recentMessages.length > 0 && (
          <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Recent Messages</p>
            <div className="flex flex-col gap-2.5">
              {recentMessages.map((m) => (
                <div key={m.id} className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={13} color="hsl(var(--muted-foreground))" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{m.sender}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-[1.4] line-clamp-2">{m.snippet}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capture shortcut */}
        <button
          onClick={() => navigate(`/capture?shipmentId=${shipment.id}&shipmentName=${encodeURIComponent(`PO ${shipment.poNumber} — ${shipment.product}`)}`)}
          className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-white"
          style={{ backgroundColor: "hsl(var(--primary))" }}
        >
          <Zap size={18} fill="white" strokeWidth={0} />
          Capture for this shipment
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}
