export default function Slide08ROI() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(124,58,237,0.1) 0%, transparent 65%)" }} />
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>ROI</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            What early teams are seeing.
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2vw", flex: 1, minHeight: 0, marginBottom: "2vh" }}>
          {[
            { stat: "50%", label: "Faster response times", detail: "AI-drafted replies with full shipment context mean buyers respond in minutes instead of hours — without digging for background first." },
            { stat: "30%", label: "Fewer shipment surprises", detail: "Risk scoring and unified thread history surface delays earlier — when there's still time to reroute, expedite, or negotiate a new timeline." },
            { stat: "80%", label: "Less manual tracking", detail: "Replying from the inbox advances the stage tracker automatically. No separate spreadsheet update, no status meeting catch-up, no duplicate data entry." },
          ].map((item) => (
            <div key={item.stat} style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2.5vh 2.2vw", border: "1px solid rgba(124,58,237,0.3)", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "6.5vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1vh" }}>{item.stat}</div>
              <div style={{ fontSize: "1.55vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.7vh" }}>{item.label}</div>
              <div style={{ fontSize: "1.3vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(124,58,237,0.07)", borderRadius: "0.8vw", padding: "1.8vh 2.2vw", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", gap: "1.8vw" }}>
          <div style={{ width: "0.3vw", height: "3.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
          <div style={{ fontSize: "1.35vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>
            Directional early metrics from pilot teams — not independently audited. We share them as indicators, not guarantees. The pilot is designed to help you measure your own numbers.
          </div>
        </div>
      </div>
    </div>
  );
}
