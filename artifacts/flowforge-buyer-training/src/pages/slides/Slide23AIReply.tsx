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

type State = "idle" | "editing" | "sent" | "advanced";

export default function Slide23AIReply() {
  const [state, setState] = useState<State>("idle");
  const [draftText, setDraftText] = useState(
    "Hi Chen Wei,\n\nThanks for the update — glad to hear samples are ready for PO GT-2026-0339. Please send the photos across when ready.\n\nCan you confirm the ex-factory date is still May 28? We have a shipment window to hit on our end.\n\nBest,\nSarah"
  );

  function handleSend(e: React.MouseEvent) {
    e.stopPropagation();
    setState("sent");
  }

  function handleAdvance(e: React.MouseEvent) {
    e.stopPropagation();
    setState("advanced");
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    setState("idle");
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 65% 65% at 100% 100%, rgba(124,58,237,0.12) 0%, transparent 60%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "30vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Chapter 06 — AI</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "3.8vw", color: "#F1F5F9", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: "2vh" }}>
            AI-drafted<br /><span style={{ color: "#A78BFA" }}>replies</span>
          </div>
        </Anim>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.3vh" }}>
          {[
            { icon: "✦", text: "Pre-filled using shipment context and message history" },
            { icon: "✦", text: "Mirrors your name and the tone of previous replies" },
            { icon: "✦", text: "Edit any part before sending — AI writes, you approve" },
            { icon: "✦", text: "Sending can advance the stage in the same action" },
          ].map((item) => (
            <Anim key={item.text} delay={0.2}>
              <div style={{ display: "flex", gap: "0.8vw", alignItems: "flex-start", background: "#131929", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "0.6vw", padding: "1vh 1.2vw" }}>
                <span style={{ color: "#7C3AED", fontSize: "0.85vw", marginTop: "0.2vh" }}>{item.icon}</span>
                <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.1vw", lineHeight: 1.45 }}>{item.text}</span>
              </div>
            </Anim>
          ))}
        </div>
      </div>

      <Anim delay={0.28}>
        <div style={{ position: "absolute", right: "5vw", top: "50%", transform: "translateY(-50%)", width: "50vw" }}>
          <AnimatePresence mode="wait">
            {state === "advanced" ? (
              <motion.div key="advanced" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                style={{ background: "#131929", border: "1px solid rgba(34,197,94,0.35)", borderRadius: "1vw", padding: "4vh 3vw", textAlign: "center" }}>
                <div style={{ fontSize: "3vw", marginBottom: "1.5vh" }}>✅</div>
                <div style={{ color: "#86EFAC", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "2.5vw", marginBottom: "0.8vh" }}>Reply sent &amp; stage advanced</div>
                <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.3vw", marginBottom: "2vh" }}>
                  GT-2026-0339 · Gold Top Garment<br />
                  <span style={{ color: "#A78BFA" }}>Production</span> → <span style={{ color: "#86EFAC" }}>Ex-Factory</span>
                </div>
                <div style={{ display: "flex", gap: "1vw", justifyContent: "center" }}>
                  <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "0.5vw", padding: "0.6vh 1.5vw", color: "#86EFAC", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>✓ Orders grid updated</div>
                  <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "0.5vw", padding: "0.6vh 1.5vw", color: "#86EFAC", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>✓ Mobile synced</div>
                </div>
                <button role="button" onClick={handleReset} style={{ marginTop: "2vh", background: "transparent", border: "1px solid rgba(124,58,237,0.3)", color: "#A78BFA", borderRadius: "0.5vw", padding: "0.5vh 1.5vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", cursor: "pointer" }}>↺ Try again</button>
              </motion.div>
            ) : state === "sent" ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "1vw", overflow: "hidden" }}>
                <div style={{ background: "rgba(124,58,237,0.08)", padding: "1.2vh 1.8vw", borderBottom: "1px solid rgba(124,58,237,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.2vw" }}>Message sent ✓</div>
                  <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>Chen Wei — Gold Top Garment</div>
                </div>
                <div style={{ padding: "2vh 1.8vw" }}>
                  <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.5vw", padding: "1.5vh 1.5vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.1vw", color: "#94A3B8", lineHeight: 1.6, marginBottom: "1.5vh", whiteSpace: "pre-line" }}>
                    {draftText}
                  </div>
                  <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", marginBottom: "1.2vh" }}>Advance shipment stage?</div>
                  <div style={{ display: "flex", gap: "0.5vw", marginBottom: "0.8vh", alignItems: "center" }}>
                    <div style={{ background: "rgba(245,158,11,0.12)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "0.35vw", padding: "0.3vh 0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>Production</div>
                    <span style={{ color: "#4B5563", fontSize: "1vw" }}>→</span>
                    <div style={{ background: "rgba(34,197,94,0.12)", color: "#86EFAC", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "0.35vw", padding: "0.3vh 0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>Ex-Factory</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.8vw" }}>
                    <button role="button" onClick={handleReset} style={{ flex: 1, background: "rgba(124,58,237,0.08)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.4vw", padding: "0.6vh 0", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", cursor: "pointer" }}>Skip</button>
                    <button role="button" onClick={handleAdvance} style={{ flex: 2, background: "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.4vw", padding: "0.6vh 0", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw", cursor: "pointer" }}>Yes, advance stage →</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "1vw", overflow: "hidden" }}>
                <div style={{ background: "rgba(124,58,237,0.08)", padding: "1.2vh 1.8vw", borderBottom: "1px solid rgba(124,58,237,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.2vw" }}>Reply to: Chen Wei — Gold Top</div>
                  <div style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#A78BFA", borderRadius: "999px", padding: "0.2vh 0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>AI drafted</div>
                </div>
                <div style={{ padding: "2vh 1.8vw" }}>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onClick={(e) => { e.stopPropagation(); setState("editing"); }}
                    style={{
                      width: "100%", background: "rgba(124,58,237,0.05)", border: `1px solid ${state === "editing" ? "rgba(124,58,237,0.45)" : "rgba(124,58,237,0.15)"}`,
                      borderRadius: "0.6vw", padding: "1.2vh 1.2vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.1vw",
                      color: "#F1F5F9", lineHeight: 1.6, resize: "none", height: "20vh", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.2vh" }}>
                    <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>
                      {state === "editing" ? "✏️ Editing — click Send when ready" : "Advance stage to Ex-Factory after sending?"}
                    </div>
                    <div style={{ display: "flex", gap: "0.8vw" }}>
                      <button role="button" onClick={(e) => { e.stopPropagation(); setState("idle"); }} style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA", border: "none", borderRadius: "0.4vw", padding: "0.5vh 1.2vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", cursor: "pointer" }}>Skip</button>
                      <button role="button" onClick={handleSend} style={{ background: "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.4vw", padding: "0.5vh 1.5vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw", cursor: "pointer" }}>Send →</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
