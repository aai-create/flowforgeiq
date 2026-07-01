import { useRef, useState, useEffect } from "react";
import { useListShipments, useIngestChat } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation, useSearch } from "wouter";
import { X, User, Search, Package, ChevronUp, ChevronDown, Zap, Paperclip } from "lucide-react";

type Channel = "whatsapp" | "wechat" | "imessage" | "sms" | "email";

const CHANNELS: { id: Channel; label: string; color: string; emoji: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", emoji: "📱" },
  { id: "wechat", label: "WeChat", color: "#09B83E", emoji: "💬" },
  { id: "imessage", label: "iMessage", color: "#007AFF", emoji: "🔵" },
  { id: "sms", label: "SMS", color: "#5856D6", emoji: "✉️" },
  { id: "email", label: "Email", color: "#FF6B35", emoji: "📧" },
];

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
  const [attachedFile, setAttachedFile] = useState<{ name: string; size?: number } | null>(null);

  const { data: shipments } = useListShipments();
  const { mutate: ingestChat, isPending } = useIngestChat();

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
      return s.poNumber?.toLowerCase().includes(q) || s.product?.toLowerCase().includes(q) || s.supplierName?.toLowerCase().includes(q);
    })
    .slice(0, 20);

  const canSubmit = (rawText.trim().length > 5 || attachedFile !== null) && !isPending;
  const hasContent = rawText.length > 0 || attachedFile !== null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setAttachedFile({ name: f.name, size: f.size });
    e.target.value = "";
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const text = rawText.trim() || (attachedFile ? `[Attached: ${attachedFile.name}]` : "");
    ingestChat(
      { data: { rawText: text, channel: channel as any, senderHint: senderHint.trim() || undefined } },
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
            // sessionStorage full — fall back gracefully by truncating rawText
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
  }

  const activeCh = CHANNELS.find((c) => c.id === channel)!;

  return (
    <AppShell>
      <div
        className="status-bar-pad px-5 pb-4 flex items-start justify-between shrink-0"
        style={{ background: "hsl(var(--primary))" }}
      >
        <div>
          <p className="text-white font-bold text-xl tracking-tight">FlowForge</p>
          <p className="text-white/70 text-xs mt-0.5 tracking-wide">Capture</p>
        </div>
        {hasContent && (
          <button onClick={handleClear} className="mt-1 p-1 text-white/80">
            <X size={22} />
          </button>
        )}
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">
        {/* Channel selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Source Channel</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
            {CHANNELS.map(({ id, label, color }) => {
              const active = channel === id;
              return (
                <button
                  key={id}
                  onClick={() => setChannel(id)}
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
              {attachedFile.size && (
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
              {showPicker ? <ChevronUp size={15} color="hsl(var(--muted-foreground))" /> : <ChevronDown size={15} color="hsl(var(--muted-foreground))" />}
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
          className="flex items-center justify-center gap-2.5 rounded-xl py-4 transition-opacity font-semibold text-base"
          style={{
            backgroundColor: canSubmit ? "hsl(var(--primary))" : "hsl(var(--muted))",
            color: canSubmit ? "white" : "hsl(var(--muted-foreground))",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <Zap size={18} fill={canSubmit ? "white" : "hsl(var(--muted-foreground))"} strokeWidth={0} />
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
