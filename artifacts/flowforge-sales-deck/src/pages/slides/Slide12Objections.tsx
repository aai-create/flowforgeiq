export default function Slide12Objections() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Objection Handling</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
        }}>
          Common questions
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "3.5vh" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "2.2vh", flex: 1 }}>
          <div style={{ display: "flex", gap: "0" }}>
            <div style={{ flex: "0 0 40vw", paddingRight: "3vw" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>"We already use email and WhatsApp — why change?"</div>
            </div>
            <div style={{ width: "0.15vw", background: "rgba(124,58,237,0.25)", flexShrink: 0 }} />
            <div style={{ flex: 1, paddingLeft: "3vw" }}>
              <div style={{ fontSize: "1.5vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.5 }}>Those channels still work — FlowForge connects to them. You keep WhatsApp and email; they flow into one inbox instead of staying in separate silos. The change is additive, not disruptive.</div>
            </div>
          </div>

          <div style={{ height: "0.1vh", background: "rgba(124,58,237,0.15)" }} />

          <div style={{ display: "flex", gap: "0" }}>
            <div style={{ flex: "0 0 40vw", paddingRight: "3vw" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>"Our suppliers won't adopt another tool."</div>
            </div>
            <div style={{ width: "0.15vw", background: "rgba(124,58,237,0.25)", flexShrink: 0 }} />
            <div style={{ flex: 1, paddingLeft: "3vw" }}>
              <div style={{ fontSize: "1.5vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.5 }}>Suppliers don't need to change anything. They keep sending WhatsApp messages and emails. FlowForge reads those on your side — suppliers experience zero friction and zero onboarding.</div>
            </div>
          </div>

          <div style={{ height: "0.1vh", background: "rgba(124,58,237,0.15)" }} />

          <div style={{ display: "flex", gap: "0" }}>
            <div style={{ flex: "0 0 40vw", paddingRight: "3vw" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>"We have an ERP — can't it do this?"</div>
            </div>
            <div style={{ width: "0.15vw", background: "rgba(124,58,237,0.25)", flexShrink: 0 }} />
            <div style={{ flex: 1, paddingLeft: "3vw" }}>
              <div style={{ fontSize: "1.5vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.5 }}>ERPs track what happened after it's recorded — they don't read WhatsApp threads, extract PO fields from PDFs, or draft replies. FlowForge is the communication layer that sits in front of your ERP, not a replacement for it.</div>
            </div>
          </div>

          <div style={{ height: "0.1vh", background: "rgba(124,58,237,0.15)" }} />

          <div style={{ display: "flex", gap: "0" }}>
            <div style={{ flex: "0 0 40vw", paddingRight: "3vw" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>"How long does it take to get up and running?"</div>
            </div>
            <div style={{ width: "0.15vw", background: "rgba(124,58,237,0.25)", flexShrink: 0 }} />
            <div style={{ flex: 1, paddingLeft: "3vw" }}>
              <div style={{ fontSize: "1.5vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.5 }}>A small team can go live in under two weeks. Supplier directory setup and channel routing configuration are the only onboarding steps. No infrastructure to provision, no IT project required.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
