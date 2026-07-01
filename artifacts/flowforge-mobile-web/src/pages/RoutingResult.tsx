import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateMessage, useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { ArrowLeft, Check, CheckCircle, AlertCircle, HelpCircle, Package, Search, ChevronRight, Edit2 } from "lucide-react";

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

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#e63946";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground w-20">Confidence</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs font-semibold w-9 text-right" style={{ color }}>{pct}%</span>
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

export default function RoutingResultPage() {
  const [, navigate] = useLocation();
  const [payload, setPayload] = useState<RoutingPayload | null>(null);
  const [payloadError, setPayloadError] = useState(false);

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
        <div
          className="status-bar-pad px-5 pb-4 flex items-center gap-3 shrink-0"
          style={{ background: "hsl(var(--primary))" }}
        >
          <button onClick={goBack}><ArrowLeft size={20} color="white" /></button>
          <p className="text-white font-bold text-lg">Routing Result</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-muted-foreground text-center">
            {payloadError
              ? "No routing result found. Please go back and try again."
              : "Loading…"}
          </p>
          <button
            onClick={goBack}
            className="px-5 py-2.5 rounded-xl text-white font-semibold"
            style={{ backgroundColor: "hsl(var(--primary))" }}
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

  const headerColor = isHighConf ? "hsl(var(--primary))" : isMedConf ? "#d97706" : "#e63946";

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto overflow-hidden">
      <div
        className="status-bar-pad px-5 pb-4 flex items-start gap-3 shrink-0"
        style={{ background: headerColor }}
      >
        <button onClick={goBack} className="mt-0.5"><ArrowLeft size={20} color="white" /></button>
        <div>
          <p className="text-white font-bold text-lg">Routing Result</p>
          <p className="text-white/70 text-xs">
            {isHighConf ? "Auto-routed" : isMedConf ? "Needs confirmation" : "Needs review"}
          </p>
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-3">
        {/* Confidence card */}
        <div
          className="rounded-2xl border bg-card p-4 flex flex-col gap-2"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <ConfidenceBar confidence={confidence} />
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
            <div
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{ backgroundColor: "#22c55e12", borderColor: "#22c55e40" }}
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
            {!showChange ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(suggestedId)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold"
                  style={{ backgroundColor: "hsl(var(--primary))" }}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Check size={16} /><span>Confirm &amp; Save</span></>}
                </button>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border font-medium"
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
            <div
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{ backgroundColor: "#d9770612", borderColor: "#d9770640" }}
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
            {!showChange ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirm(suggestedId)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold"
                  style={{ backgroundColor: "hsl(var(--primary))" }}
                >
                  {isPending
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Check size={16} /><span>Yes, confirm</span></>}
                </button>
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border font-medium"
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
            <button
              onClick={() => handleConfirm(null)}
              disabled={isPending}
              className="text-sm text-center text-muted-foreground py-2"
            >
              None of these — send to web queue
            </button>
          </>
        )}

        {/* Low confidence */}
        {isLowConf && (
          <>
            <div
              className="rounded-2xl border p-4"
              style={{ backgroundColor: "#e6394610", borderColor: "#e6394640" }}
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
            {!showChange ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowChange(true)}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl border font-semibold"
                  style={{ borderColor: "hsl(var(--primary))", color: "hsl(var(--primary))" }}
                >
                  <Search size={15} /> Pick a shipment manually
                </button>
                <button
                  onClick={() => handleConfirm(null)}
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold"
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

        {/* AI draft */}
        {result.aiDraft && (
          <div
            className="rounded-2xl border bg-card p-4 flex flex-col gap-2"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <div className="flex items-center gap-2">
              <Edit2 size={14} color="hsl(var(--primary))" />
              <p className="text-sm font-semibold text-foreground">AI Draft Reply</p>
            </div>
            <p className="text-xs text-muted-foreground leading-[1.6] line-clamp-4">{result.aiDraft}</p>
          </div>
        )}

        {/* Tags */}
        {result.aiTags && result.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
