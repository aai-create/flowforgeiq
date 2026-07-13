import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

const CHAT_MESSAGES = [
  { from: "Chen Wei", text: "GT-2026-0339 qty 4200 ex factory May 28 samples ready", time: "10:28 AM" },
  { from: "Sunrise AP", text: "SA-2026-0201 production confirmed all on track", time: "10:31 AM" },
  { from: "Pacific Mills", text: "PM-2026-0088 final balance invoice attached $15,600", time: "10:44 AM" },
];

const EXTRACTED_SEQUENCE = [
  { label: "Supplier", value: "Gold Top Garment" },
  { label: "PO", value: "GT-2026-0339" },
  { label: "Stage", value: "Production" },
  { label: "Confidence", value: "94%", green: true },
];

export default function Slide21AICover() {
  const [activeMsg, setActiveMsg] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [routing, setRouting] = useState(false);
  const [routed, setRouted] = useState(false);

  useEffect(() => {
    if (isAllSlides) return;
    const t1 = setTimeout(() => setExtractedCount(1), 1200);
    const t2 = setTimeout(() => setExtractedCount(2), 1800);
    const t3 = setTimeout(() => setExtractedCount(3), 2400);
    const t4 = setTimeout(() => setExtractedCount(4), 3000);
    const t5 = setTimeout(() => setRouting(true), 3600);
    const t6 = setTimeout(() => { setRouted(true); setRouting(false); }, 4400);
    const t7 = setTimeout(() => {
      setActiveMsg(1); setExtractedCount(0); setRouted(false);
    }, 5500);
    return () => [t1, t2, t3, t4, t5, t6, t7].forEach(clearTimeout);
  }, [activeMsg]);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0B0F1A 0%, #120A22 50%, #0B0F1A 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(124,58,237,0.22) 0%, transparent 65%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.1) 1px, transparent 0)", backgroundSize: "3vw 3vw" }} />

      {/* Two-column layout: title left, live demo right */}
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", padding: "0 7vw" }}>
        {/* Left: title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Anim delay={0}>
            <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: "999px", padding: "0.7vh 1.6vw", marginBottom: "3vh" }}>
              <span style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 500, fontSize: "1.2vw", letterSpacing: "0.06em" }}>Chapter 06</span>
            </div>
          </Anim>
          <Anim delay={0.15}>
            <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "6.5vw", color: "#F1F5F9", lineHeight: 1.0, letterSpacing: "-0.035em", marginBottom: "2.5vh" }}>
              AI Doing<br /><span style={{ color: "#A78BFA" }}>the Work</span>
            </div>
          </Anim>
          <Anim delay={0.3}>
            <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.5vw", lineHeight: 1.5, marginBottom: "3vh", maxWidth: "26vw" }}>
              Extraction, routing, and reply drafting — tasks that used to take minutes now happen in seconds.
            </div>
          </Anim>
          <Anim delay={0.45}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8vh" }}>
              {["Chat extraction", "Message routing", "Reply drafts", "Copilot suggestions"].map((label) => (
                <div key={label} style={{ display: "flex", gap: "0.7vw", alignItems: "center" }}>
                  <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#7C3AED", flexShrink: 0 }} />
                  <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.15vw" }}>{label}</span>
                </div>
              ))}
            </div>
          </Anim>
        </div>

        {/* Right: live AI pipeline demo */}
        <Anim delay={0.5}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
            {/* Incoming message */}
            <AnimatePresence mode="wait">
              <motion.div key={activeMsg} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.22)", borderRadius: "0.8vw", padding: "1.2vh 1.5vw" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5vh" }}>
                  <span style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>{CHAT_MESSAGES[activeMsg % CHAT_MESSAGES.length].from}</span>
                  <span style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{CHAT_MESSAGES[activeMsg % CHAT_MESSAGES.length].time}</span>
                </div>
                <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", lineHeight: 1.5 }}>{CHAT_MESSAGES[activeMsg % CHAT_MESSAGES.length].text}</div>
              </motion.div>
            </AnimatePresence>

            {/* Arrow + AI label */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #7C3AED, transparent)" }} />
              <div style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: "999px", padding: "0.3vh 0.8vw", color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "0.85vw", fontWeight: 700, whiteSpace: "nowrap" }}>AI extracting</div>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.6 }}
                style={{ flex: 1, height: "1px", background: "linear-gradient(to right, #7C3AED, transparent)" }} />
            </div>

            {/* Extracted fields */}
            <div style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "0.8vw", overflow: "hidden" }}>
              <div style={{ padding: "0.8vh 1.5vw", borderBottom: "1px solid rgba(124,58,237,0.1)", background: "rgba(124,58,237,0.06)", color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw", textTransform: "uppercase", letterSpacing: "0.06em" }}>Extracted fields</div>
              <div style={{ padding: "0.8vh 1.5vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
                {EXTRACTED_SEQUENCE.map((field, i) => (
                  <AnimatePresence key={`${activeMsg}-${field.label}`}>
                    {i < extractedCount && (
                      <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3vh 0", borderBottom: "1px solid rgba(124,58,237,0.06)" }}>
                        <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>{field.label}</span>
                        <span style={{ color: field.green ? "#22C55E" : "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.95vw" }}>{field.value}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
                {extractedCount < EXTRACTED_SEQUENCE.length && (
                  <div style={{ height: "1.5vh", display: "flex", alignItems: "center", gap: "0.4vw" }}>
                    {[0, 1, 2].map((dot) => (
                      <motion.div key={dot} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8, delay: dot * 0.25 }}
                        style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#7C3AED" }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Routing result */}
            <AnimatePresence>
              {routed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "0.8vw", padding: "1vh 1.5vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#86EFAC", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>✓ Routed to thread</div>
                    <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>GT-2026-0339 · Gold Top Garment</div>
                  </div>
                  <div style={{ background: "#22C55E", color: "#0B0F1A", borderRadius: "0.35vw", padding: "0.3vh 0.8vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.85vw" }}>94% confidence</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Anim>
      </div>

      <ChapterNav />
    </div>
  );
}
