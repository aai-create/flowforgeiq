import { useState } from "react";
import { useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation } from "wouter";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Archive,
  Package,
  ChevronRight,
  Zap,
  WifiOff,
  Share2,
  X,
} from "lucide-react";

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

function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const SHARE_BANNER_KEY = "ff:share-banner-dismissed";

function ShareInstallBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SHARE_BANNER_KEY) === "yes";
    } catch {
      return false;
    }
  });

  if (isStandaloneMode() || dismissed) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function handleDismiss() {
    try {
      localStorage.setItem(SHARE_BANNER_KEY, "yes");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      className="rounded-xl border px-3.5 py-3 mb-3 flex flex-col gap-2"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.07) 0%, hsl(var(--primary) / 0.03) 100%)",
        borderColor: "hsl(var(--primary) / 0.25)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--primary) / 0.12)" }}
          >
            <Share2 size={14} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            Share directly from WhatsApp
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-0.5 shrink-0 active:opacity-60"
          style={{ color: "hsl(var(--muted-foreground))" }}
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Install this app on your home screen to send chat exports straight to FlowForgeIQ — no copy-paste needed.
      </p>

      <div
        className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5"
        style={{ background: "hsl(var(--accent))" }}
      >
        {isIOS ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Safari only</span> — tap the{" "}
              <span className="font-semibold text-foreground">Share</span> button in the toolbar,
              then <span className="font-semibold text-foreground">Add to Home Screen</span>.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground">
              Tap <span className="font-semibold text-foreground">⋮ Menu → Add to Home Screen</span> in Chrome
              to install. Then use Android's share sheet from any app.
            </p>
          </>
        )}
      </div>
    </div>
  );
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
  const { data: shipments, isLoading, isRefetching, refetch, isError } = useListShipments();

  const active = (shipments ?? []).filter((s) => s.status !== "completed").slice(0, 30);

  return (
    <AppShell>
      <div
        className="status-bar-pad px-5 pb-4 flex items-center gap-2.5 shrink-0"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
          boxShadow: "0 2px 12px hsl(var(--primary) / 0.35)",
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
          alt="FlowForgeIQ"
          style={{ width: 28, height: 28, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
        />
        <div>
          <p className="text-white font-bold text-lg tracking-tight leading-tight">FlowForgeIQ</p>
          <p className="text-white/60 text-[10px] tracking-[0.8px] uppercase mt-0.5">Home</p>
        </div>
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
          <>
            <ShareInstallBanner />
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Package size={36} color="hsl(var(--muted-foreground))" />
              <p className="font-semibold text-foreground text-center">No active shipments</p>
              <p className="text-sm text-muted-foreground text-center leading-5">
                Use the Capture tab to submit messages and route them to shipments.
              </p>
            </div>
          </>
        )}

        {!isError && active.length > 0 && (
          <>
            <ShareInstallBanner />
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
