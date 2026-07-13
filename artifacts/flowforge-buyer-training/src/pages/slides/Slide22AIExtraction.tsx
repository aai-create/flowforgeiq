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

const CHAT_LINES = [
  "[10:24 AM] Chen Wei: samples ready will send photos this afternoon",
  "[10:26 AM] You: great, which PO is this for?",
  "[10:28 AM] Chen Wei: the F21 denim jacket order GT-2026-0339 qty 4200",
  "[10:29 AM] Chen Wei: ex factory target still May 28",
  "[10:31 AM] Chen Wei: [Photo] front_sample_v2.jpg",
];

const EXTRACTED_FIELDS = [
  { label: "Supplier", value: "Gold Top Garment", delay: 0.1 },
  { label: "Supplier PO", value: "GT-2026-0339", delay: 0.3 },
  { label: "Units", value: "4,200", delay: 0.5 },
  { label: "Stage hint", value: "Production (samples ready)", delay: 0.7 },
  { label: "Ex-Factory", value: "May 28", delay: 0.9 },
  { label: "Confidence", value: "94%", delay: 1.1, highlight: true },
];

export default function Slide22AIExtraction() {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [highlightLines, setHighlightLines] = useState<number[]>([]);

  function process(e: React.MouseEvent) {
    e.stopPropagation();
    if (done) return;
    setProcessing(true);
    setHighlightLines([]);
    // Stagger highlight of chat lines
    [0, 2, 2, 3, 4].forEach((lineIdx, step) => {
      setTimeout(() => setHighlightLines((prev) => [...new Set([...prev, lineIdx])]), step * 250);
    });
    setTimeout(() => { setDone(true); setProcessing(false); }, 1600);
  }

  function reset(e: React.MouseEvent) {
    e.stopPropagation();
    setDone(false);
    setProcessing(false);
    setHighlightLines([]);
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 50% 60% at 100% 50%, rgba(124,58,237,0.1) 0%, transparent 60%)" }} />

      <div style={{ position: "absolute", top: "8vh", left: "7vw", right: "7vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Chapter 06 — AI</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "4vw", color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "0.6vh" }}>Extraction and routing</div>
        </Anim>
        <Anim delay={0.15}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.35vw", marginBottom: "2.5vh" }}>
            Paste a raw chat export — click <strong style={{ color: "#A78BFA" }}>Extract →</strong> to watch AI read it, identify the shipment, and pull out every key field.
          </div>
        </Anim>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.15fr 1fr", gap: "0", alignItems: "center", height: "52vh" }}>
          <Anim delay={0.25}>
            <div style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.22)", borderRadius: "1vw", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(124,58,237,0.1)", background: "rgba(124,58,237,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw", textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw chat export</span>
                <span style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>WeChat · Gold Top</span>
              </div>
              <div style={{ flex: 1, padding: "1.5vh 1.5vw", display: "flex", flexDirection: "column", gap: "0.7vh" }}>
                {CHAT_LINES.map((line, i) => (
                  <motion.div
                    key={i}
                    animate={{ background: highlightLines.includes(i) ? "rgba(124,58,237,0.12)" : "transparent", borderRadius: "0.3vw", padding: "0.2vh 0.4vw" }}
                    transition={{ duration: 0.3 }}
                    style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.05vw", lineHeight: 1.6 }}
                  >
                    {highlightLines.includes(i) ? (
                      <span style={{ color: "#C4B5FD" }}>{line}</span>
                    ) : line}
                  </motion.div>
                ))}
              </div>
            </div>
          </Anim>

          {/* Center process button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1vh" }}>
            <button
              role="button"
              onClick={done ? reset : process}
              disabled={processing}
              style={{
                background: done ? "rgba(34,197,94,0.15)" : processing ? "rgba(124,58,237,0.2)" : "#7C3AED",
                border: `1px solid ${done ? "rgba(34,197,94,0.4)" : "rgba(124,58,237,0.5)"}`,
                color: done ? "#86EFAC" : "#F1F5F9",
                borderRadius: "0.5vw", padding: "1vh 0.6vw", cursor: processing ? "wait" : "pointer",
                fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw",
                writingMode: "vertical-rl", textOrientation: "mixed", transition: "all 0.3s",
                opacity: processing ? 0.7 : 1,
              }}
            >
              {done ? "↺ Reset" : processing ? "…" : "Extract →"}
            </button>
            {processing && (
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }}
                style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#A78BFA" }} />
            )}
          </div>

          <Anim delay={0.42}>
            <div style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "1vw", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(124,58,237,0.1)", background: "rgba(124,58,237,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI extracted fields</span>
                {done && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "rgba(34,197,94,0.12)", color: "#86EFAC", borderRadius: "999px", padding: "0.2vh 0.7vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>Ready to route</motion.span>}
              </div>
              <div style={{ flex: 1, padding: "1.5vh 1.5vw", display: "flex", flexDirection: "column", gap: "1vh" }}>
                {done ? (
                  EXTRACTED_FIELDS.map((field) => (
                    <motion.div
                      key={field.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: field.delay, duration: 0.3 }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5vh 0", borderBottom: "1px solid rgba(124,58,237,0.08)" }}
                    >
                      <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>{field.label}</span>
                      <span style={{ color: field.highlight ? "#22C55E" : "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>{field.value}</span>
                    </motion.div>
                  ))
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1vh" }}>
                    <div style={{ width: "3vw", height: "3vw", borderRadius: "50%", background: "rgba(124,58,237,0.1)", border: "1px dashed rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4B5563", fontSize: "1.5vw" }}>✦</div>
                    <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", textAlign: "center" }}>Click Extract → to process the chat</div>
                  </div>
                )}
              </div>
              {done && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
                  style={{ padding: "0.8vh 1.5vw", borderTop: "1px solid rgba(124,58,237,0.1)", background: "rgba(124,58,237,0.04)", display: "flex", gap: "0.6vw" }}>
                  <div style={{ flex: 1, background: "rgba(124,58,237,0.1)", color: "#A78BFA", borderRadius: "0.35vw", padding: "0.4vh 0", textAlign: "center", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>Review routing</div>
                  <div style={{ flex: 1, background: "#7C3AED", color: "#F1F5F9", borderRadius: "0.35vw", padding: "0.4vh 0", textAlign: "center", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.85vw" }}>Confirm & route ✓</div>
                </motion.div>
              )}
            </div>
          </Anim>
        </div>
      </div>

      <ChapterNav />
    </div>
  );
}
