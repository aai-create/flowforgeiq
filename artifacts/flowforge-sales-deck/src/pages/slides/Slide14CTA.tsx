export default function Slide14CTA() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 15% 50%, rgba(124,58,237,0.22) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.07) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex flex-col justify-center h-full" style={{ paddingLeft: "8vw", paddingRight: "8vw" }}>
        <div className="flex items-center" style={{ marginBottom: "1.8vh" }}>
          <div style={{ width: "2.8vw", height: "0.22vh", background: "#7C3AED", marginRight: "1.2vw" }} />
          <span style={{ fontSize: "1.4vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", letterSpacing: "0.18em", fontWeight: 500, textTransform: "uppercase" }}>Next Steps</span>
        </div>

        <h1 style={{
          fontSize: "7vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          textWrap: "balance",
          marginBottom: "1.5vh",
          maxWidth: "60vw",
        }}>
          Start a conversation.
        </h1>

        <div style={{ width: "6vw", height: "0.3vh", background: "#7C3AED", marginBottom: "4vh" }} />

        <div style={{ display: "flex", gap: "2.5vw", maxWidth: "68vw", marginBottom: "5vh" }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "2.8vh 2.2vw",
            border: "1px solid rgba(124,58,237,0.3)",
          }}>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>01 — Request a demo</div>
            <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>A 30-minute live walkthrough with your actual shipment complexity — not a canned script. We bring the platform; you bring your hardest PO scenario.</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "2.8vh 2.2vw",
            border: "1px solid rgba(124,58,237,0.3)",
          }}>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>02 — Start a trial</div>
            <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Onboard your real supplier list and connect your channels. Go live with 5 active shipments, no engineering work required, in under two weeks.</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "2.8vh 2.2vw",
            border: "1px solid rgba(124,58,237,0.3)",
          }}>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>03 — Talk to sales</div>
            <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Complex org structure, custom channel requirements, or intermediary financing? Let's scope the right configuration for your team before any commitment.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "3vw" }}>
          <div>
            <div style={{ fontSize: "2.2vw", fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.01em" }}>FlowForge</div>
            <div style={{ fontSize: "1.6vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginTop: "0.4vh" }}>flowforge.com</div>
          </div>
          <div style={{ width: "0.15vw", height: "5vh", background: "rgba(124,58,237,0.35)" }} />
          <div style={{ fontSize: "1.6vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>sales@flowforge.com</div>
        </div>
      </div>

      <div
        className="absolute"
        style={{
          right: "6vw",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.8vh",
          alignItems: "flex-end",
        }}
      >
        <div style={{ width: "18vw", height: "0.15vh", background: "rgba(124,58,237,0.3)" }} />
        <div style={{ width: "12vw", height: "0.15vh", background: "rgba(124,58,237,0.2)" }} />
        <div style={{ width: "15vw", height: "0.15vh", background: "rgba(124,58,237,0.25)" }} />
        <div style={{ width: "10vw", height: "0.15vh", background: "rgba(124,58,237,0.15)" }} />
        <div style={{ width: "20vw", height: "0.15vh", background: "rgba(124,58,237,0.2)" }} />
      </div>
    </div>
  );
}
