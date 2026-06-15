export default function Slide07ICP() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Who It's For</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Built for teams operating 20–50+ POs at a time.
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2.2vw", border: "2px solid rgba(124,58,237,0.45)", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: "-1.4vh", left: "1.8vw", background: "#7C3AED", borderRadius: "2vw", padding: "0.3vh 1vw", fontSize: "1vw", color: "#fff", fontFamily: "var(--font-body-family)", fontWeight: 700 }}>Primary</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>Retail & Apparel Buyers</div>
            <div style={{ fontSize: "1.6vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.2, marginBottom: "1.5vh" }}>Brands sourcing from Asia or LATAM factories</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh", flex: 1 }}>
              {[
                "20–200 active POs — the sweet spot where spreadsheets break",
                "Buying team of 2–10 people sharing fragmented channels",
                "Pain: delays discovered too late to act, no shared history",
                "Buyer: VP Supply Chain, Head of Sourcing, Senior Buyer",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.8vw" }}>
                  <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.35vw", flexShrink: 0, lineHeight: 1.4 }}>—</div>
                  <div style={{ fontSize: "1.3vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2.2vw", border: "1px solid rgba(124,58,237,0.25)", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: "-1.4vh", left: "1.8vw", background: "#1E293B", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "2vw", padding: "0.3vh 1vw", fontSize: "1vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 700 }}>Secondary</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>Sourcing Agencies</div>
            <div style={{ fontSize: "1.6vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.2, marginBottom: "1.5vh" }}>Multi-client sourcing orgs managing cross-brand supplier networks</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh", flex: 1 }}>
              {[
                "Multiple buyer clients, dozens of suppliers, one team",
                "Need audit trails and compliance records across clients",
                "ERPs record what happened; they need to see what's happening",
                "Buyer: COO, Director of Operations, Sourcing Manager",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.8vw" }}>
                  <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.35vw", flexShrink: 0, lineHeight: 1.4 }}>—</div>
                  <div style={{ fontSize: "1.3vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: "0 0 20vw", display: "flex", flexDirection: "column", gap: "1.5vh" }}>
            <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.2)", padding: "1.8vh 1.8vw" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.7vh", fontFamily: "var(--font-body-family)" }}>Not the primary fit</div>
              <div style={{ fontSize: "1.3vw", color: "#475569", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Trade finance intermediaries — we support the three-party payment model, but it's a module, not the core value prop for pilot conversations.</div>
            </div>
            <div style={{ background: "rgba(124,58,237,0.08)", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.25)", padding: "1.8vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.7vh", fontFamily: "var(--font-body-family)" }}>Qualifying question</div>
              <div style={{ fontSize: "1.35vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.5, fontStyle: "italic" }}>
                "How many active POs are you managing right now, and how many channels do your suppliers use?"
              </div>
              <div style={{ fontSize: "1.2vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.4, marginTop: "1vh" }}>20+ POs across 2+ channels = FlowForge prospect.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
