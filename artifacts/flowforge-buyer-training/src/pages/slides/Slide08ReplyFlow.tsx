import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import StepFlow from "@/components/StepFlow";

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

const THREADS = [
  { supplier: "Gold Top Garment", preview: "samples ready will send photos this afternoon", time: "10:28 AM", channel: "WeChat", unread: true },
  { supplier: "Sunrise Apparel", preview: "Production confirmed, ex-factory on track", time: "9:45 AM", channel: "Email", unread: false },
  { supplier: "Pacific Mills", preview: "Quote submitted — see attached PDF", time: "Yesterday", channel: "Email", unread: false },
];

function ThreadListPanel() {
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", overflow: "hidden" }}>
      {THREADS.map((t, i) => (
        <div
          key={i}
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setSelected(i); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setSelected(i); } }}
          style={{
            display: "flex", gap: "0.8vw", alignItems: "flex-start",
            padding: "0.8vh 1.2vw",
            borderBottom: "1px solid rgba(124,58,237,0.08)",
            background: selected === i ? "rgba(124,58,237,0.1)" : "transparent",
            borderLeft: selected === i ? "2px solid #7C3AED" : "2px solid transparent",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          <div style={{ width: "1.8vw", height: "1.8vw", borderRadius: "50%", background: selected === i ? "#7C3AED" : "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.8vw", flexShrink: 0 }}>
            {t.supplier[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2vh" }}>
              <span style={{ color: t.unread ? "#F1F5F9" : "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: t.unread ? 700 : 400, fontSize: "0.95vw" }}>{t.supplier}</span>
              <span style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>{t.time}</span>
            </div>
            <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.preview}</div>
          </div>
          <div style={{ background: "rgba(124,58,237,0.12)", color: "#A78BFA", borderRadius: "999px", padding: "0.1vh 0.5vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.75vw", flexShrink: 0 }}>{t.channel}</div>
        </div>
      ))}
      <div style={{ padding: "0.5vh 1.2vw", color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>
        {selected === 0 ? "↑ Thread selected — click others to switch" : "Click a thread to open it"}
      </div>
    </div>
  );
}

function AIComposePanel() {
  const [sent, setSent] = useState(false);
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "0.6vw", overflow: "hidden" }}>
      <div style={{ padding: "0.6vh 1.2vw", borderBottom: "1px solid rgba(124,58,237,0.1)", background: "rgba(124,58,237,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.95vw" }}>Reply to: Chen Wei — Gold Top Garment</span>
        <span style={{ background: "rgba(124,58,237,0.2)", color: "#A78BFA", borderRadius: "999px", padding: "0.2vh 0.6vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>AI drafted</span>
      </div>
      <div style={{ padding: "1vh 1.2vw" }}>
        <div style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.12)", borderRadius: "0.4vw", padding: "0.8vh 1vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "0.8vh" }}>
          Hi Chen Wei, thanks for the update — glad samples are ready for GT-2026-0339. Please send photos when available. Can you confirm the ex-factory date is still May 28?<br/><span style={{color:"#64748B"}}>— Sarah</span>
        </div>
        <div style={{ display: "flex", gap: "0.6vw", justifyContent: "flex-end" }}>
          <button onClick={(e) => e.stopPropagation()} style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA", border: "none", borderRadius: "0.35vw", padding: "0.4vh 1vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", cursor: "pointer" }}>Edit</button>
          <button
            role="button"
            onClick={(e) => { e.stopPropagation(); setSent(true); }}
            style={{ background: sent ? "#22C55E" : "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.35vw", padding: "0.4vh 1vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw", cursor: "pointer", transition: "background 0.2s" }}
          >
            {sent ? "✓ Sent" : "Send draft →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdvanceDialogPanel() {
  const [choice, setChoice] = useState<"none"|"skip"|"advance">("none");
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.35)", borderRadius: "0.6vw", padding: "1.2vh 1.5vw" }}>
      <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.05vw", marginBottom: "0.4vh" }}>Advance shipment stage?</div>
      <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", marginBottom: "1.2vh" }}>GT-2026-0339 · Gold Top Garment</div>
      <div style={{ display: "flex", gap: "0.8vw", alignItems: "center", marginBottom: "1.2vh" }}>
        <StagePill label="Quote" done />
        <span style={{ color: "#4B5563" }}>→</span>
        <StagePill label="Production" active />
        <span style={{ color: "#4B5563" }}>→</span>
        <StagePill label="Ex-Factory" />
      </div>
      <div style={{ display: "flex", gap: "0.6vw" }}>
        <button role="button" onClick={(e) => { e.stopPropagation(); setChoice("skip"); }} style={{ flex: 1, background: choice === "skip" ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.06)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "0.35vw", padding: "0.5vh 0", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", cursor: "pointer" }}>Skip</button>
        <button role="button" onClick={(e) => { e.stopPropagation(); setChoice("advance"); }} style={{ flex: 2, background: choice === "advance" ? "#22C55E" : "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.35vw", padding: "0.5vh 0", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw", cursor: "pointer", transition: "background 0.2s" }}>{choice === "advance" ? "✓ Advanced to Production" : "Yes, advance stage →"}</button>
      </div>
    </div>
  );
}

function StagePill({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div style={{ background: done ? "rgba(124,58,237,0.25)" : active ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.04)", border: `1px solid ${done ? "#7C3AED55" : active ? "rgba(34,197,94,0.4)" : "rgba(124,58,237,0.15)"}`, borderRadius: "0.35vw", padding: "0.2vh 0.7vw", color: done ? "#A78BFA" : active ? "#86EFAC" : "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw", fontWeight: active ? 700 : 400 }}>
      {done && "✓ "}{label}
    </div>
  );
}

function StageUpdatePanel() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8vw" }}>
      <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", overflow: "hidden" }}>
        <div style={{ padding: "0.5vh 1vw", background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.1)", color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.05em" }}>Orders Grid</div>
        <div style={{ padding: "0.8vh 1vw" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4vh" }}>
            <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>GT-2026-0339</span>
            <span style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "999px", padding: "0.1vh 0.6vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>Production</span>
          </div>
          <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>Gold Top Garment · 4,200 units</div>
          <div style={{ color: "#22C55E", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw", marginTop: "0.4vh" }}>+7.6% spread</div>
        </div>
      </div>
      <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", overflow: "hidden" }}>
        <div style={{ padding: "0.5vh 1vw", background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.1)", color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile App</div>
        <div style={{ padding: "0.8vh 1vw", display: "flex", flexDirection: "column", gap: "0.5vh" }}>
          <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "0.4vw", padding: "0.5vh 0.8vw" }}>
            <div style={{ color: "#93C5FD", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.8vw" }}>Stage updated</div>
            <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>GT-2026-0339 → Production</div>
          </div>
          <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>Inbox, Orders grid, and mobile all sync in real time — no manual update.</div>
        </div>
      </div>
    </div>
  );
}

const replySteps = [
  { title: "Open the message", body: "Click any thread in the inbox. The full conversation loads — email, WhatsApp, and WeChat in the same thread.", renderPanel: () => <ThreadListPanel /> },
  { title: "Review the AI draft", body: "FlowForge pre-fills a reply using shipment context and message history. Edit anything before sending.", renderPanel: () => <AIComposePanel /> },
  { title: "Send and advance stage", body: "Hit Send. FlowForge asks if you want to advance the shipment stage — click Yes to move it instantly.", renderPanel: () => <AdvanceDialogPanel /> },
  { title: "Stage updates everywhere", body: "The new stage appears in the Orders grid, the Inbox filter, and the mobile app in real time — no manual step needed.", renderPanel: () => <StageUpdatePanel /> },
];

export default function Slide08ReplyFlow() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 60% 60% at 100% 100%, rgba(124,58,237,0.1) 0%, transparent 60%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "28vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Chapter 02 — Inbox</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "3.8vw", color: "#F1F5F9", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: "2vh" }}>
            Reply and advance
            <br /><span style={{ color: "#A78BFA" }}>in one action</span>
          </div>
        </Anim>
        <Anim delay={0.2}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.35vw", lineHeight: 1.6 }}>
            Sending a reply can simultaneously advance the shipment stage — no separate step required. Click through each screen below.
          </div>
        </Anim>
      </div>

      <Anim delay={0.3}>
        <div style={{ position: "absolute", right: "4vw", top: "50%", transform: "translateY(-50%)", width: "57vw" }}>
          <StepFlow steps={replySteps} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
