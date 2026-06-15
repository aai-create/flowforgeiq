export default function Slide15CTA() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 15% 50%, rgba(124,58,237,0.22) 0%, transparent 70%)" }} />
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.07) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex flex-col justify-center h-full" style={{ paddingLeft: "8vw", paddingRight: "8vw" }}>
        <div className="flex items-center" style={{ marginBottom: "1.2vh" }}>
          <div style={{ width: "2.8vw", height: "0.22vh", background: "#7C3AED", marginRight: "1.2vw" }} />
          <span style={{ fontSize: "1.3vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", letterSpacing: "0.18em", fontWeight: 500, textTransform: "uppercase" }}>Pilot With Us</span>
        </div>

        <h1 style={{ fontSize: "5.5vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: "1.2vh", maxWidth: "60vw" }}>
          Start small.<br />Prove it yourself.
        </h1>

        <div style={{ width: "6vw", height: "0.3vh", background: "#7C3AED", marginBottom: "3vh" }} />

        <div style={{ display: "flex", gap: "2vw", maxWidth: "72vw", marginBottom: "3.5vh" }}>
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2vw", border: "2px solid rgba(124,58,237,0.5)" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>01 — 3-month free pilot</div>
            <div style={{ fontSize: "1.35vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Pick 5–10 active shipments, go live in two weeks, and measure the difference on real POs. No commitment. Monthly calls with the founding team.</div>
          </div>

          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2vw", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>02 — Live walkthrough</div>
            <div style={{ fontSize: "1.35vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Bring your hardest PO scenario — we'll run it through FlowForge live. 30 minutes. Not a canned demo.</div>
          </div>

          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2vw", border: "1px solid rgba(124,58,237,0.25)" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>03 — Discovery call</div>
            <div style={{ fontSize: "1.35vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Custom ERP integration, complex org structure, or enterprise requirements? Let's scope the right configuration before any commitment.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2.5vw" }}>
          <div>
            <div style={{ fontSize: "2vw", fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.01em" }}>FlowForge</div>
            <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginTop: "0.3vh" }}>flowforge.com</div>
          </div>
          <div style={{ width: "0.15vw", height: "4vh", background: "rgba(124,58,237,0.35)" }} />
          <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>pilot@flowforge.com</div>
        </div>
      </div>

      <div className="absolute" style={{ right: "6vw", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "1.5vh", alignItems: "flex-end" }}>
        <div style={{ width: "18vw", height: "0.15vh", background: "rgba(124,58,237,0.3)" }} />
        <div style={{ width: "12vw", height: "0.15vh", background: "rgba(124,58,237,0.2)" }} />
        <div style={{ width: "15vw", height: "0.15vh", background: "rgba(124,58,237,0.25)" }} />
        <div style={{ width: "10vw", height: "0.15vh", background: "rgba(124,58,237,0.15)" }} />
        <div style={{ width: "20vw", height: "0.15vh", background: "rgba(124,58,237,0.2)" }} />
      </div>
    </div>
  );
}
