import { useRef, useState, useEffect } from "react";
import { useListShipments, useIngestChat, ChatIngestInputChannel } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation, useSearch } from "wouter";
import { X, User, Search, Package, ChevronUp, ChevronDown, Zap, Upload, Paperclip, CheckCircle2 } from "lucide-react";
import { detectChannel } from "@/lib/detectChannel";

type Channel = ChatIngestInputChannel;

const CHANNELS: { id: Channel; label: string; color: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { id: "wechat", label: "WeChat", color: "#09B83E" },
  { id: "imessage", label: "iMessage", color: "#007AFF" },
  { id: "sms", label: "SMS", color: "#5856D6" },
  { id: "email", label: "Email", color: "#FF6B35" },
  { id: "other", label: "Other", color: "#888888" },
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
    await cache.delete(SHARE_FILE_CACHE_KEY);
    return new File([blob], name, { type: mimeType });
  } catch {
    return null;
  }
}

/** Truncate text to a preview length. */
function previewText(text: string, maxLen = 160): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
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
  const [isShareEntry, setIsShareEntry] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);

  const { data: shipments } = useListShipments();
  const { mutate: ingestChat, isPending } = useIngestChat();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viaShare = params.get("via") === "share";
    const sharedText = params.get("text") ?? "";
    const sharedUrl = params.get("url") ?? "";
    const sharedTitle = params.get("title") ?? "";

    if (viaShare || sharedText || sharedUrl || sharedTitle) {
      const composed = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join("\n").trim();
      if (composed) setRawText(composed);

      setIsShareEntry(true);
      const detected = detectChannel(sharedText, sharedUrl, sharedTitle);
      if (detected) {
        setChannel(detected.channel);
        setAutoDetectedLabel(detected.label);
      } else if (sharedText || sharedUrl || sharedTitle || viaShare) {
        setChannel("other");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (viaShare) {
      readSharedFileFromCache().then((file) => {
        if (file) {
          setAttachedFile({ name: file.name, size: file.size, file });
          setIsShareEntry(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    function onServiceWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "share-file") {
        const { name, size, mimeType, buffer } = event.data as {
          type: string; name: string; size: number; mimeType: string; buffer: ArrayBuffer;
        };
        const blob = new Blob([buffer], { type: mimeType });
        const file = new File([blob], name, { type: mimeType });
        setAttachedFile({ name, size, file });
        setIsShareEntry(true);
      }
    }
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    return () => { navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage); };
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
            result, rawText: text, channel,
            senderHint: senderHint.trim(),
            preSelectedShipmentId: selectedShipment?.id ?? null,
          };
          try {
            sessionStorage.setItem("ff_routing_payload", JSON.stringify(payload));
          } catch {
            try {
              sessionStorage.setItem("ff_routing_payload", JSON.stringify({ ...payload, rawText: text.slice(0, 1000) }));
            } catch { /* ignore */ }
          }
          navigate("/routing-result");
        },
        onError: () => { alert("Analysis failed. Please try again."); },
      }
    );
  }

  function handleClear() {
    setRawText("");
    setSenderHint("");
    setAttachedFile(null);
    setSelectedShipment(null);
    setAutoDetectedLabel(null);
    setIsShareEntry(false);
    setShowManualEdit(false);
  }

  const activeCh = CHANNELS.find((c) => c.id === channel)!;

  return (
    <AppShell>
      {/* Header */}
      <div className="status-bar-pad px-5 pb-5 flex items-center justify-between shrink-0 page-header-gradient">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
            alt="FlowForgeIQ"
            style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
          />
          <div>
            <p className="text-white font-bold text-[17px] tracking-tight leading-tight">FlowForgeIQ</p>
            <p className="text-white/55 text-[11px] font-medium tracking-[0.6px] uppercase mt-0.5">Capture</p>
          </div>
        </div>
        {hasContent && (
          <button
            onClick={handleClear}
            className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <X size={16} color="white" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">

        {/* ── Share-entry hero card ── */}
        {isShareEntry && hasContent ? (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "hsl(var(--primary) / 0.3)" }}
          >
            {/* Header bar */}
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.05) 100%)",
                borderBottom: "1px solid hsl(var(--primary) / 0.15)",
              }}
            >
              <CheckCircle2 size={15} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
              <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--primary))" }}>
                Shared content received
              </p>
              {autoDetectedLabel && (
                <span
                  className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: CHANNEL_COLORS[channel],
                    backgroundColor: `${CHANNEL_COLORS[channel]}18`,
                    border: `1px solid ${CHANNEL_COLORS[channel]}40`,
                  }}
                >
                  {autoDetectedLabel}
                </span>
              )}
            </div>

            {/* Content preview */}
            {rawText && (
              <div
                className="px-3.5 py-3"
                style={{ background: "hsl(var(--card))" }}
              >
                <p
                  className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-words"
                  style={{ color: "hsl(var(--foreground) / 0.75)" }}
                >
                  {previewText(rawText)}
                </p>
                {rawText.length > 160 && (
                  <p className="text-[11px] mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {rawText.length} characters total
                  </p>
                )}
              </div>
            )}

            {/* Attached file badge */}
            {attachedFile && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5"
                style={{
                  borderTop: rawText ? "1px solid hsl(var(--border))" : undefined,
                  background: "hsl(var(--card))",
                }}
              >
                <Paperclip size={13} style={{ color: "hsl(var(--primary))" }} />
                <span className="text-[12px] text-foreground font-medium truncate flex-1">{attachedFile.name}</span>
                {attachedFile.size !== undefined && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {(attachedFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
            )}

            {/* Edit toggle */}
            <button
              onClick={() => setShowManualEdit((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium active:opacity-60"
              style={{
                color: "hsl(var(--muted-foreground))",
                borderTop: "1px solid hsl(var(--border))",
                background: "hsl(var(--accent) / 0.5)",
              }}
            >
              {showManualEdit ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showManualEdit ? "Hide editor" : "Edit content"}
            </button>
          </div>
        ) : (
          /* ── Normal (manual paste) AI hint banner ── */
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl card-elevated"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(270 60% 97%) 100%)",
              border: "1px solid hsl(var(--primary) / 0.12)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
              }}
            >
              <Zap size={15} fill="white" strokeWidth={0} />
            </div>
            <p className="text-xs leading-relaxed flex-1" style={{ color: "hsl(var(--accent-foreground))" }}>
              Paste a chat export and AI will extract the shipment details automatically
            </p>
          </div>
        )}

        {/* Channel selector — always shown so user can correct auto-detection */}
        <div className="flex flex-col gap-2">
          <p className="section-label">Source Channel</p>
          <div className="pill-scroll-row">
            {CHANNELS.map(({ id, label, color }) => {
              const active = channel === id;
              return (
                <button
                  key={id}
                  onClick={() => { setChannel(id); setAutoDetectedLabel(null); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full shrink-0 transition-all"
                  style={{
                    border: `1.5px solid ${active ? color : "hsl(var(--border))"}`,
                    backgroundColor: active ? `${color}18` : "hsl(var(--card))",
                    color: active ? color : "hsl(var(--muted-foreground))",
                    fontWeight: active ? 600 : 500,
                    fontSize: 13,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text area — always shown for manual entry; collapsible when share entry */}
        {(!isShareEntry || showManualEdit) && (
          <div className="flex flex-col gap-2">
            <p className="section-label">{isShareEntry ? "Edit Content" : "Paste or Type Message"}</p>
            <div
              className="rounded-2xl bg-card p-3.5 card-elevated"
              style={{ border: "1px solid hsl(var(--border))" }}
            >
              <textarea
                ref={textRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground resize-none outline-none leading-relaxed min-h-[110px]"
                placeholder={`Paste your ${activeCh.label} export or type a message…\n\nE.g.:\n[06/10/26, 10:22] Supplier: Production is 85% done…`}
              />
              {rawText.length > 0 && (
                <p className="text-[11px] text-right mt-1 text-muted-foreground">
                  {rawText.length} chars
                </p>
              )}
            </div>
          </div>
        )}

        {/* File attach — proper upload zone; collapsed in share mode unless no file yet */}
        {(!isShareEntry || !attachedFile) && (
          <div className="flex flex-col gap-2">
            <p className="section-label">Attach File</p>
            {!attachedFile ? (
              <label className="upload-zone flex flex-col items-center justify-center gap-2 py-5 px-4 active:opacity-70">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "hsl(var(--accent))" }}
                >
                  <Upload size={18} color="hsl(var(--primary))" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Choose a file</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Images, PDFs, spreadsheets</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl card-elevated"
                style={{
                  border: "1.5px solid hsl(var(--primary) / 0.3)",
                  backgroundColor: "hsl(var(--accent))",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
                >
                  <Upload size={16} color="hsl(var(--primary))" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{attachedFile.name}</p>
                  {attachedFile.size !== undefined && (
                    <p className="text-xs text-muted-foreground mt-0.5">{(attachedFile.size / 1024).toFixed(0)} KB</p>
                  )}
                </div>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center active:opacity-60"
                  style={{ backgroundColor: "hsl(var(--muted))" }}
                >
                  <X size={13} color="hsl(var(--muted-foreground))" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Optional section divider ─────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
          <span
            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
            style={{ color: "hsl(var(--muted-foreground))", backgroundColor: "hsl(var(--muted))" }}
          >
            Optional
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        </div>

        {/* Sender hint — optional */}
        <div className="flex flex-col gap-2">
          <p className="section-label" style={{ opacity: 0.7 }}>Sender Hint</p>
          <div
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-card"
            style={{ border: "1px solid hsl(var(--border))" }}
          >
            <User size={15} color="hsl(var(--muted-foreground))" />
            <input
              className="flex-1 bg-transparent text-sm outline-none text-foreground"
              value={senderHint}
              onChange={(e) => setSenderHint(e.target.value)}
              placeholder="Supplier or contact name…"
            />
          </div>
        </div>

        {/* Shipment picker — optional */}
        <div className="flex flex-col gap-2">
          <p className="section-label" style={{ opacity: 0.7 }}>Hint to Shipment</p>
          {selectedShipment ? (
            <div
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
              style={{
                backgroundColor: "hsl(var(--accent))",
                border: "1.5px solid hsl(var(--primary) / 0.25)",
              }}
            >
              <Package size={15} color="hsl(var(--primary))" />
              <span className="flex-1 text-sm font-semibold text-foreground truncate">{selectedShipment.name}</span>
              <button
                onClick={() => { setSelectedShipment(null); setShowPicker(false); }}
                className="w-6 h-6 flex items-center justify-center rounded-full active:opacity-60"
                style={{ backgroundColor: "hsl(var(--muted))" }}
              >
                <X size={12} color="hsl(var(--muted-foreground))" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-card w-full active:opacity-75"
              style={{ border: "1px solid hsl(var(--border))" }}
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
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card"
                style={{ border: "1px solid hsl(var(--border))" }}
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
                className="rounded-xl bg-card overflow-hidden"
                style={{ border: "1px solid hsl(var(--border))", maxHeight: 220 }}
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
                        <ChevronDown size={14} color="hsl(var(--muted-foreground))" className="rotate-[-90deg]" />
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
          className="flex items-center justify-center gap-2.5 rounded-[16px] py-4 font-bold text-base btn-press"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)"
              : "hsl(var(--muted))",
            color: canSubmit ? "white" : "hsl(var(--muted-foreground))",
            boxShadow: canSubmit ? "0 4px 16px hsl(var(--primary) / 0.45)" : "none",
            transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease",
          }}
        >
          {isPending ? (
            <>
              <div
                className="w-[18px] h-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0"
              />
              <span>Analysing…</span>
            </>
          ) : (
            <>
              <Zap size={18} fill={canSubmit ? "white" : "hsl(var(--muted-foreground))"} strokeWidth={0} />
              {isShareEntry ? "Analyse with AI" : "Submit for Routing"}
            </>
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground leading-relaxed -mt-2">
          AI extracts details and routes to the best-matching shipment
        </p>

        <div className="h-2" />
      </div>
    </AppShell>
  );
}
