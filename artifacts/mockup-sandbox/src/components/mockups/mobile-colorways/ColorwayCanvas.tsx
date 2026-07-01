/**
 * Colorway Canvas
 * Shows all four mobile PWA colorway alternatives side-by-side as phone-sized
 * iframes so the team can compare them at a glance before picking a direction.
 *
 * Access at: /__mockup/preview/mobile-colorways/ColorwayCanvas
 */
import React, { useState } from "react";

interface Variant {
  letter: string;
  name: string;
  tagline: string;
  description: string;
  path: string;
  primaryHex: string;
  accentHex: string;
  contrast: string;
}

const VARIANTS: Variant[] = [
  {
    letter: "A",
    name: "Deep Navy",
    tagline: "Serious · enterprise-grade",
    description:
      "Authoritative navy header anchors the app in a classic logistics blue. Feels trustworthy and familiar to ops teams used to ERP dashboards.",
    path: "mobile-colorways/CaptureVariantA",
    primaryHex: "#1A2B4A",
    accentHex: "#D6E0F0",
    contrast: "12.6 : 1",
  },
  {
    letter: "B",
    name: "Slate Teal",
    tagline: "Fresh · modern logistics",
    description:
      "Muted teal header signals sustainability and forward-thinking supply chain. Distinctive against the sea of blue SaaS tools without being garish.",
    path: "mobile-colorways/CaptureVariantB",
    primaryHex: "#1F6B72",
    accentHex: "#D0EDF0",
    contrast: "5.7 : 1",
  },
  {
    letter: "C",
    name: "Charcoal + Indigo",
    tagline: "Dark-professional · accent-driven",
    description:
      "Near-black header and button with indigo accent chips. The dark primary recedes so content breathes; the indigo appears in info banners, shipment badges, and the active nav state.",
    path: "mobile-colorways/CaptureVariantC",
    primaryHex: "#1E1E2E",
    accentHex: "#3D4FAA",
    contrast: "20+ : 1",
  },
  {
    letter: "D",
    name: "Warm Slate",
    tagline: "Refined purple · lower saturation",
    description:
      "Warm blue-grey header with a muted purple accent — the brand DNA of the current purple but dialled back to a comfortable working tone.",
    path: "mobile-colorways/CaptureVariantD",
    primaryHex: "#2D3748",
    accentHex: "#7C3AED",
    contrast: "10.6 : 1",
  },
];

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

const PHONE_W = 340;
const PHONE_H = 680;

export function ColorwayCanvas() {
  const [selected, setSelected] = useState<string | null>(null);
  const basePath = getBasePath();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0F2F5",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflowX: "auto",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E5EAF0",
          padding: "18px 28px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #1A2B4A 0%, #1F6B72 50%, #4A55B0 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#212833", margin: 0, letterSpacing: -0.2 }}>
              Mobile PWA — Colorway Exploration
            </h1>
            <p style={{ fontSize: 12, color: "#5E687B", margin: "4px 0 0" }}>
              Four alternatives to the current electric-purple (#9000FF) header. Each passes WCAG AA
              (≥ 4.5 : 1) for white label text on the primary background.
            </p>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#9E9FAE",
              background: "#F4F6FA",
              border: "1px solid #E5EAF0",
              padding: "4px 10px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              alignSelf: "flex-start",
            }}
          >
            Canvas mockup · Capture screen
          </span>
        </div>

        {/* Guideline pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {[
            "CSS vars only — no scattered hex values",
            "WCAG AA ≥ 4.5 : 1 on all primary surfaces",
            "Header · button · active nav · accent chips",
            "Click a card to highlight it",
          ].map((pill) => (
            <span
              key={pill}
              style={{
                fontSize: 11,
                color: "#4B5563",
                background: "#EFF2F7",
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* ── Variant grid ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "28px 28px 40px",
          overflowX: "auto",
          alignItems: "flex-start",
        }}
      >
        {VARIANTS.map((v) => {
          const isSelected = selected === v.letter;
          return (
            <div
              key={v.letter}
              onClick={() => setSelected(isSelected ? null : v.letter)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {/* Label card */}
              <div
                style={{
                  background: isSelected ? v.primaryHex : "#fff",
                  border: `2px solid ${isSelected ? v.primaryHex : "#E5EAF0"}`,
                  borderBottom: "none",
                  borderRadius: "14px 14px 0 0",
                  padding: "14px 16px 12px",
                  width: PHONE_W,
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: isSelected ? "rgba(255,255,255,0.2)" : v.primaryHex,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {v.letter}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isSelected ? "#fff" : "#212833",
                        lineHeight: 1.2,
                      }}
                    >
                      Option {v.letter} — {v.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isSelected ? "rgba(255,255,255,0.7)" : "#5E687B",
                        marginTop: 1,
                      }}
                    >
                      {v.tagline}
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: isSelected ? "rgba(255,255,255,0.8)" : "#6B7280",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {v.description}
                </p>
                {/* Swatch row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: v.primaryHex,
                        border: "1.5px solid rgba(0,0,0,0.12)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.65)" : "#9CA3AF", fontFamily: "monospace" }}>
                      {v.primaryHex}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: v.accentHex,
                        border: "1.5px solid rgba(0,0,0,0.12)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, color: isSelected ? "rgba(255,255,255,0.65)" : "#9CA3AF", fontFamily: "monospace" }}>
                      {v.accentHex}
                    </span>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      color: isSelected ? "rgba(255,255,255,0.75)" : "#6B7280",
                      background: isSelected ? "rgba(255,255,255,0.15)" : "#F3F4F6",
                      padding: "2px 7px",
                      borderRadius: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.contrast}
                  </span>
                </div>
              </div>

              {/* Phone iframe */}
              <div
                style={{
                  width: PHONE_W,
                  height: PHONE_H,
                  border: `2px solid ${isSelected ? v.primaryHex : "#E5EAF0"}`,
                  borderTop: `1px solid ${isSelected ? "rgba(255,255,255,0.3)" : "#E5EAF0"}`,
                  borderRadius: "0 0 14px 14px",
                  overflow: "hidden",
                  background: "#fff",
                  transition: "border-color 0.2s",
                  boxShadow: isSelected
                    ? `0 8px 32px ${v.primaryHex}40`
                    : "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <iframe
                  src={`${basePath}/preview/${v.path}`}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  title={`Option ${v.letter} – ${v.name}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Implementation note ─────────────────────────────────────── */}
      <div
        style={{
          margin: "0 28px 40px",
          padding: "14px 18px",
          background: "#fff",
          border: "1px solid #E5EAF0",
          borderRadius: 12,
          fontSize: 12,
          color: "#5E687B",
          lineHeight: 1.7,
          maxWidth: 800,
        }}
      >
        <strong style={{ color: "#212833" }}>Applying the winning colorway</strong> — once a direction is chosen, only
        four CSS variables in{" "}
        <code style={{ background: "#F4F6FA", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>
          artifacts/flowforge-mobile-web/src/index.css
        </code>{" "}
        need updating:{" "}
        <code style={{ background: "#F4F6FA", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>--primary</code>,{" "}
        <code style={{ background: "#F4F6FA", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>--primary-hover</code>,{" "}
        <code style={{ background: "#F4F6FA", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>--accent</code>, and{" "}
        <code style={{ background: "#F4F6FA", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>--accent-foreground</code>.
        No scattered inline hex values, no component-level changes required.
      </div>
    </div>
  );
}

export default ColorwayCanvas;
