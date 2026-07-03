import { useLocation, useParams } from "wouter";
import { useListShipments, useListShipmentStageEvents, useListMessages } from "@workspace/api-client-react";
import { ArrowLeft, Package, MessageSquare, Zap, User, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtUsd(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const GRADIENT_HEADER = {
  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
  boxShadow: "0 2px 16px hsl(var(--primary) / 0.3)",
};

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section-panel p-4 flex flex-col gap-3">
      <p className="section-label">{title}</p>
      {children}
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground max-w-[60%] text-right truncate">{value}</span>
    </div>
  );
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const shipmentId = Number(id);

  const { data: shipments, isLoading } = useListShipments();
  const { data: stageEvents, isError: stageEventsError } = useListShipmentStageEvents(shipmentId);
  const { data: messages } = useListMessages();

  const shipment = (shipments ?? []).find((s) => s.id === shipmentId) ?? null;

  const recentMessages = (messages ?? [])
    .filter((m) => m.shipmentId === shipmentId)
    .slice(0, 5);

  const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    "on-track": { color: "#22c55e", label: t("status.onTrack") },
    "at-risk": { color: "#f59e0b", label: t("status.atRisk") },
    delayed: { color: "#e63946", label: t("status.delayed") },
    completed: { color: "#8896a7", label: t("status.completed") },
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={() => navigate("/home")} className="active:opacity-60">
            <ArrowLeft size={20} color="white" />
          </button>
          <p className="text-white font-bold text-[17px]">{t("shipmentDetail.title")}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="app-spinner" />
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={() => navigate("/home")} className="active:opacity-60">
            <ArrowLeft size={20} color="white" />
          </button>
          <p className="text-white font-bold text-[17px]">{t("shipmentDetail.title")}</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "hsl(var(--accent))" }}
          >
            <Package size={28} color="hsl(var(--primary))" />
          </div>
          <p className="font-semibold text-foreground text-center">{t("shipmentDetail.notFound")}</p>
          <button
            onClick={() => navigate("/home")}
            className="px-5 py-2.5 rounded-xl text-white font-semibold btn-press"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
              boxShadow: "0 4px 12px hsl(var(--primary) / 0.35)",
            }}
          >
            {t("shipmentDetail.goBack")}
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
      {/* Header */}
      <div className="status-bar-pad px-5 pb-5 flex items-start gap-3 shrink-0" style={GRADIENT_HEADER}>
        <button onClick={() => navigate("/home")} className="mt-0.5 active:opacity-60">
          <ArrowLeft size={20} color="white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[17px] leading-tight">PO {shipment.poNumber}</p>
          <p className="text-white/65 text-xs mt-0.5 truncate">{shipment.product}</p>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full mt-0.5 shrink-0"
          style={{
            color: cfg.color,
            backgroundColor: `${cfg.color}22`,
            border: `1px solid ${cfg.color}35`,
          }}
        >
          {cfg.label}
        </span>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">

        {/* Overview */}
        <SectionPanel title={t("shipmentDetail.overview")}>
          <div className="flex flex-col divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
            {[
              { label: t("shipmentDetail.supplier"), value: shipment.supplierName ?? "—" },
              { label: t("shipmentDetail.buyerPo"), value: shipment.buyerPoNumber ?? "—" },
              { label: t("shipmentDetail.destination"), value: shipment.destination ?? "—" },
              { label: t("shipmentDetail.via"), value: shipment.via ?? "—" },
              { label: t("shipmentDetail.exFactory"), value: shipment.exFactoryDate ? formatDate(shipment.exFactoryDate) : "—" },
              { label: t("shipmentDetail.dueDate"), value: shipment.dueDate ? formatDate(shipment.dueDate) : "—" },
              { label: t("shipmentDetail.quantity"), value: shipment.quantity != null ? shipment.quantity.toLocaleString() : "—" },
            ].map(({ label, value }) => (
              <KVRow key={label} label={label} value={value} />
            ))}
          </div>
        </SectionPanel>

        {/* Financials */}
        <SectionPanel title={t("shipmentDetail.financials")}>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "hsl(var(--accent))", border: "1px solid hsl(var(--primary) / 0.1)" }}
            >
              <p className="text-[11px] text-muted-foreground font-medium">{t("shipmentDetail.unitCost")}</p>
              <p className="text-base font-bold text-foreground mt-1">{fmtUsd(shipment.unitCostUsd)}</p>
            </div>
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "hsl(var(--accent))", border: "1px solid hsl(var(--primary) / 0.1)" }}
            >
              <p className="text-[11px] text-muted-foreground font-medium">{t("shipmentDetail.buyerPrice")}</p>
              <p className="text-base font-bold text-foreground mt-1">{fmtUsd((shipment as any).buyerUnitPrice)}</p>
            </div>
            {spread != null && (
              <div
                className="col-span-2 rounded-xl p-3"
                style={{
                  backgroundColor: spread >= 0 ? "#22c55e10" : "#e6394610",
                  border: `1px solid ${spread >= 0 ? "#22c55e30" : "#e6394630"}`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} color={spread >= 0 ? "#22c55e" : "#e63946"} />
                  <p className="text-[11px] font-medium" style={{ color: spread >= 0 ? "#22c55e" : "#e63946" }}>{t("shipmentDetail.spread")}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold" style={{ color: spread >= 0 ? "#22c55e" : "#e63946" }}>{fmtUsd(spread)}</p>
                  {spreadPct != null && (
                    <p className="text-xs font-semibold" style={{ color: spread >= 0 ? "#22c55e" : "#e63946" }}>
                      {spreadPct.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {shipment.payments && shipment.payments.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              <p className="section-label">{t("shipmentDetail.payments")}</p>
              {shipment.payments.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-xl"
                  style={{ backgroundColor: "hsl(var(--background))" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.paid ? "#22c55e" : "hsl(var(--muted-foreground))" }}
                    />
                    <span className="text-sm text-foreground">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">{fmtUsd(p.amountUsd)}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: p.paid ? "#22c55e" : "#d97706",
                        backgroundColor: p.paid ? "#22c55e18" : "#f59e0b18",
                      }}
                    >
                      {p.paid ? t("status.paid") : t("status.pending")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        {/* Stage timeline */}
        {(stageEventsError || (stageEvents && stageEvents.length > 0)) && (
          <SectionPanel title={t("shipmentDetail.stageHistory")}>
            {stageEventsError ? (
              <p className="text-xs text-muted-foreground italic">{t("shipmentDetail.historyUnavailable")}</p>
            ) : (
              <div className="flex flex-col">
                {stageEvents!.slice(0, 5).map((ev, i, arr) => (
                  <div key={ev.id} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center" style={{ minWidth: 20 }}>
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{
                          backgroundColor: i === 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)",
                          border: i === 0 ? "2px solid hsl(var(--primary) / 0.3)" : "none",
                        }}
                      />
                      {i < arr.length - 1 && (
                        <div
                          className="w-px flex-1 mt-1 mb-0.5 min-h-[20px]"
                          style={{ backgroundColor: "hsl(var(--border))" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm font-semibold text-foreground">{ev.toStageId}</p>
                      {ev.note && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ev.note}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-[11px] text-muted-foreground">{formatDate(ev.createdAt)}</p>
                        {ev.createdBy && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <User size={9} />
                            {ev.createdBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        )}

        {/* Recent messages */}
        {recentMessages.length > 0 && (
          <SectionPanel title={t("shipmentDetail.recentMessages")}>
            <div className="flex flex-col gap-2.5">
              {recentMessages.map((m) => (
                <div
                  key={m.id}
                  className="flex gap-3 items-start p-2.5 rounded-xl"
                  style={{ backgroundColor: "hsl(var(--background))" }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "hsl(var(--accent))" }}
                  >
                    <MessageSquare size={14} color="hsl(var(--primary))" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{m.sender}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{m.snippet}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionPanel>
        )}

        {/* Capture shortcut */}
        <button
          onClick={() => navigate(`/capture?shipmentId=${shipment.id}&shipmentName=${encodeURIComponent(`PO ${shipment.poNumber} — ${shipment.product}`)}`)}
          className="flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-white btn-press"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
            boxShadow: "0 4px 16px hsl(var(--primary) / 0.4)",
          }}
        >
          <Zap size={18} fill="white" strokeWidth={0} />
          {t("shipmentDetail.captureForShipment")}
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}
