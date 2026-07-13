import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import InboxMock from "@/components/InboxMock";

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

export default function Slide05InboxCover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0D0818" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0B0F1A 0%, #16082E 50%, #0B0F1A 100%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.28) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.1) 1px, transparent 0)", backgroundSize: "3vw 3vw" }} />

      {/* Foreground text */}
      <div style={{ position: "absolute", top: "8vh", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 10 }}>
        <Anim delay={0}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: "999px", padding: "0.6vh 1.6vw", marginBottom: "2vh" }}>
            <span style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 500, fontSize: "1.2vw", letterSpacing: "0.06em" }}>Chapter 02</span>
          </div>
        </Anim>
        <Anim delay={0.15}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "7vw", color: "#F1F5F9", lineHeight: 1.0, letterSpacing: "-0.035em", marginBottom: "1.5vh" }}>
            Your Unified<br /><span style={{ color: "#A78BFA" }}>Inbox</span>
          </div>
        </Anim>
        <Anim delay={0.3}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.6vw", maxWidth: "42vw", lineHeight: 1.5, marginBottom: "2vh" }}>
            Email, WhatsApp, WeChat, iMessage, and SMS — one thread per supplier, zero switching.
          </div>
        </Anim>
        <Anim delay={0.45}>
          <div style={{ display: "flex", gap: "1vw", marginBottom: "3vh" }}>
            {["Email", "WhatsApp", "WeChat", "iMessage", "SMS"].map((ch) => (
              <div key={ch} style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#A78BFA", borderRadius: "999px", padding: "0.5vh 1.3vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500 }}>{ch}</div>
            ))}
          </div>
        </Anim>
      </div>

      {/* Inbox mock peek from bottom */}
      <Anim delay={0.6}>
        <div
          style={{
            position: "absolute",
            bottom: "-3vh",
            left: "10vw",
            right: "10vw",
            height: "42vh",
            borderRadius: "1.2vw 1.2vw 0 0",
            overflow: "hidden",
            border: "1px solid rgba(124,58,237,0.3)",
            borderBottom: "none",
            boxShadow: "0 -2vh 6vh rgba(124,58,237,0.2)",
            zIndex: 5,
          }}
        >
          <InboxMock />
        </div>
      </Anim>

      {/* Gradient fade over the bottom of inbox mock so it blends */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "15vh", background: "linear-gradient(to top, #0B0F1A 0%, transparent 100%)", zIndex: 6, pointerEvents: "none" }} />

      <ChapterNav />
    </div>
  );
}
