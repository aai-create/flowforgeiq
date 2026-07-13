import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

const QUOTES = [
  { supplier: "Sunrise Apparel", unit: "$4.20", total: "$17,640", lead: "28 days", spreadPct: 14.2, spreadLabel: "+14.2%" },
  { supplier: "ShiningTex", unit: "$4.35", total: "$18,270", lead: "30 days", spreadPct: 10.9, spreadLabel: "+10.9%" },
  { supplier: "Gold Top Garment", unit: "$4.55", total: "$19,110", lead: "32 days", spreadPct: 6.8, spreadLabel: "+6.8%" },
  { supplier: "Pacific Mills", unit: "$4.80", total: "$20,160", lead: "35 days", spreadPct: 1.4, spreadLabel: "+1.4%" },
];

export default function Slide15CompareQuotes() {
  const [selected, setSelected] = useState<number | null>(null);
  const [converted, setConverted] = useState(false);

  function selectRow(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(i);
    setConverted(false);
  }

  function convert(e: React.MouseEvent) {
    e.stopPropagation();
    setConverted(true);
  }

  const winner = selected !== null ? QUOTES[selected] : null;
  const spreadColor = (pct: number) => pct >= 10 ? "#22C55E" : pct >= 5 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />

      <div style={{ position: "absolute", top: "8vh", left: "7vw", right: "7vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Chapter 04 — Quotes</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "4vw", color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "0.6vh" }}>Comparing factory quotes</div>
        </Anim>
        <Anim delay={0.15}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.35vw", marginBottom: "2.5vh" }}>
            Click any row to select a winner. Spread is calculated automatically — pick the best margin.
          </div>
        </Anim>

        <Anim delay={0.25}>
          <div style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "1vw", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 1fr", padding: "1vh 1.5vw", borderBottom: "1px solid rgba(124,58,237,0.15)", background: "rgba(124,58,237,0.06)" }}>
              {["Supplier", "Unit Price", "Total (USD)", "Lead Time", "Spread", "Action"].map((h) => (
                <div key={h} style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
              ))}
            </div>

            {QUOTES.map((q, i) => {
              const isSelected = selected === i;
              return (
                <motion.div
                  key={q.supplier}
                  layout
                  role="button"
                  tabIndex={0}
                  onClick={(e) => selectRow(i, e)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectRow(i, e as unknown as React.MouseEvent); }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 1fr",
                    padding: "1.1vh 1.5vw",
                    borderBottom: "1px solid rgba(124,58,237,0.08)",
                    alignItems: "center",
                    cursor: "pointer",
                    background: isSelected ? "rgba(34,197,94,0.05)" : "transparent",
                    borderLeft: isSelected ? "3px solid #22C55E" : "3px solid transparent",
                    transition: "background 0.2s, border-left 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6vw" }}>
                    <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.05vw", fontWeight: isSelected ? 700 : 400 }}>{q.supplier}</span>
                    {isSelected && (
                      <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} style={{ background: "rgba(34,197,94,0.15)", color: "#86EFAC", borderRadius: "999px", padding: "0.1vh 0.5vw", fontSize: "0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif' }}>Selected</motion.span>
                    )}
                  </div>
                  <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>{q.unit}</div>
                  <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>{q.total}</div>
                  <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>{q.lead}</div>
                  <div style={{ color: spreadColor(q.spreadPct), fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.05vw" }}>{q.spreadLabel}</div>
                  <div>
                    {isSelected && !converted && (
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        role="button"
                        onClick={convert}
                        style={{ background: "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.4vw", padding: "0.35vh 0.7vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.85vw", cursor: "pointer", whiteSpace: "nowrap" }}
                      >Convert to PO →</motion.button>
                    )}
                    {isSelected && converted && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "#22C55E", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.85vw" }}>✓ PO created</motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Anim>

        <Anim delay={0.4}>
          <div style={{ marginTop: "2vh", display: "flex", gap: "2vw", alignItems: "center" }}>
            <LegendDot color="#22C55E" label="≥10% spread — strong margin" />
            <LegendDot color="#F59E0B" label="5–9% — acceptable" />
            <LegendDot color="#EF4444" label="<5% — tight, review before approving" />
            {winner && !converted && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ marginLeft: "auto", color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>
                ← {winner.supplier} selected · {winner.spreadLabel} spread · click "Convert to PO →"
              </motion.div>
            )}
            {converted && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ marginLeft: "auto", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "0.5vw", padding: "0.4vh 1vw", color: "#86EFAC", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>
                ✓ Shipment created — {winner?.supplier}
              </motion.div>
            )}
          </div>
        </Anim>
      </div>

      <ChapterNav />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
      <div style={{ width: "0.65vw", height: "0.65vw", borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>{label}</span>
    </div>
  );
}
