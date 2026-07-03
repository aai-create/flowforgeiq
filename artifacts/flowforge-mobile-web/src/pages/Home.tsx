import { useState } from "react";
import { useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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

function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const SHARE_BANNER_KEY = "ff:share-banner-dismissed";

function ShareInstallBanner() {
  const { t } = useTranslation();
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
            {t("home.shareBannerTitle")}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-0.5 shrink-0 active:opacity-60"
          style={{ color: "hsl(var(--muted-foreground))" }}
          aria-label={t("common.dismiss")}
        >
          <X size={15} />
        </button>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {t("home.shareBannerDesc")}
      </p>

      <div
        className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5"
        style={{ background: "hsl(var(--accent))" }}
      >
        {isIOS ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{t("home.iosSafariOnly")}</span> — {t("home.iosTapShare")}{" "}
              <span className="font-semibold text-foreground">{t("home.iosShare")}</span> {t("home.iosThen")}{" "}
              <span className="font-semibold text-foreground">{t("home.iosAddHome")}</span>.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground">
              {t("home.androidTap")} <span className="font-semibold text-foreground">{t("home.androidMenu")}</span> {t("home.androidInstall")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ShipmentCard({ shipment, onPress }: { shipment: Shipment; onPress: () => void }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[shipment.status ?? ""] ?? STATUS_CONFIG["on-track"];
  const { Icon } = cfg;

  function statusLabel(status: string) {
    if (status === "on-track") return t("status.onTrack");
    if (status === "at-risk") return t("status.atRisk");
    if (status === "delayed") return t("status.delayed");
    if (status === "completed") return t("status.completed");
    return status;
  }

  return (
    <button
      onClick={onPress}
      className="w-full text-left rounded-2xl bg-card p-4 flex flex-col gap-3 active:opacity-75 transition-all btn-press card-elevated"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${cfg.color}1a`,
            border: `1.5px solid ${cfg.color}30`,
          }}
        >
          <Icon size={19} color={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">PO {shipment.poNumber}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{shipment.product}</p>
        </div>
        <ChevronRight size={15} color="hsl(var(--muted-foreground))" strokeWidth={2} />
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-[11px] font-bold px-2.5 py-[3px] rounded-full"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
        >
          {statusLabel(shipment.status ?? "")}
        </span>
        {shipment.supplierName && (
          <span
            className="text-[11px] font-medium px-2.5 py-[3px] rounded-full truncate max-w-[145px]"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
          >
            {shipment.supplierName}
          </span>
        )}
        {shipment.buyerPoNumber && (
          <span className="text-[11px] text-muted-foreground">
            {t("home.buyerLabel")} {shipment.buyerPoNumber}
          </span>
        )}
      </div>
    </button>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { data: shipments, isLoading, isRefetching, refetch, isError } = useListShipments();

  const active = (shipments ?? []).filter((s) => s.status !== "completed").slice(0, 30);

  return (
    <AppShell>
      {/* Page header */}
      <div
        className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0 page-header-gradient"
      >
        <img
          src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
          alt="FlowForgeIQ"
          style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
        />
        <div>
          <p className="text-white font-bold text-[17px] tracking-tight leading-tight">FlowForgeIQ</p>
          <p className="text-white/55 text-[11px] font-medium tracking-[0.6px] uppercase mt-0.5">{t("home.title")}</p>
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pt-3.5 pb-2">
        {/* Loading */}
        {isLoading && !isRefetching && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="app-spinner" />
            <p className="text-sm text-muted-foreground">{t("home.loadingShipments")}</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--muted))" }}
            >
              <WifiOff size={26} color="hsl(var(--muted-foreground))" />
            </div>
            <p className="text-sm font-medium text-foreground">{t("home.cantLoad")}</p>
            <p className="text-xs text-muted-foreground text-center">{t("home.checkConnection")}</p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white btn-press"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
                boxShadow: "0 4px 12px hsl(var(--primary) / 0.35)",
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && active.length === 0 && (
          <>
            <ShareInstallBanner />
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--accent))" }}
              >
                <Package size={30} color="hsl(var(--primary))" />
              </div>
              <p className="font-semibold text-foreground text-center">{t("home.noActiveShipments")}</p>
              <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[240px]">
                {t("home.noActiveDesc")}
              </p>
            </div>
          </>
        )}

        {/* List */}
        {!isError && active.length > 0 && (
          <>
            <ShareInstallBanner />
            {/* Hint banner */}
            <div
              className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-3.5 card-elevated"
              style={{
                background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(270 60% 97%) 100%)",
                border: "1px solid hsl(var(--primary) / 0.12)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.12)" }}
              >
                <Zap size={14} fill="hsl(var(--primary))" strokeWidth={0} />
              </div>
              <p className="text-xs leading-[1.45]" style={{ color: "hsl(var(--accent-foreground))" }}>
                {t("home.tapHint")}
              </p>
            </div>

            <div id="shipment-list" className="flex flex-col gap-2.5">
              {active.map((s) => (
                <ShipmentCard
                  key={s.id}
                  shipment={s}
                  onPress={() => navigate(`/shipment/${s.id}`)}
                />
              ))}
            </div>
            <div className="h-5" />
          </>
        )}
      </div>
    </AppShell>
  );
}
