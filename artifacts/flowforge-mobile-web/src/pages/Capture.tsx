import { useRef, useState, useEffect, useCallback } from "react";
import { useListShipments, useIngestChat } from "@workspace/api-client-react";
import type { ChatIngestInputChannel } from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import {
  X,
  User,
  Search,
  Package,
  ChevronUp,
  ChevronDown,
  Zap,
  Upload,
  Paperclip,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { detectChannel } from "@/lib/detectChannel";

type Channel = ChatIngestInputChannel;
type ContactType = "supplier" | "buyer";

const CHANNEL_CONFIGS: { id: Channel; staticLabel?: string; color: string }[] = [
  { id: "whatsapp", staticLabel: "WhatsApp", color: "#25D366" },
  { id: "wechat", staticLabel: "WeChat", color: "#09B83E" },
  { id: "imessage", staticLabel: "iMessage", color: "#007AFF" },
  { id: "sms", staticLabel: "SMS", color: "#5856D6" },
  { id: "email", color: "#FF6B35" },
  { id: "other", color: "#888888" },
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

async function computeDeviceId(): Promise<string> {
  try {
    const raw = `${navigator.userAgent}|${screen.width}|${screen.height}`;
    const buf = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "unknown";
  }
}

/** Truncate text to a preview length. */
function previewText(text: string, maxLen = 160): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

type IngestPreview = {
  routingStatus: "routed" | "needs-review";
  shipmentId?: number | null;
  confidence: number;
  sender?: string | null;
};

type CaptureResult = {
  status: "captured" | "duplicate";
  messageId: number;
  routingStatus: "routed" | "needs_review" | null;
  resolvedContactId: number | null;
  resolvedContactType: "supplier" | "buyer" | null;
};

// ── Stateless capture API call ────────────────────────────────────────────────
async function callCaptureApi(params: {
  senderRaw: string;
  messageText: string;
  channel: Channel;
  contactType: ContactType;
  confidence: number;
  deviceId: string;
  token: string | null;
}): Promise<CaptureResult> {
  const resp = await fetch("/api/capture/mobile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
    },
    body: JSON.stringify({
      senderRaw: params.senderRaw,
      messageText: params.messageText,
      channel: params.channel,
      contactType: params.contactType,
      confidence: params.confidence,
      capturedAt: new Date().toISOString(),
      deviceId: params.deviceId,
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json() as Promise<CaptureResult>;
}

export default function CapturePage() {
  const rawSearch = useSearch();
  const searchParams = new URLSearchParams(rawSearch);
  const preSelectedId = searchParams.get("shipmentId") ? Number(searchParams.get("shipmentId")) : null;
  const preSelectedName = searchParams.get("shipmentName") ?? "";
  const preSelectedChannel = searchParams.get("channel") as Channel | null;

  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [channel, setChannel] = useState<Channel>(preSelectedChannel ?? "whatsapp");
  const [contactType, setContactType] = useState<ContactType>("supplier");
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

  // Share preview state (from ingest-chat auto-trigger on share intent)
  const [sharePreview, setSharePreview] = useState<IngestPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Final capture result
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  // Shipment context at capture time (for deep-linking on success)
  const [resultShipmentId, setResultShipmentId] = useState<number | null>(null);

  const CHANNELS = CHANNEL_CONFIGS.map((cfg) => ({
    ...cfg,
    label: cfg.staticLabel ?? (cfg.id === "email" ? t("capture.channelEmail") : t("capture.channelOther")),
  }));

  const { data: shipments } = useListShipments();
  const { mutate: ingestChat } = useIngestChat();

  // ── Core capture function ────────────────────────────────────────────────────
  const doCapture = useCallback(
    async (text: string, ch: Channel, ct: ContactType, sender: string, shipmentId: number | null) => {
      if (isCapturing) return;
      setIsCapturing(true);
      setResultShipmentId(shipmentId);
      try {
        const [token, deviceId] = await Promise.all([getToken(), computeDeviceId()]);
        const result = await callCaptureApi({
          senderRaw: sender.trim() || "manual-entry",
          messageText: text,
          channel: ch,
          contactType: ct,
          confidence: 0.5,
          deviceId,
          token,
        });
        if (result.resolvedContactType) setContactType(result.resolvedContactType);
        setCaptureResult(result);
      } catch {
        alert(t("capture.submitFailed"));
      } finally {
        setIsCapturing(false);
      }
    },
    [getToken, isCapturing, t],
  );

  // ── Share intent detection — runs once on mount ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viaShare = params.get("via") === "share";
    const sharedText = params.get("text") ?? "";
    const sharedUrl = params.get("url") ?? "";
    const sharedTitle = params.get("title") ?? "";

    const hasShareSignal = viaShare || sharedText || sharedUrl || sharedTitle;
    if (!hasShareSignal) return;

    const composed = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join("\n").trim();
    const detected = detectChannel(sharedText, sharedUrl, sharedTitle);
    const detectedCh: Channel = detected?.channel ?? "other";

    if (composed) setRawText(composed);
    setIsShareEntry(true);
    if (detected) {
      setChannel(detected.channel);
      setAutoDetectedLabel(detected.label);
    } else if (hasShareSignal) {
      setChannel("other");
    }
    window.history.replaceState({}, "", window.location.pathname);

    // Auto-trigger routing PREVIEW (ingest-chat, no DB write) so the user can
    // see the AI-matched shipment and confidence before explicitly confirming.
    if (composed.trim().length > 5) {
      setIsPreviewLoading(true);
      ingestChat(
        { data: { rawText: composed, channel: detectedCh, senderHint: undefined } },
        {
          onSuccess: (result) => {
            setSharePreview({
              routingStatus: result.routingStatus,
              shipmentId: result.shipmentId,
              confidence: result.confidence,
              sender: result.sender,
            });
            setIsPreviewLoading(false);
          },
          onError: () => {
            setIsPreviewLoading(false);
          },
        },
      );
    }

    if (viaShare) {
      readSharedFileFromCache().then((file) => {
        if (file) {
          setAttachedFile({ name: file.name, size: file.size, file });
          setIsShareEntry(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (preSelectedChannel) setChannel(preSelectedChannel);
  }, [preSelectedChannel]);

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

  const canSubmit = (rawText.trim().length > 5 || attachedFile !== null) && !isCapturing;
  const hasContent = rawText.length > 0 || attachedFile !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setAttachedFile({ name: f.name, size: f.size, file: f });
    e.target.value = "";
  }

  // Manual submit (no share preview step)
  function handleSubmit() {
    if (!canSubmit) return;
    const text = rawText.trim() || (attachedFile ? `[Attached: ${attachedFile.name}]` : "");
    doCapture(text, channel, contactType, senderHint, selectedShipment?.id ?? null);
  }

  // Confirm after share preview — use AI-matched shipment if available
  function handleConfirmCapture() {
    const text = rawText.trim() || (attachedFile ? `[Attached: ${attachedFile.name}]` : "");
    if (!text || text.length < 5) return;
    const shipId = sharePreview?.shipmentId ?? selectedShipment?.id ?? null;
    doCapture(text, channel, contactType, "share-entry", shipId);
  }

  function handleClear() {
    setRawText("");
    setSenderHint("");
    setAttachedFile(null);
    setSelectedShipment(null);
    setResultShipmentId(null);
    setAutoDetectedLabel(null);
    setIsShareEntry(false);
    setShowManualEdit(false);
    setSharePreview(null);
    setIsPreviewLoading(false);
    setCaptureResult(null);
  }

  const activeCh = CHANNELS.find((c) => c.id === channel)!;

  // ── Result screen ─────────────────────────────────────────────────────────────
  if (captureResult) {
    const isCaptured = captureResult.status === "captured";
    const isDuplicate = captureResult.status === "duplicate";
    const needsReview = isCaptured && captureResult.routingStatus === "needs_review";
    const isRouted = isCaptured && captureResult.routingStatus === "routed";

    const bannerColor = isRouted ? "#22c55e" : needsReview ? "#f59e0b" : "#3b82f6";
    const BannerIcon = isRouted ? CheckCircle : needsReview ? AlertTriangle : Info;
    const bannerTitle = isRouted
      ? t("capture.resultCaptured")
      : needsReview
        ? t("capture.resultNeedsReview")
        : t("capture.resultDuplicate");
    const bannerDesc = isRouted
      ? t("capture.resultCapturedDesc")
      : needsReview
        ? t("capture.resultNeedsReviewDesc")
        : t("capture.resultDuplicateDesc");

    // For captured+routed: deep-link to matched shipment if available
    const handlePrimaryAction = () => {
      if (isRouted && resultShipmentId) {
        navigate(`/shipment/${resultShipmentId}`);
      } else {
        navigate("/home");
      }
    };
    const primaryLabel =
      isRouted && resultShipmentId ? t("capture.viewShipment") : t("capture.viewInbox");

    return (
      <AppShell>
        <GradientHeader subtitle={t("capture.title")} />

        <div className="flex-1 scroll-area px-4 pt-8 pb-4 flex flex-col gap-5 items-center justify-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${bannerColor}18`, border: `2px solid ${bannerColor}30` }}
          >
            <BannerIcon size={38} style={{ color: bannerColor }} />
          </div>

          <div className="text-center flex flex-col gap-1.5 max-w-[280px]">
            <p className="text-lg font-bold text-foreground">{bannerTitle}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{bannerDesc}</p>
          </div>

          {!isDuplicate && (
            <button
              onClick={handlePrimaryAction}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-[14px] font-semibold text-sm btn-press w-full max-w-[260px]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
                boxShadow: "0 4px 14px hsl(var(--primary) / 0.35)",
                color: "white",
              }}
            >
              {primaryLabel}
            </button>
          )}

          <button
            onClick={handleClear}
            className="px-6 py-3 rounded-[14px] font-medium text-sm btn-press"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            {t("capture.captureAnother")}
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Capture form ──────────────────────────────────────────────────────────────
  return (
    <AppShell>
      {/* Header */}
      <GradientHeader
        subtitle={t("capture.title")}
        right={
          hasContent ? (
            <button
              onClick={handleClear}
              className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <X size={16} color="white" strokeWidth={2.5} />
            </button>
          ) : undefined
        }
      />

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
                {autoDetectedLabel
                  ? t("capture.sharedReceivedFrom", { channel: autoDetectedLabel })
                  : t("capture.sharedReceived")}
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
                    {rawText.length} {t("common.characters")} {t("capture.totalChars")}
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
              {showManualEdit ? t("capture.editToggleHide") : t("capture.editToggleShow")}
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
              {t("capture.aiHint")}
            </p>
          </div>
        )}

        {/* ── Share routing preview card ── */}
        {isShareEntry && (isPreviewLoading || sharePreview) && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            {isPreviewLoading ? (
              <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: "hsl(var(--card))" }}>
                <Loader2 size={15} className="animate-spin" style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
                <p className="text-[12px] text-muted-foreground">{t("capture.analyzing")}</p>
              </div>
            ) : sharePreview ? (
              <div style={{ background: "hsl(var(--card))" }}>
                <div className="px-3.5 py-2.5 flex items-center gap-2.5" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  {sharePreview.routingStatus === "routed" ? (
                    <CheckCircle size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  )}
                  <p className="text-[12px] font-semibold text-foreground flex-1">
                    {sharePreview.routingStatus === "routed"
                      ? t("routing.autoRouted")
                      : t("routing.needsReview")}
                  </p>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: Math.round(sharePreview.confidence * 100) >= 65 ? "#22c55e" : "#f59e0b",
                      backgroundColor: Math.round(sharePreview.confidence * 100) >= 65 ? "#22c55e18" : "#f59e0b18",
                    }}
                  >
                    {Math.round(sharePreview.confidence * 100)}% conf.
                  </span>
                </div>
                {sharePreview.shipmentId && (
                  <div className="px-3.5 py-2 flex items-center gap-2">
                    <Package size={13} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
                    <p className="text-[12px] text-foreground">
                      {t("capture.hintToShipment")} #{sharePreview.shipmentId}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Contact type radio */}
        <div className="flex flex-col gap-2">
          <p className="section-label">{t("capture.contactType")}</p>
          <div className="flex gap-2">
            {(["supplier", "buyer"] as ContactType[]).map((ct) => {
              const active = contactType === ct;
              const label = ct === "supplier" ? t("capture.contactTypeSupplier") : t("capture.contactTypeBuyer");
              return (
                <button
                  key={ct}
                  onClick={() => setContactType(ct)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm transition-all active:opacity-70"
                  style={{
                    border: `1.5px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    backgroundColor: active ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
                    color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Channel selector */}
        <div className="flex flex-col gap-2">
          <p className="section-label">{t("capture.sourceChannel")}</p>
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

        {/* Text area */}
        {(!isShareEntry || showManualEdit) && (
          <div className="flex flex-col gap-2">
            <p className="section-label">{isShareEntry ? t("capture.editContent") : t("capture.pasteOrType")}</p>
            <div
              className="rounded-2xl bg-card p-3.5 card-elevated"
              style={{ border: "1px solid hsl(var(--border))" }}
            >
              <textarea
                ref={textRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground resize-none outline-none leading-relaxed min-h-[110px]"
                placeholder={t("capture.textareaPlaceholder", { channel: activeCh.label })}
              />
              {rawText.length > 0 && (
                <p className="text-[11px] text-right mt-1 text-muted-foreground">
                  {rawText.length} {t("common.characters")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* File attach */}
        {(!isShareEntry || !attachedFile) && (
          <div className="flex flex-col gap-2">
            <p className="section-label">{t("capture.attachFile")}</p>
            {!attachedFile ? (
              <label className="upload-zone flex flex-col items-center justify-center gap-2 py-5 px-4 active:opacity-70">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "hsl(var(--accent))" }}
                >
                  <Upload size={18} color="hsl(var(--primary))" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{t("capture.chooseFile")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("capture.fileTypes")}</p>
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

        {/* Optional divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
          <span
            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
            style={{ color: "hsl(var(--muted-foreground))", backgroundColor: "hsl(var(--muted))" }}
          >
            {t("capture.optional")}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
        </div>

        {/* Sender hint */}
        <div className="flex flex-col gap-2">
          <p className="section-label" style={{ opacity: 0.7 }}>{t("capture.senderHint")}</p>
          <div
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-card"
            style={{ border: "1px solid hsl(var(--border))" }}
          >
            <User size={15} color="hsl(var(--muted-foreground))" />
            <input
              className="flex-1 bg-transparent text-sm outline-none text-foreground"
              value={senderHint}
              onChange={(e) => setSenderHint(e.target.value)}
              placeholder={t("capture.senderPlaceholder")}
            />
          </div>
        </div>

        {/* Shipment picker */}
        <div className="flex flex-col gap-2">
          <p className="section-label" style={{ opacity: 0.7 }}>{t("capture.hintToShipment")}</p>
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
              <span className="flex-1 text-left text-sm text-muted-foreground">{t("capture.searchShipments")}</span>
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
                  placeholder={t("capture.shipSearchPlaceholder")}
                />
              </div>
              <div
                className="rounded-xl bg-card overflow-hidden"
                style={{ border: "1px solid hsl(var(--border))", maxHeight: 220 }}
              >
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-4">{t("common.noShipmentsFound")}</p>
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

        {/* Submit button — "Confirm & Capture" for share entry, "Capture Message" for manual */}
        <button
          onClick={isShareEntry ? handleConfirmCapture : handleSubmit}
          disabled={!canSubmit}
          className="flex items-center justify-center gap-2.5 rounded-[16px] py-4 font-bold text-base btn-press"
          style={{
            background: canSubmit
              ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)"
              : "hsl(var(--muted))",
            boxShadow: canSubmit ? "0 4px 16px hsl(var(--primary) / 0.4)" : "none",
            color: canSubmit ? "white" : "hsl(var(--muted-foreground))",
            opacity: canSubmit ? 1 : 0.7,
          }}
        >
          {isCapturing ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <Zap size={18} fill={canSubmit ? "white" : "hsl(var(--muted-foreground))"} strokeWidth={0} />
              {isShareEntry ? t("capture.confirmCapture") : t("capture.submitCapture")}
            </>
          )}
        </button>

        <div className="h-4" />
      </div>
    </AppShell>
  );
}
