/**
 * CapturePreview
 * Self-contained static mockup of the FlowForge Mobile "Capture" screen.
 *
 * Reads exactly four CSS custom properties so colorway wrappers can set them
 * on any ancestor div and have them cascade throughout:
 *   --primary          header background + submit button + active nav icon colour
 *   --primary-hover    (reserved for interactive hover; not animated in the static mockup)
 *   --accent           chip / info-banner background
 *   --accent-foreground chip / info-banner text colour
 *
 * Everything else uses static neutral values so the four tokens are the only
 * knobs that change between variants — no scattered inline hex for theme colours.
 */
import React, { useState } from "react";

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { id: "wechat",   label: "WeChat",   color: "#09B83E" },
  { id: "imessage", label: "iMessage", color: "#007AFF" },
  { id: "sms",      label: "SMS",      color: "#5856D6" },
  { id: "email",    label: "Email",    color: "#FF6B35" },
];

/* ── Tiny utility SVGs ────────────────────────────────────────────── */
function ZapSvg({ color = "#fff", size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function UserSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function SearchSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function ChevronDownSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function PackageSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" x2="12" y1="22.08" y2="12" />
    </svg>
  );
}
function BatterySvg() {
  return (
    <div style={{ width: 20, height: 11, border: "1.5px solid rgba(255,255,255,0.7)", borderRadius: 3, position: "relative" }}>
      <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 3, height: 5, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
      <div style={{ position: "absolute", inset: 2, background: "rgba(255,255,255,0.85)", borderRadius: 0.5 }} />
    </div>
  );
}

export function CapturePreview() {
  const [activeChannel, setActiveChannel] = useState("whatsapp");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F5F7FA",
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Status bar + header ────────────────────────────────────── */}
      <div
        style={{
          background: "hsl(var(--primary))",
          paddingTop: 32,
          paddingBottom: 16,
          paddingLeft: 20,
          paddingRight: 20,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: -0.4 }}>
            FlowForgeIQ
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2, letterSpacing: 0.4 }}>
            Capture
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 4 }}>
          <BatterySvg />
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >

        {/* ── Accent info banner (consumes --accent + --accent-foreground) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            background: "hsl(var(--accent))",
          }}
        >
          <ZapSvg color="hsl(var(--primary))" size={12} />
          <span style={{ fontSize: 11, color: "hsl(var(--accent-foreground))", lineHeight: 1.4 }}>
            Paste a chat export and AI will extract the shipment details
          </span>
        </div>

        {/* ── Channel selector ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>Source Channel</SectionLabel>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {CHANNELS.map(({ id, label, color }) => {
              const active = activeChannel === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveChannel(id)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${active ? color : "#E2E8F0"}`,
                    background: active ? `${color}18` : "#fff",
                    color: active ? color : "#6B7280",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Paste area ───────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>Paste or Type Message</SectionLabel>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: "#fff",
              padding: 12,
              minHeight: 80,
            }}
          >
            <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
              Paste your WhatsApp export or type a message…{"\n\n"}E.g.:{"\n"}
              [06/10/26, 10:22] Supplier: Production is 85% done…
            </div>
          </div>
        </div>

        {/* ── Sender hint ──────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>Sender Hint <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></SectionLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              background: "#fff",
            }}
          >
            <UserSvg />
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>Supplier or contact name…</span>
          </div>
        </div>

        {/* ── Shipment picker (selected state — shows --accent chip) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>Shipment <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — helps routing)</span></SectionLabel>
          {/* Selected state: accent background + border that echoes --primary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1.5px solid hsl(var(--primary) / 0.35)",
              background: "hsl(var(--accent))",
            }}
          >
            <PackageSvg />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              PO-0142 — Stainless Serving Fork
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </div>
        </div>

        {/* ── Accent chip row (supplier badge + status badge) ───────── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 999,
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              fontWeight: 500,
            }}
          >
            Guangzhou Metalworks
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 999,
              background: "#dcfce7",
              color: "#166534",
              fontWeight: 500,
            }}
          >
            On Track
          </span>
        </div>

        {/* ── Submit button (consumes --primary) ───────────────────── */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "13px 20px",
            borderRadius: 12,
            border: "none",
            background: "hsl(var(--primary))",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: -0.1,
          }}
        >
          <ZapSvg size={17} />
          Submit for Routing
        </button>

        <div style={{ fontSize: 11, textAlign: "center", color: "#9CA3AF", lineHeight: 1.5, marginTop: -6 }}>
          AI will extract details and route to the best-matching shipment
        </div>
      </div>

      {/* ── Bottom Nav (active tab uses --primary) ────────────────── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid #E2E8F0",
          background: "#fff",
          paddingBottom: 18,
          display: "flex",
        }}
      >
        {(
          [
            { label: "Home",     active: false },
            { label: "Capture",  active: true  },
            { label: "Docs",     active: false },
            { label: "Settings", active: false },
          ] as const
        ).map(({ label, active }) => (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              paddingTop: 10,
              color: active ? "hsl(var(--primary))" : "#9CA3AF",
              cursor: "pointer",
            }}
          >
            {/* Simple filled square as icon placeholder */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: active ? 6 : 4,
                background: active ? "hsl(var(--accent))" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {active && <ZapSvg color="hsl(var(--primary))" size={12} />}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", letterSpacing: 1.1, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

export default CapturePreview;
