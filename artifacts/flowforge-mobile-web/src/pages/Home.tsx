import { useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation } from "wouter";
import { CheckCircle, AlertTriangle, AlertCircle, Archive, Package, ChevronRight, Zap, WifiOff } from "lucide-react";
import { useUser } from "@clerk/react";

const STATUS_CONFIG: Record<string, { color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  "on-track": { color: "#22c55e", Icon: CheckCircle },
  "at-risk": { color: "#f59e0b", Icon: AlertTriangle },
  delayed: { color: "#e63946", Icon: AlertCircle },
  completed: { color: "#8896a7", Icon: Archive },
};

function statusLabel(status: string) {
  if (status === "on-track") return "On Track";
  if (status === "at-risk") return "At Risk";
  if (status === "delayed") return "Delayed";
  if (status === "completed") return "Completed";
  return status;
}

function ShipmentCard({ shipment, onPress }: { shipment: Shipment; onPress: () => void }) {
  const cfg = STATUS_CONFIG[shipment.status ?? ""] ?? STATUS_CONFIG["on-track"];
  const { Icon } = cfg;

  return (
    <button
      onClick={onPress}
      className="w-full text-left rounded-xl border bg-card p-3.5 flex flex-col gap-2.5 active:opacity-75 transition-opacity"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${cfg.color}18` }}
        >
          <Icon size={18} color={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">PO {shipment.poNumber}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{shipment.product}</p>
        </div>
        <ChevronRight size={16} color="hsl(var(--muted-foreground))" />
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
        >
          {statusLabel(shipment.status ?? "")}
        </span>
        {shipment.supplierName && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full truncate max-w-[140px]"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
          >
            {shipment.supplierName}
          </span>
        )}
        {shipment.buyerPoNumber && (
          <span className="text-[11px] text-muted-foreground truncate">
            Buyer: {shipment.buyerPoNumber}
          </span>
        )}
      </div>
    </button>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { data: shipments, isLoading, isRefetching, refetch, isError } = useListShipments();

  const active = (shipments ?? []).filter((s) => s.status !== "completed").slice(0, 30);

  return (
    <AppShell>
      <div
        className="status-bar-pad px-5 pb-4 shrink-0"
        style={{ background: "hsl(var(--primary))" }}
      >
        <p className="text-white font-bold text-xl tracking-tight">FlowForgeIQ</p>
        <p className="text-white/70 text-xs mt-0.5 tracking-wide">
          {user ? `Welcome, ${user.firstName ?? user.primaryEmailAddress?.emailAddress?.split("@")[0] ?? ""}` : "Active Shipments"}
        </p>
      </div>

      <div className="flex-1 scroll-area px-4 pt-3 pb-2">
        {isLoading && !isRefetching && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }}
            />
            <p className="text-sm text-muted-foreground">Loading shipments…</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <WifiOff size={32} color="hsl(var(--muted-foreground))" />
            <p className="text-sm text-muted-foreground text-center">Could not load shipments</p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "hsl(var(--primary))" }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && active.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Package size={36} color="hsl(var(--muted-foreground))" />
            <p className="font-semibold text-foreground text-center">No active shipments</p>
            <p className="text-sm text-muted-foreground text-center leading-5">
              Use the Capture tab to submit messages and route them to shipments.
            </p>
          </div>
        )}

        {!isError && active.length > 0 && (
          <>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-3"
              style={{ backgroundColor: "hsl(var(--accent))", borderColor: "hsl(var(--border))" }}
            >
              <Zap size={13} color="hsl(var(--primary))" />
              <p className="text-xs text-muted-foreground leading-[1.4]">
                Tap a shipment to view details and capture new updates
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {active.map((s) => (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  onPress={() => navigate(`/shipment/${s.id}`)}
                />
              ))}
            </div>
            <div className="h-4" />
          </>
        )}
      </div>
    </AppShell>
  );
}
