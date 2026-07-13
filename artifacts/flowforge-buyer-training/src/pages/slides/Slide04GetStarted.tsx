import { motion } from "framer-motion";
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

function SignInScreen() {
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", padding: "1.5vh 2vw", display: "flex", flexDirection: "column", gap: "0.8vh" }}>
      <div style={{ textAlign: "center", marginBottom: "0.5vh" }}>
        <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.2vw", marginBottom: "0.3vh" }}>Sign in to FlowForge</div>
        <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>Use your team invitation link to get started</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.4vw", padding: "0.6vh 1vw", display: "flex", gap: "0.6vw", alignItems: "center", cursor: "default" }}>
        <span style={{ fontSize: "1vw" }}>🔵</span>
        <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>Continue with Google</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.4vw", padding: "0.6vh 1vw", display: "flex", gap: "0.6vw", alignItems: "center", cursor: "default" }}>
        <span style={{ fontSize: "1vw" }}>🪟</span>
        <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>Continue with Microsoft</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(124,58,237,0.15)" }} />
        <span style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>or email</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(124,58,237,0.15)" }} />
      </div>
      <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.4vw", padding: "0.5vh 1vw", color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>sarah@company.com</div>
    </div>
  );
}

function GmailScreen() {
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", padding: "1.5vh 2vw" }}>
      <div style={{ display: "flex", gap: "0.6vw", alignItems: "center", marginBottom: "1vh" }}>
        <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: "rgba(234,67,53,0.2)", border: "1px solid rgba(234,67,53,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: "0.8vw", fontWeight: 700 }}>G</div>
        <div>
          <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>FlowForge wants to access your Gmail</div>
          <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>sarah@company.com</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5vh", marginBottom: "1vh" }}>
        {["Read supplier emails into FlowForge", "Send replies via your address", "Organize threads by shipment"].map((scope) => (
          <div key={scope} style={{ display: "flex", gap: "0.5vw", alignItems: "center" }}>
            <div style={{ color: "#22C55E", fontSize: "0.85vw", fontWeight: 700 }}>✓</div>
            <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{scope}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.6vw" }}>
        <div style={{ flex: 1, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.35vw", padding: "0.4vh 0", textAlign: "center", color: "#A78BFA", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>Cancel</div>
        <div style={{ flex: 2, background: "#7C3AED", borderRadius: "0.35vw", padding: "0.4vh 0", textAlign: "center", color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw" }}>Allow access</div>
      </div>
    </div>
  );
}

function InboxPreviewScreen() {
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", overflow: "hidden" }}>
      <div style={{ background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.1)", padding: "0.5vh 1vw", display: "flex", gap: "0.5vw" }}>
        {["All", "Email", "WeChat", "WhatsApp"].map((ch, i) => (
          <div key={ch} style={{ background: i === 0 ? "#7C3AED" : "transparent", color: i === 0 ? "#F1F5F9" : "#4B5563", borderRadius: "999px", padding: "0.2vh 0.7vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>{ch}</div>
        ))}
      </div>
      {[
        { s: "Gold Top Garment", m: "samples ready will send photos this afternoon", t: "10:28 AM", u: true },
        { s: "Sunrise Apparel", m: "Production confirmed, ex-factory on track", t: "9:45 AM", u: false },
        { s: "Pacific Mills", m: "Quote submitted — see attached PDF", t: "Yesterday", u: true },
      ].map((row, i) => (
        <div key={i} style={{ display: "flex", gap: "0.7vw", padding: "0.6vh 1vw", borderBottom: "1px solid rgba(124,58,237,0.06)", alignItems: "flex-start" }}>
          <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#A78BFA", fontSize: "0.75vw", fontWeight: 700, flexShrink: 0 }}>{row.s[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: row.u ? "#F1F5F9" : "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: row.u ? 700 : 400, fontSize: "0.9vw" }}>{row.s}</span>
              <span style={{ color: "#4B5563", fontSize: "0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif' }}>{row.t}</span>
            </div>
            <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.m}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShipmentDetailScreen() {
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", padding: "1.2vh 1.5vw" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1vh" }}>
        <div>
          <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.05vw" }}>GT-2026-0339</div>
          <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>Gold Top Garment · Knit Tops · 4,200 units</div>
        </div>
        <div style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "999px", padding: "0.2vh 0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>Production</div>
      </div>
      <div style={{ display: "flex", gap: "1vw", marginBottom: "0.8vh" }}>
        <StatBox label="Buyer Total" value="$26,600" />
        <StatBox label="Payments" value="$24,612" />
        <StatBox label="Spread" value="+7.6%" green />
      </div>
      <div style={{ display: "flex", gap: "0.5vw" }}>
        <div style={{ flex: 1, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.35vw", padding: "0.4vh 0", textAlign: "center", color: "#A78BFA", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>View thread</div>
        <div style={{ flex: 1, background: "#7C3AED", borderRadius: "0.35vw", padding: "0.4vh 0", textAlign: "center", color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.85vw" }}>Draft reply</div>
      </div>
    </div>
  );
}

function StatBox({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ flex: 1, background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.12)", borderRadius: "0.35vw", padding: "0.4vh 0.6vw" }}>
      <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.75vw", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ color: green ? "#22C55E" : "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.05vw" }}>{value}</div>
    </div>
  );
}

const startSteps = [
  { title: "Sign in with your invite", body: "Accept the email invite and authenticate with your company Google or Microsoft account through FlowForge's Clerk-powered sign-in.", renderPanel: () => <SignInScreen /> },
  { title: "Connect Gmail", body: "Link your supplier-facing inbox so incoming emails appear in FlowForge automatically. Takes 30 seconds — click Allow once.", renderPanel: () => <GmailScreen /> },
  { title: "Explore the Inbox", body: "See all channels in one view — email, WhatsApp, WeChat, and SMS threads unified. Filter by channel with a single click.", renderPanel: () => <InboxPreviewScreen /> },
  { title: "Open your first order", body: "Click any shipment to see its stage, spread, thread history, and tasks — without leaving the inbox view.", renderPanel: () => <ShipmentDetailScreen /> },
];

export default function Slide04GetStarted() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.08) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 55% 55% at 100% 50%, rgba(124,58,237,0.12) 0%, transparent 65%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "28vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Chapter 01 — Welcome</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "4.2vw", color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "2vh" }}>Getting started</div>
        </Anim>
        <Anim delay={0.2}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.4vw", lineHeight: 1.6 }}>
            Four steps from first login to your first handled message. Click through each screen on the right.
          </div>
        </Anim>
      </div>

      <Anim delay={0.3}>
        <div style={{ position: "absolute", right: "4vw", top: "50%", transform: "translateY(-50%)", width: "57vw" }}>
          <StepFlow steps={startSteps} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
