import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import OrdersGridMock from "@/components/OrdersGridMock";

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

export default function Slide09OrdersCover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0B0F1A 0%, #0C1020 50%, #0B0F1A 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.09) 1px, transparent 0)", backgroundSize: "3vw 3vw" }} />

      <div style={{ position: "absolute", top: "8vh", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 10 }}>
        <Anim delay={0}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: "999px", padding: "0.6vh 1.6vw", marginBottom: "2vh" }}>
            <span style={{ color: "#A5B4FC", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 500, fontSize: "1.2vw", letterSpacing: "0.06em" }}>Chapter 03</span>
          </div>
        </Anim>
        <Anim delay={0.15}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "7vw", color: "#F1F5F9", lineHeight: 1.0, letterSpacing: "-0.035em", marginBottom: "1.5vh" }}>
            Tracking<br /><span style={{ color: "#A5B4FC" }}>Orders</span>
          </div>
        </Anim>
        <Anim delay={0.3}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.6vw", maxWidth: "46vw", lineHeight: 1.5, marginBottom: "2vh" }}>
            Supplier PO and buyer PO side by side. Spread calculated. Stage updated. Everything on one grid.
          </div>
        </Anim>
        <Anim delay={0.42}>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", marginBottom: "3vh" }}>
            {[{ label: "Quote", color: "#F59E0B", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" }, { label: "Production", color: "#93C5FD", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)" }, { label: "Ex-Factory", color: "#86EFAC", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)" }].map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "1.2vw" }}>
                <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: "999px", padding: "0.5vh 1.4vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.15vw", fontWeight: 500 }}>{s.label}</div>
                {i < 2 && <span style={{ color: "#4B5563", fontSize: "1.4vw" }}>→</span>}
              </div>
            ))}
          </div>
        </Anim>
      </div>

      {/* Orders grid peeking from bottom */}
      <Anim delay={0.6}>
        <div
          style={{
            position: "absolute",
            bottom: "-2vh",
            left: "7vw",
            right: "7vw",
            height: "36vh",
            borderRadius: "1.2vw 1.2vw 0 0",
            overflow: "hidden",
            border: "1px solid rgba(124,58,237,0.25)",
            borderBottom: "none",
            boxShadow: "0 -2vh 5vh rgba(99,102,241,0.15)",
            zIndex: 5,
          }}
        >
          <OrdersGridMock />
        </div>
      </Anim>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "12vh", background: "linear-gradient(to top, #0B0F1A 0%, transparent 100%)", zIndex: 6, pointerEvents: "none" }} />

      <ChapterNav />
    </div>
  );
}
