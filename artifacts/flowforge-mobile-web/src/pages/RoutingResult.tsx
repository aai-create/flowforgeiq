import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateMessage, useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { ArrowLeft, Check, CheckCircle, AlertCircle, HelpCircle, Package, Search, ChevronRight, Edit2, Zap } from "lucide-react";

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

function ConfidenceBar({ confidence, animated }: { confidence: number; animated: boolean }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#e63946";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground w-20">Confidence</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: animated ? `${pct}%` : "0%",
              backgroundColor: color,
              transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
        <span
          className="text-xs font-semibold w-9 text-right"
          style={{
            color,
            opacity: animated ? 1 : 0,
            transition: "opacity 0.4s ease 0.5s",
          }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

function ShipmentPicker({
  shipments,
  search,
  onSearch,
  onSelect,
}: {
  shipments: Shipment[];
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-card"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <Search size={14} color="hsl(var(--muted-foreground))" />
        <input
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none text-foreground"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="PO number, product, supplier…"
        />
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">No shipments found</p>
        ) : (
          shipments.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="w-full flex items-center justify-between px-3.5 py-3 bg-card active:opacity-60"
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
          ))
        )}
      </div>
    </div>
  );
}

const GRADIENT_HEADER = {
  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
  boxShadow: "0 2px 12px hsl(var(--primary) / 0.35)",
};

const GRADIENT_BTN = {
  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
  boxShadow: "0 4px 14px hsl(var(--primary) / 0.4)",
  color: "white",
};

function fadeSlide(animated: boolean, delayMs = 0): React.CSSProperties {
  return {
    opacity: animated ? 1 : 0,
    transform: animated ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.38s ease ${delayMs}ms, transform 0.38s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
  };
}

export default function RoutingResultPage() {
  const [, navigate] = useLocation();
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
        alert(shipmentId ? "Message routed and saved!" : "Sent to triage queue.");
        navigate("/home");
      },
      onError: () => alert("Save failed. Please try again."),
    });
  }

  if (payloadError || (!payload && !result)) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-4 flex items-center gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={goBack}><ArrowLeft size={20} color="white" /></button>
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
              alt="FlowForgeIQ"
              style={{ width: 26, height: 26, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
            />
            <div>
              <p className="text-white font-bold text-lg tracking-tight leading-tight">FlowForgeIQ</p>
              <p className="text-white/60 text-[10px] tracking-[0.8px] uppercase mt-0.5">Routing Result</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-muted-foreground text-center">
            {payloadError
              ? "No routing result found. Please go back and try again."
              : "Loading…"}
          </p>
          <button
            onClick={goBack}
            className="px-5 py-3 rounded-[14px] font-semibold text-base"
            style={GRADIENT_BTN}
          >
            Go back to Capture
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const bannerText = isHighConf
    ? "AI routed this message with high confidence — confirm to save"
    : isMedConf
    ? "AI found a possible match — please confirm the right shipment"
    : "AI couldn't match automatically — pick a shipment or send to triage";

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto overflow-hidden">
      {/* Gradient header */}
      <div className="status-bar-pad px-5 pb-4 flex items-start gap-3 shrink-0" style={GRADIENT_HEADER}>
        <button onClick={goBack} className="mt-1"><ArrowLeft size={20} color="white" /></button>
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
            alt="FlowForgeIQ"
            style={{ width: 26, height: 26, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
          />
          <div>
            <p className="text-white font-bold text-lg tracking-tight leading-tight">FlowForgeIQ</p>
            <p className="text-white/60 text-[10px] tracking-[0.8px] uppercase mt-0.5">
              {isHighConf ? "Auto-routed" : isMedConf ? "Confirm routing" : "Needs review"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-3">
        {/* Accent banner — fades in first */}
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background: "hsl(var(--accent))",
            border: "1px solid hsl(var(--primary) / 0.15)",
            ...fadeSlide(animated, 0),
          }}
        >
          <Zap size={13} fill="hsl(var(--primary))" strokeWidth={0} className="mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed" style={{ color: "hsl(var(--accent-foreground))" }}>
            {bannerText}
          </p>
        </div>

        {/* Confidence card — slides up 60ms after banner */}
        <div
          className="rounded-2xl border bg-card p-4 flex flex-col gap-2"
          style={{
            borderColor: "hsl(var(--border))",
            ...fadeSlide(animated, 60),
          }}
        >
          <ConfidenceBar confidence={confidence} animated={animated} />
          {result.matchMethod && (
            <p className="text-xs text-muted-foreground">Match: {result.matchMethod}</p>
          )}
          {result.sender && (
            <p className="text-xs text-muted-foreground">From: {result.sender}</p>
          )}
        </div>

        {/* High confidence */}
        {isHighConf && (
          <>
            {/* Result card — slides up 140ms */}
            <div
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{
                backgroundColor: "#22c55e12",
                borderColor: "#22c55e40",
                ...fadeSlide(animated, 140),
              }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle size={26} color="#22c55e" />
                <div>
                  <p className="font-semibold text-foreground">Auto-routed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">High confidence match — ready to save</p>
                </div>
              </div>
              {suggestedShipment && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: "hsl(var(--accent))" }}
                >
                  <Package size={14} color="hsl(var(--primary))" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">PO {suggestedShipment.poNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestedShipment.product}{suggestedShipment.supplierName ? ` · ${suggestedShipment.supplierName}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* CTA buttons — staggered 290ms (card + 150ms) */}
            {!showChange ? (
              <div className="flex gap-2" style={fadeSlide(animated, 290)}>
                <button
                  onClick={() => handleConfirm(suggestedId)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-semibold text-base transition-all"
                  style={GRADIENT_BTN}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Check size={16} /><span>Confirm &amp; Save</span></>}
                </button>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-[14px] border font-medium"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--primary))" }}
                >
                  <Edit2 size={14} /> Change
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

        {/* Medium confidence */}
        {isMedConf && (
          <>
            {/* Result card — slides up 140ms */}
            <div
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{
                backgroundColor: "#d9770612",
                borderColor: "#d9770640",
                ...fadeSlide(animated, 140),
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={26} color="#d97706" />
                <div>
                  <p className="font-semibold text-foreground">Possible match found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Is this the right shipment?</p>
                </div>
              </div>
              {suggestedShipment && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: "hsl(var(--accent))" }}
                >
                  <Package size={14} color="hsl(var(--primary))" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">PO {suggestedShipment.poNumber}</p>
                    <p className="text-xs text-muted-foreground">{suggestedShipment.product}</p>
                  </div>
                </div>
              )}
            </div>
            {/* CTA buttons — staggered 290ms */}
            {!showChange ? (
              <div className="flex gap-2" style={fadeSlide(animated, 290)}>
                <button
                  onClick={() => handleConfirm(suggestedId)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-semibold text-base transition-all"
                  style={GRADIENT_BTN}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Check size={16} /><span>Yes, confirm</span></>}
                </button>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-[14px] border font-medium"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--primary))" }}
                >
                  <Search size={14} /> Pick another
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
            {/* Tertiary action staggered 370ms */}
            <button
              onClick={() => handleConfirm(null)}
              disabled={isPending}
              className="text-sm text-center text-muted-foreground py-2"
              style={fadeSlide(animated, 370)}
            >
              None of these — send to web queue
            </button>
          </>
        )}

        {/* Low confidence */}
        {isLowConf && (
          <>
            {/* Result card — slides up 140ms */}
            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: "#e6394610",
                borderColor: "#e6394640",
                ...fadeSlide(animated, 140),
              }}
            >
              <div className="flex items-start gap-3">
                <HelpCircle size={26} color="#e63946" />
                <div>
                  <p className="font-semibold text-foreground">Low confidence</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-[1.5]">
                    Could not match automatically. Pick a shipment manually or send to triage queue.
                  </p>
                </div>
              </div>
            </div>
            {/* CTA buttons — staggered 290ms */}
            {!showChange ? (
              <div className="flex flex-col gap-2" style={fadeSlide(animated, 290)}>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-semibold text-base transition-all"
                  style={GRADIENT_BTN}
                >
                  <Search size={15} /> Pick a shipment manually
                </button>
                <button
                  onClick={() => handleConfirm(null)}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-semibold"
                  style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                    : "Send to web triage queue"}
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
                  className="text-sm text-center text-muted-foreground py-2"
                >
                  Cancel
                </button>
              </>
            )}
          </>
        )}

        {/* AI draft — staggered 370ms */}
        {result.aiDraft && (
          <div
            className="rounded-2xl border bg-card p-4 flex flex-col gap-2"
            style={{
              borderColor: "hsl(var(--border))",
              ...fadeSlide(animated, 370),
            }}
          >
            <div className="flex items-center gap-2">
              <Edit2 size={14} color="hsl(var(--primary))" />
              <p className="text-sm font-semibold text-foreground">AI Draft Reply</p>
            </div>
            <p className="text-xs text-muted-foreground leading-[1.6] line-clamp-4">{result.aiDraft}</p>
          </div>
        )}

        {/* Tags — staggered 430ms */}
        {result.aiTags && result.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={fadeSlide(animated, 430)}>
            {result.aiTags.map((tag, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
