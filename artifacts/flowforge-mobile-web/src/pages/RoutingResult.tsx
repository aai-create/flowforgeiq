import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateMessage, useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { ArrowLeft, Check, CheckCircle, AlertCircle, HelpCircle, Package, Search, ChevronRight, Edit2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

interface IngestResult {
  routingStatus: "routed" | "needs-review";
  shipmentId?: number | null;
  confidence: number;
  matchMethod?: string | null;
  sender?: string | null;
  snippet?: string;
  fullBody?: string;
  aiDraft?: string | null;
  aiAction?: string | null;
  aiTags?: string[];
}

interface RoutingPayload {
  result: IngestResult;
  rawText: string;
  channel: string;
  senderHint: string;
  preSelectedShipmentId?: number | null;
}

const GRADIENT_HEADER = {
  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
  boxShadow: "0 2px 16px hsl(var(--primary) / 0.3)",
};

const GRADIENT_BTN = {
  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
  boxShadow: "0 4px 16px hsl(var(--primary) / 0.4)",
  color: "white",
};

function fadeSlide(animated: boolean, delayMs = 0): React.CSSProperties {
  return {
    opacity: animated ? 1 : 0,
    transform: animated ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.38s ease ${delayMs}ms, transform 0.38s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
  };
}

function ConfidenceDisplay({ confidence, animated }: { confidence: number; animated: boolean }) {
  const { t } = useTranslation();
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#e63946";
  const label = pct >= 75 ? t("routing.highConfidence") : pct >= 50 ? t("routing.medConfidence") : t("routing.lowConfidence");

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0"
        style={{
          backgroundColor: `${color}12`,
          border: `2px solid ${color}30`,
          transition: "opacity 0.5s ease",
          opacity: animated ? 1 : 0,
        }}
      >
        <span
          className="text-2xl font-black leading-none"
          style={{ color, fontVariantNumeric: "tabular-nums" }}
        >
          {pct}
        </span>
        <span className="text-[10px] font-bold" style={{ color: `${color}cc` }}>%</span>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold" style={{ color }}>{label}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--muted))" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: animated ? `${pct}%` : "0%",
              backgroundColor: color,
              transition: "width 0.75s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ShipmentPicker({
  shipments, search, onSearch, onSelect,
}: {
  shipments: Shipment[]; search: string; onSearch: (v: string) => void; onSelect: (id: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <Search size={14} color="hsl(var(--muted-foreground))" />
        <input
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none text-foreground"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("routing.searchPlaceholder")}
        />
      </div>
      <div className="section-panel overflow-hidden" style={{ maxHeight: 240 }}>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">{t("common.noShipmentsFound")}</p>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {shipments.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-card active:opacity-60"
                style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : undefined }}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">PO {s.poNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.product}{s.supplierName ? ` · ${s.supplierName}` : ""}
                  </p>
                </div>
                <ChevronRight size={14} color="hsl(var(--muted-foreground))" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShipmentChip({ shipment }: { shipment: Shipment }) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
      style={{
        backgroundColor: "hsl(var(--accent))",
        border: "1.5px solid hsl(var(--primary) / 0.2)",
      }}
    >
      <Package size={15} color="hsl(var(--primary))" />
      <div>
        <p className="text-sm font-bold text-foreground">PO {shipment.poNumber}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {shipment.product}{shipment.supplierName ? ` · ${shipment.supplierName}` : ""}
        </p>
      </div>
    </div>
  );
}

export default function RoutingResultPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [payload, setPayload] = useState<RoutingPayload | null>(null);
  const [payloadError, setPayloadError] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ff_routing_payload");
      if (raw) {
        setPayload(JSON.parse(raw));
        sessionStorage.removeItem("ff_routing_payload");
      } else {
        setPayloadError(true);
      }
    } catch {
      setPayloadError(true);
    }
  }, []);

  useEffect(() => {
    if (!payload) return;
    const frame = requestAnimationFrame(() => {
      setTimeout(() => setAnimated(true), 30);
    });
    return () => cancelAnimationFrame(frame);
  }, [payload]);

  const { data: shipments } = useListShipments();
  const { mutate: createMessage, isPending } = useCreateMessage();

  const [showChange, setShowChange] = useState(false);
  const [shipSearch, setShipSearch] = useState("");
  const [overrideId, setOverrideId] = useState<number | null>(null);

  const result = payload?.result ?? null;
  const rawText = payload?.rawText ?? "";
  const channel = payload?.channel ?? "whatsapp";
  const senderHint = payload?.senderHint ?? "";

  const confidence = result?.confidence ?? 0;
  const suggestedId = overrideId ?? result?.shipmentId ?? null;
  const isHighConf = confidence >= 0.75 && result?.routingStatus === "routed" && suggestedId != null;
  const isMedConf = confidence >= 0.4 && confidence < 0.75 && suggestedId != null;
  const isLowConf = !isHighConf && !isMedConf;

  const filteredShipments = (shipments ?? [])
    .filter((s) => s.status !== "completed")
    .filter((s) => {
      if (!shipSearch.trim()) return true;
      const q = shipSearch.toLowerCase();
      return (
        s.poNumber?.toLowerCase().includes(q) ||
        s.product?.toLowerCase().includes(q) ||
        s.supplierName?.toLowerCase().includes(q)
      );
    })
    .slice(0, 15);

  const suggestedShipment = suggestedId
    ? (shipments ?? []).find((s) => s.id === suggestedId)
    : null;

  function buildPayload(shipmentId: number | null, status: "routed" | "needs-review") {
    return {
      data: {
        sender: result?.sender ?? senderHint ?? "Unknown",
        channel: channel as any,
        snippet: rawText.replace(/\s+/g, " ").trim().slice(0, 200),
        fullBody: rawText,
        rawChatText: rawText,
        shipmentId: shipmentId ?? undefined,
        routingStatus: status,
        routingConfidence: result?.confidence,
        matchMethod: result?.matchMethod ?? undefined,
        aiDraft: result?.aiDraft ?? undefined,
        aiAction: result?.aiAction ?? undefined,
        aiTags: result?.aiTags ?? undefined,
      },
    };
  }

  function goBack() { navigate("/capture"); }

  function handleConfirm(shipmentId: number | null) {
    createMessage(buildPayload(shipmentId, shipmentId ? "routed" : "needs-review"), {
      onSuccess: () => {
        alert(shipmentId ? t("routing.savedSuccess") : t("routing.savedTriage"));
        navigate("/home");
      },
      onError: () => alert(t("routing.saveFailed")),
    });
  }

  if (payloadError || (!payload && !result)) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={goBack} className="active:opacity-60"><ArrowLeft size={20} color="white" /></button>
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
              alt="FlowForgeIQ"
              style={{ width: 28, height: 28, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
            />
            <div>
              <p className="text-white font-bold text-[17px] tracking-tight leading-tight">FlowForgeIQ</p>
              <p className="text-white/55 text-[11px] font-medium tracking-[0.6px] uppercase mt-0.5">{t("routing.title")}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-muted-foreground text-center">
            {payloadError ? t("routing.noResult") : t("common.loading")}
          </p>
          <button onClick={goBack} className="px-5 py-3.5 rounded-[16px] font-bold text-base btn-press" style={GRADIENT_BTN}>
            {t("routing.goBackCapture")}
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto items-center justify-center">
        <div className="app-spinner" />
      </div>
    );
  }

  const headerSubtitle = isHighConf ? t("routing.autoRouted") : isMedConf ? t("routing.confirmRouting") : t("routing.needsReview");
  const bannerText = isHighConf ? t("routing.bannerHigh")
    : isMedConf ? t("routing.bannerMedium")
    : t("routing.bannerLow");

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto overflow-hidden">
      {/* Header */}
      <div className="status-bar-pad px-5 pb-5 flex items-start gap-3 shrink-0" style={GRADIENT_HEADER}>
        <button onClick={goBack} className="mt-1 active:opacity-60"><ArrowLeft size={20} color="white" /></button>
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
            alt="FlowForgeIQ"
            style={{ width: 28, height: 28, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
          />
          <div>
            <p className="text-white font-bold text-[17px] tracking-tight leading-tight">FlowForgeIQ</p>
            <p className="text-white/55 text-[11px] font-medium tracking-[0.6px] uppercase mt-0.5">
              {headerSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-3">

        {/* Banner */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl card-elevated"
          style={{
            background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(270 60% 97%) 100%)",
            border: "1px solid hsl(var(--primary) / 0.12)",
            ...fadeSlide(animated, 0),
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)" }}
          >
            <Zap size={15} fill="white" strokeWidth={0} />
          </div>
          <p className="text-xs leading-relaxed flex-1" style={{ color: "hsl(var(--accent-foreground))" }}>
            {bannerText}
          </p>
        </div>

        {/* Confidence card */}
        <div
          className="section-panel p-4 flex flex-col gap-3"
          style={fadeSlide(animated, 60)}
        >
          <p className="section-label">{t("routing.aiConfidence")}</p>
          <ConfidenceDisplay confidence={confidence} animated={animated} />
          {(result.matchMethod || result.sender) && (
            <div
              className="flex flex-col gap-1 pt-2"
              style={{ borderTop: "1px solid hsl(var(--border))" }}
            >
              {result.matchMethod && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("routing.matchLabel")}:</span> {result.matchMethod}
                </p>
              )}
              {result.sender && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("routing.fromLabel")}:</span> {result.sender}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── HIGH CONFIDENCE ──────────────────────────────────── */}
        {isHighConf && (
          <>
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                backgroundColor: "#22c55e0d",
                border: "1.5px solid #22c55e35",
                ...fadeSlide(animated, 140),
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#22c55e18" }}
                >
                  <CheckCircle size={22} color="#22c55e" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{t("routing.autoRoutedSuccess")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("routing.autoRoutedDesc")}</p>
                </div>
              </div>
              {suggestedShipment && <ShipmentChip shipment={suggestedShipment} />}
            </div>

            {!showChange ? (
              <div className="flex gap-2.5" style={fadeSlide(animated, 290)}>
                <button
                  onClick={() => handleConfirm(suggestedId)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all btn-press"
                  style={GRADIENT_BTN}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Check size={17} strokeWidth={2.5} /><span>{t("routing.confirmSave")}</span></>}
                </button>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center gap-1.5 px-4 py-4 rounded-2xl font-semibold active:opacity-75"
                  style={{
                    border: "1.5px solid hsl(var(--border))",
                    color: "hsl(var(--primary))",
                    backgroundColor: "hsl(var(--primary) / 0.04)",
                  }}
                >
                  <Edit2 size={14} /> {t("routing.change")}
                </button>
              </div>
            ) : (
              <ShipmentPicker
                shipments={filteredShipments}
                search={shipSearch}
                onSearch={setShipSearch}
                onSelect={(id) => { setOverrideId(id); setShowChange(false); setShipSearch(""); }}
              />
            )}
          </>
        )}

        {/* ── MEDIUM CONFIDENCE ────────────────────────────────── */}
        {isMedConf && (
          <>
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                backgroundColor: "#d9770610",
                border: "1.5px solid #d9770635",
                ...fadeSlide(animated, 140),
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#d9770618" }}
                >
                  <AlertCircle size={22} color="#d97706" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{t("routing.possibleMatch")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("routing.possibleMatchDesc")}</p>
                </div>
              </div>
              {suggestedShipment && <ShipmentChip shipment={suggestedShipment} />}
            </div>

            {!showChange ? (
              <div className="flex gap-2.5" style={fadeSlide(animated, 290)}>
                <button
                  onClick={() => handleConfirm(suggestedId)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all btn-press"
                  style={GRADIENT_BTN}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Check size={17} strokeWidth={2.5} /><span>{t("routing.yesConfirm")}</span></>}
                </button>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center gap-1.5 px-4 py-4 rounded-2xl font-semibold active:opacity-75"
                  style={{
                    border: "1.5px solid hsl(var(--border))",
                    color: "hsl(var(--primary))",
                    backgroundColor: "hsl(var(--primary) / 0.04)",
                  }}
                >
                  <Search size={14} /> {t("routing.pick")}
                </button>
              </div>
            ) : (
              <ShipmentPicker
                shipments={filteredShipments}
                search={shipSearch}
                onSearch={setShipSearch}
                onSelect={(id) => { setOverrideId(id); setShowChange(false); setShipSearch(""); }}
              />
            )}

            <button
              onClick={() => handleConfirm(null)}
              disabled={isPending}
              className="text-sm text-center text-muted-foreground py-2 active:opacity-60"
              style={fadeSlide(animated, 370)}
            >
              {t("routing.noneOfThese")}
            </button>
          </>
        )}

        {/* ── LOW CONFIDENCE ───────────────────────────────────── */}
        {isLowConf && (
          <>
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "#e6394610",
                border: "1.5px solid #e6394630",
                ...fadeSlide(animated, 140),
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#e6394618" }}
                >
                  <HelpCircle size={22} color="#e63946" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{t("routing.couldNotMatch")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {t("routing.couldNotMatchDesc")}
                  </p>
                </div>
              </div>
            </div>

            {!showChange ? (
              <div className="flex flex-col gap-2.5" style={fadeSlide(animated, 290)}>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base btn-press"
                  style={GRADIENT_BTN}
                >
                  <Search size={16} /> {t("routing.pickManually")}
                </button>
                <button
                  onClick={() => handleConfirm(null)}
                  disabled={isPending}
                  className="flex items-center justify-center py-4 rounded-2xl font-semibold active:opacity-75"
                  style={{
                    backgroundColor: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                    : t("routing.sendToTriage")}
                </button>
              </div>
            ) : (
              <>
                <ShipmentPicker
                  shipments={filteredShipments}
                  search={shipSearch}
                  onSearch={setShipSearch}
                  onSelect={(id) => handleConfirm(id)}
                />
                <button
                  onClick={() => setShowChange(false)}
                  className="text-sm text-center text-muted-foreground py-2 active:opacity-60"
                >
                  {t("routing.cancel")}
                </button>
              </>
            )}
          </>
        )}

        {/* AI draft */}
        {result.aiDraft && (
          <div
            className="section-panel p-4 flex flex-col gap-2"
            style={fadeSlide(animated, 430)}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
              >
                <Edit2 size={13} color="hsl(var(--primary))" />
              </div>
              <p className="text-sm font-bold text-foreground">{t("routing.aiDraftReply")}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{result.aiDraft}</p>
          </div>
        )}

        {/* Tags */}
        {result.aiTags && result.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={fadeSlide(animated, 490)}>
            {result.aiTags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
