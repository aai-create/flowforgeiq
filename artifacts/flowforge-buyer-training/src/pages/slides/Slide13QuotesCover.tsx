import { motion } from "framer-motion";
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

const PREVIEW_QUOTES = [
  { supplier: "Sunrise Apparel", unit: "$4.20", spread: "+14.2%", winner: true },
  { supplier: "ShiningTex", unit: "$4.35", spread: "+10.9%", winner: false },
  { supplier: "Gold Top Garment", unit: "$4.55", spread: "+6.8%", winner: false },
  { supplier: "Pacific Mills", unit: "$4.80", spread: "+1.4%", low: true },
];

export default function Slide13QuotesCover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0B0F1A 0%, #100C1E 50%, #0B0F1A 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.24) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.09) 1px, transparent 0)", backgroundSize: "3vw 3vw" }} />

      <div style={{ position: "absolute", top: "8vh", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 10 }}>
        <Anim delay={0}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: "999px", padding: "0.6vh 1.6vw", marginBottom: "2vh" }}>
            <span style={{ color: "#C4B5FD", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 500, fontSize: "1.2vw", letterSpacing: "0.06em" }}>Chapter 04</span>
          </div>
        </Anim>
        <Anim delay={0.15}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "7vw", color: "#F1F5F9", lineHeight: 1.0, letterSpacing: "-0.035em", marginBottom: "1.5vh" }}>
            Getting<br /><span style={{ color: "#C4B5FD" }}>Quotes</span>
          </div>
        </Anim>
        <Anim delay={0.3}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.6vw", maxWidth: "46vw", lineHeight: 1.5, marginBottom: "2vh" }}>
            Issue RFQs, collect factory quotes, compare spread vs. target, then convert the winner to a PO.
          </div>
        </Anim>
        <Anim delay={0.42}>
          <div style={{ display: "flex", gap: "1.8vw", alignItems: "center", marginBottom: "3vh" }}>
            {[{ n: "1", label: "RFQ" }, { n: "2", label: "Quotes" }, { n: "3", label: "Compare" }, { n: "4", label: "Convert to PO" }].map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
                <div style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "0.7vw", padding: "0.7vh 1.4vw", display: "flex", alignItems: "center", gap: "0.6vw" }}>
                  <div style={{ width: "1.6vw", height: "1.6vw", borderRadius: "50%", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw" }}>{s.n}</div>
                  <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500 }}>{s.label}</span>
                </div>
                {i < 3 && <span style={{ color: "#4B5563", fontSize: "1.4vw" }}>→</span>}
              </div>
            ))}
          </div>
        </Anim>
      </div>

      {/* Quote comparison table peeking from bottom */}
      <Anim delay={0.6}>
        <div
          style={{
            position: "absolute",
            bottom: "-2vh",
            left: "12vw",
            right: "12vw",
            borderRadius: "1.2vw 1.2vw 0 0",
            overflow: "hidden",
            border: "1px solid rgba(139,92,246,0.3)",
            borderBottom: "none",
            boxShadow: "0 -2vh 5vh rgba(139,92,246,0.18)",
            zIndex: 5,
            background: "#131929",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", padding: "0.8vh 1.5vw", background: "rgba(124,58,237,0.08)", borderBottom: "1px solid rgba(124,58,237,0.12)" }}>
            {["Supplier", "Unit Price", "Spread", ""].map((h) => (
              <div key={h} style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>
          {PREVIEW_QUOTES.map((q, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", padding: "0.9vh 1.5vw", borderBottom: "1px solid rgba(124,58,237,0.06)", alignItems: "center", background: q.winner ? "rgba(34,197,94,0.04)" : "transparent" }}>
              <div style={{ display: "flex", gap: "0.5vw", alignItems: "center" }}>
                <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.05vw", fontWeight: q.winner ? 700 : 400 }}>{q.supplier}</span>
                {q.winner && <span style={{ background: "rgba(34,197,94,0.12)", color: "#86EFAC", borderRadius: "999px", padding: "0.1vh 0.5vw", fontSize: "0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif' }}>Winner</span>}
              </div>
              <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>{q.unit}</div>
              <div style={{ color: q.winner ? "#22C55E" : q.low ? "#F59E0B" : "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>{q.spread}</div>
              {q.winner ? <div style={{ background: "#7C3AED", color: "#F1F5F9", borderRadius: "0.35vw", padding: "0.25vh 0.6vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.8vw", display: "inline-block" }}>Convert</div> : <div />}
            </div>
          ))}
        </div>
      </Anim>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "12vh", background: "linear-gradient(to top, #0B0F1A 0%, transparent 100%)", zIndex: 6, pointerEvents: "none" }} />

      <ChapterNav />
    </div>
  );
}
