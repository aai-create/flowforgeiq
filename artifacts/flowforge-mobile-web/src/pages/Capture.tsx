import { useRef, useState, useEffect } from "react";
import { useListShipments, useIngestChat, ChatIngestInputChannel } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation, useSearch } from "wouter";
import { X, User, Search, Package, ChevronUp, ChevronDown, Zap, Paperclip } from "lucide-react";
import { detectChannel } from "@/lib/detectChannel";

type Channel = ChatIngestInputChannel;

const CHANNELS: { id: Channel; label: string; color: string; emoji: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", emoji: "📱" },
  { id: "wechat", label: "WeChat", color: "#09B83E", emoji: "💬" },
  { id: "imessage", label: "iMessage", color: "#007AFF", emoji: "🔵" },
  { id: "sms", label: "SMS", color: "#5856D6", emoji: "✉️" },
  { id: "email", label: "Email", color: "#FF6B35", emoji: "📧" },
  { id: "other", label: "Other", color: "#888888", emoji: "📝" },
];

const CHANNEL_COLORS: Record<Channel, string> = {
  whatsapp: "#25D366",
  wechat: "#09B83E",
  imessage: "#007AFF",
  sms: "#5856D6",
  email: "#FF6B35",
  other: "#888888",
};

const SHARE_FILE_CACHE_KEY = "/__ff_share_file";
const SHARE_CACHE_NAME = "flowforge-mobile-v1";

/** Read a shared file from Cache API (written by the service worker POST handler). */
async function readSharedFileFromCache(): Promise<File | null> {
  if (!("caches" in self)) return null;
  try {
    const cache = await caches.open(SHARE_CACHE_NAME);
    const response = await cache.match(SHARE_FILE_CACHE_KEY);
    if (!response) return null;
    const blob = await response.blob();
    const rawName = response.headers.get("X-File-Name") ?? "shared-file";
    const name = decodeURIComponent(rawName);
    const mimeType = response.headers.get("Content-Type") ?? blob.type;
    // Clear from cache so refresh is a no-op
    await cache.delete(SHARE_FILE_CACHE_KEY);
    return new File([blob], name, { type: mimeType });
  } catch {
    return null;
  }
}

export default function CapturePage() {
  const rawSearch = useSearch();
  const searchParams = new URLSearchParams(rawSearch);
  const preSelectedId = searchParams.get("shipmentId") ? Number(searchParams.get("shipmentId")) : null;
  const preSelectedName = searchParams.get("shipmentName") ?? "";

  const [, navigate] = useLocation();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [rawText, setRawText] = useState("");
  const [senderHint, setSenderHint] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<{ id: number; name: string } | null>(
    preSelectedId ? { id: preSelectedId, name: preSelectedName || `Shipment #${preSelectedId}` } : null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [shipSearch, setShipSearch] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; size?: number; file?: File } | null>(null);
  const [autoDetectedLabel, setAutoDetectedLabel] = useState<string | null>(null);

  const { data: shipments } = useListShipments();
  const { mutate: ingestChat, isPending } = useIngestChat();

  // Read incoming share data on mount (GET params from share target or SW redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viaShare = params.get("via") === "share";
    const sharedText = params.get("text") ?? "";
    const sharedUrl = params.get("url") ?? "";
    const sharedTitle = params.get("title") ?? "";

    if (viaShare || sharedText || sharedUrl || sharedTitle) {
      // Compose pre-fill text from title + text + url
      const composed = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join("\n").trim();
      if (composed) setRawText(composed);

      // Auto-detect channel; fall back to "other" whenever share params are present
      // but no heuristic matches. This covers both iOS GET shares (no via=share param)
      // and Android POST-redirected shares (via=share present).
      const detected = detectChannel(sharedText, sharedUrl, sharedTitle);
      if (detected) {
        setChannel(detected.channel);
        setAutoDetectedLabel(detected.label);
      } else if (sharedText || sharedUrl || sharedTitle || viaShare) {
        setChannel("other");
        // No auto-detected label pill when channel is unknown — just let user pick
      }

      // Clean up URL so refresh doesn't re-inject data
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Also check Cache API for a file that the service worker persisted (cold-start path)
    if (viaShare) {
      readSharedFileFromCache().then((file) => {
        if (file) {
          setAttachedFile({ name: file.name, size: file.size, file });
        }
      });
    }
  }, []);

  // Listen for file messages broadcast directly from the service worker (warm/fast path)
  useEffect(() => {
    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "share-file") {
        const { name, size, mimeType, buffer } = event.data as {
          type: string;
          name: string;
          size: number;
          mimeType: string;
          buffer: ArrayBuffer;
        };
        const blob = new Blob([buffer], { type: mimeType });
        const file = new File([blob], name, { type: mimeType });
        setAttachedFile({ name, size, file });
      }
    }
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    if (preSelectedId) {
      setSelectedShipment({ id: preSelectedId, name: preSelectedName || `Shipment #${preSelectedId}` });
    }
  }, [preSelectedId, preSelectedName]);

  const filtered = (shipments ?? [])
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
    .slice(0, 20);

  const canSubmit = (rawText.trim().length > 5 || attachedFile !== null) && !isPending;
  const hasContent = rawText.length > 0 || attachedFile !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setAttachedFile({ name: f.name, size: f.size, file: f });
    e.target.value = "";
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const text = rawText.trim() || (attachedFile ? `[Attached: ${attachedFile.name}]` : "");
    ingestChat(
      { data: { rawText: text, channel, senderHint: senderHint.trim() || undefined } },
      {
        onSuccess: (result) => {
          const payload = {
            result,
            rawText: text,
            channel,
            senderHint: senderHint.trim(),
            preSelectedShipmentId: selectedShipment?.id ?? null,
          };
          try {
            sessionStorage.setItem("ff_routing_payload", JSON.stringify(payload));
          } catch {
            try {
              sessionStorage.setItem(
                "ff_routing_payload",
                JSON.stringify({ ...payload, rawText: text.slice(0, 1000) })
              );
            } catch {
              // ignore
            }
          }
          navigate("/routing-result");
        },
        onError: () => {
          alert("Analysis failed. Please try again.");
        },
      }
    );
  }

  function handleClear() {
    setRawText("");
    setSenderHint("");
    setAttachedFile(null);
    setSelectedShipment(null);
    setAutoDetectedLabel(null);
  }

  const activeCh = CHANNELS.find((c) => c.id === channel)!;

  return (
    <AppShell>
      <div
        className="status-bar-pad px-5 pb-4 flex items-center justify-between shrink-0"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
          boxShadow: "0 2px 12px hsl(var(--primary) / 0.35)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
            alt="FlowForgeIQ"
            style={{ width: 28, height: 28, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
          />
          <div>
            <p className="text-white font-bold text-lg tracking-tight leading-tight">FlowForgeIQ</p>
            <p className="text-white/60 text-[10px] tracking-[0.8px] uppercase mt-0.5">Capture</p>
          </div>
        </div>
        {hasContent && (
          <button onClick={handleClear} className="p-1 text-white/80">
            <X size={22} />
          </button>
        )}
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">
        {/* AI hint banner */}
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background: "hsl(var(--accent))",
            border: "1px solid hsl(var(--primary) / 0.15)",
          }}
        >
          <Zap size={13} fill="hsl(var(--primary))" strokeWidth={0} className="mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed" style={{ color: "hsl(var(--accent-foreground))" }}>
            Paste a chat export and AI will extract the shipment details
          </p>
        </div>

        {/* Auto-detected channel pill */}
        {autoDetectedLabel && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full self-start"
            style={{
              backgroundColor: `${CHANNEL_COLORS[channel]}18`,
              border: `1px solid ${CHANNEL_COLORS[channel]}40`,
            }}
          >
            <span
              className="text-[12px] font-semibold"
              style={{ color: CHANNEL_COLORS[channel] }}
            >
              Shared from {autoDetectedLabel}
            </span>
            <button
              onClick={() => setAutoDetectedLabel(null)}
              className="ml-0.5 opacity-60 hover:opacity-100"
              style={{ color: CHANNEL_COLORS[channel] }}
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Channel selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Source Channel</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
            {CHANNELS.map(({ id, label, color }) => {
              const active = channel === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setChannel(id);
                    setAutoDetectedLabel(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border-[1.5px] shrink-0 transition-all"
                  style={{
                    borderColor: active ? color : "hsl(var(--border))",
                    backgroundColor: active ? `${color}18` : "hsl(var(--card))",
                    color: active ? color : "hsl(var(--muted-foreground))",
                  }}
                >
                  <span className="text-[13px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text area */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Paste or Type Message</p>
          <div
            className="rounded-xl border bg-card p-3.5"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <textarea
              ref={textRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground resize-none outline-none leading-relaxed min-h-[110px]"
              placeholder={`Paste your ${activeCh.label} export or type a message…\n\nE.g.:\n[06/10/26, 10:22] Supplier: Production is 85% done…`}
              style={{ color: "hsl(var(--foreground))" }}
            />
            {rawText.length > 0 && (
              <p className="text-[11px] text-right mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {rawText.length} chars
              </p>
            )}
          </div>
        </div>

        {/* File attach */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Attach</p>
          <label
            className="flex items-center justify-center gap-2 border rounded-xl py-3 bg-card cursor-pointer active:opacity-70"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <Paperclip size={16} color="hsl(var(--primary))" />
            <span className="text-sm font-medium text-foreground">
              {attachedFile ? attachedFile.name : "Choose file"}
            </span>
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
          {attachedFile && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ borderColor: "hsl(var(--primary))40" }}
            >
              <Paperclip size={14} color="hsl(var(--primary))" />
              <span className="flex-1 text-sm truncate text-foreground">{attachedFile.name}</span>
              {attachedFile.size !== undefined && (
                <span className="text-xs text-muted-foreground">{(attachedFile.size / 1024).toFixed(0)} KB</span>
              )}
              <button onClick={() => setAttachedFile(null)}>
                <X size={14} color="hsl(var(--muted-foreground))" />
              </button>
            </div>
          )}
        </div>

        {/* Sender hint */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">
            Sender Hint <span className="font-normal normal-case">(optional)</span>
          </p>
          <div
            className="flex items-center gap-2.5 px-3 py-3 rounded-xl border bg-card"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <User size={16} color="hsl(var(--muted-foreground))" />
            <input
              className="flex-1 bg-transparent text-sm outline-none text-foreground"
              value={senderHint}
              onChange={(e) => setSenderHint(e.target.value)}
              placeholder="Supplier or contact name…"
            />
          </div>
        </div>

        {/* Shipment picker */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">
            Shipment <span className="font-normal normal-case">(optional — helps routing)</span>
          </p>
          {selectedShipment ? (
            <div
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl border-[1.5px]"
              style={{ backgroundColor: "hsl(var(--accent))", borderColor: "hsl(var(--primary))60" }}
            >
              <Package size={15} color="hsl(var(--primary))" />
              <span className="flex-1 text-sm font-medium text-foreground truncate">{selectedShipment.name}</span>
              <button onClick={() => { setSelectedShipment(null); setShowPicker(false); }}>
                <X size={14} color="hsl(var(--muted-foreground))" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl border bg-card w-full"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <Search size={15} color="hsl(var(--muted-foreground))" />
              <span className="flex-1 text-left text-sm text-muted-foreground">Search shipments…</span>
              {showPicker ? (
                <ChevronUp size={15} color="hsl(var(--muted-foreground))" />
              ) : (
                <ChevronDown size={15} color="hsl(var(--muted-foreground))" />
              )}
            </button>
          )}

          {showPicker && !selectedShipment && (
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-card"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <Search size={14} color="hsl(var(--muted-foreground))" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-sm outline-none text-foreground"
                  value={shipSearch}
                  onChange={(e) => setShipSearch(e.target.value)}
                  placeholder="PO number, product, supplier…"
                />
              </div>
              <div
                className="rounded-xl border bg-card overflow-hidden"
                style={{ borderColor: "hsl(var(--border))", maxHeight: 220 }}
              >
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-4">No shipments found</p>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                    {filtered.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedShipment({ id: s.id, name: `PO ${s.poNumber} — ${s.product}` });
                          setShowPicker(false);
                          setShipSearch("");
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-3 active:opacity-60"
                        style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : undefined }}
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">PO {s.poNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {s.product}{s.supplierName ? ` · ${s.supplierName}` : ""}
                          </p>
                        </div>
                        <ChevronDown
                          size={14}
                          color="hsl(var(--muted-foreground))"
                          className="rotate-[-90deg]"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center justify-center gap-2.5 rounded-[14px] py-4 transition-all font-semibold text-base"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)"
              : "hsl(var(--muted))",
            color: canSubmit ? "white" : "hsl(var(--muted-foreground))",
            opacity: isPending ? 0.7 : 1,
            boxShadow: canSubmit ? "0 4px 14px hsl(var(--primary) / 0.4)" : "none",
          }}
        >
          {isPending ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <Zap
                size={18}
                fill={canSubmit ? "white" : "hsl(var(--muted-foreground))"}
                strokeWidth={0}
              />
              Submit for Routing
            </>
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground leading-[1.5] -mt-2">
          AI will extract details and route to the best-matching shipment
        </p>

        <div className="h-2" />
      </div>
    </AppShell>
  );
}
