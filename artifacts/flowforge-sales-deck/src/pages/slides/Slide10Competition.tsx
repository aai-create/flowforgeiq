export default function Slide10Competition() {
  const competitors = [
    {
      name: "SAP / Oracle / NetSuite",
      category: "Full ERP",
      strength: "Transaction records, finance integration, enterprise compliance",
      gap: "No buyer-supplier communication layer; won't read WhatsApp or draft replies; slow and expensive to configure",
    },
    {
      name: "Anvyl",
      category: "Production tracking",
      strength: "Supplier portal, production milestones, document management",
      gap: "Requires suppliers to log into their portal; doesn't ingest existing WhatsApp / WeChat channels",
    },
    {
      name: "Flexport / Freightos",
      category: "Freight & logistics",
      strength: "Real-time freight visibility, customs tracking, rate comparison",
      gap: "Logistics layer only — no buyer-supplier communication, no AI drafting, no stage tracking",
    },
    {
      name: "Airtable / Notion + Slack",
      category: "Custom build",
      strength: "Flexible; teams know the tools; no new vendor",
      gap: "Manual data entry; no AI extraction; no channel routing; breaks at scale",
    },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "1.5vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Competitive Landscape</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: "0 0 0.6vh" }}>
            The wedge: a focused communication layer.
          </h2>
          <p style={{ fontSize: "1.35vw", color: "#64748B", fontFamily: "var(--font-body-family)", margin: 0, lineHeight: 1.4 }}>
            The real question is what job each tool is hired for — and who requires suppliers to change their behavior.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1vh", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(124,58,237,0.15)", paddingBottom: "0.8vh" }}>
            {["Alternative", "Category", "What they do well", "The gap FlowForge fills"].map((h, i) => (
              <div key={h} style={{ flex: i === 0 ? "0 0 18vw" : i === 1 ? "0 0 11vw" : 1, fontSize: "1.05vw", fontWeight: 700, color: "#475569", fontFamily: "var(--font-body-family)", letterSpacing: "0.08em", textTransform: "uppercase", paddingRight: i < 3 ? "1vw" : 0 }}>{h}</div>
            ))}
          </div>

          {competitors.map((c, i) => (
            <div key={c.name} style={{
              display: "flex",
              flex: 1,
              background: i === 1 ? "rgba(124,58,237,0.07)" : "#131929",
              borderRadius: "0.5vw",
              border: i === 1 ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(124,58,237,0.15)",
              padding: "1.2vh 1.2vw",
              alignItems: "center",
              minHeight: 0,
            }}>
              <div style={{ flex: "0 0 18vw", paddingRight: "1vw" }}>
                <div style={{ fontSize: "1.35vw", fontWeight: 700, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>{c.name}</div>
                {i === 1 && <div style={{ fontSize: "1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 600, marginTop: "0.2vh" }}>Closest overlap</div>}
              </div>
              <div style={{ flex: "0 0 11vw", paddingRight: "1vw" }}>
                <div style={{ fontSize: "1.2vw", color: "#64748B", fontFamily: "var(--font-body-family)", background: "rgba(100,116,139,0.12)", borderRadius: "0.3vw", padding: "0.2vh 0.6vw", display: "inline-block" }}>{c.category}</div>
              </div>
              <div style={{ flex: 1, fontSize: "1.25vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.35, paddingRight: "1.5vw" }}>{c.strength}</div>
              <div style={{ flex: 1, fontSize: "1.25vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", lineHeight: 1.35 }}>{c.gap}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1.5vh", padding: "1.5vh 2vw", background: "rgba(124,58,237,0.08)", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", gap: "1.5vw" }}>
          <div style={{ width: "0.3vw", height: "3vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
          <div style={{ fontSize: "1.3vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>
            <strong style={{ color: "#F1F5F9" }}>Our wedge:</strong> the only option that requires zero supplier behavior change while providing AI-assisted coordination on the buyer side.
          </div>
        </div>
      </div>
    </div>
  );
}
