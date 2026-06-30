export default function Slide21Part4CompareQuotes() {
  const quotes = [
    {
      factory: "Tianjin Wire Works",
      unitPrice: "$0.87",
      lead: "28 days",
      moq: "1,000",
      total: "$4,350",
      badges: ["cheapest", "fastest"],
      winner: true,
    },
    {
      factory: "Guangzhou Metalworks",
      unitPrice: "$0.91",
      lead: "32 days",
      moq: "2,000",
      total: "$4,550",
      badges: [],
      winner: false,
    },
    {
      factory: "Ningbo Alloy Co.",
      unitPrice: "$0.96",
      lead: "35 days",
      moq: "500",
      total: "$4,800",
      badges: ["above target"],
      winner: false,
    },
  ];

  const steps = [
    "Review the comparison table — quotes are sorted by unit price ascending",
    'Look for the "Cheapest" (green) and "Fastest" (blue) badges FlowForge auto-assigns',
    "Check spread vs. target price column — Tianjin beats $0.95 target by 8.4%",
    'Click the "Convert to PO" button on the winning quote row (Tianjin Wire Works)',
  ];

  const BADGE_COLOR: Record<string, { bg: string; text: string }> = {
    cheapest: { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
    fastest: { bg: "rgba(96,165,250,0.15)", text: "#60A5FA" },
    "above target": { bg: "rgba(248,113,113,0.15)", text: "#F87171" },
  };

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div
        className="relative z-10 flex flex-col h-full"
        style={{ padding: "2.5vh 7vw 2vh" }}
      >
        <div style={{ marginBottom: "1.5vh" }}>
          <div style={{ fontSize: "1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "0.4vh" }}>
            Part 4 · Screen: Quotes Comparison Table
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Compare Quotes & Pick a Winner
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.3, display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Quote Comparison Table</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.6vw",
                border: "1px solid rgba(124,58,237,0.2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  background: "rgba(124,58,237,0.1)",
                  padding: "0.8vh 1.2vw",
                  gap: "0.4vw",
                }}
              >
                {["Factory", "Unit Price", "Lead Time", "MOQ", "5k Total"].map((h) => (
                  <div key={h} style={{ fontSize: "0.8vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>
              {quotes.map((q, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                    padding: "1vh 1.2vw",
                    gap: "0.4vw",
                    background: q.winner ? "rgba(52,211,153,0.05)" : "transparent",
                    borderTop: "1px solid rgba(124,58,237,0.1)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3vh" }}>
                    <span style={{ fontSize: "1vw", color: q.winner ? "#F1F5F9" : "#CBD5E1", fontFamily: "var(--font-body-family)", fontWeight: q.winner ? 600 : 400 }}>{q.factory}</span>
                    <div style={{ display: "flex", gap: "0.4vw", flexWrap: "wrap" }}>
                      {q.badges.map((b) => (
                        <span
                          key={b}
                          style={{
                            fontSize: "0.68vw",
                            padding: "0.1vh 0.4vw",
                            borderRadius: "0.2vw",
                            background: BADGE_COLOR[b]?.bg,
                            color: BADGE_COLOR[b]?.text,
                            fontFamily: "var(--font-body-family)",
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: "1vw", color: q.winner ? "#34D399" : "#CBD5E1", fontFamily: "var(--font-body-family)", fontWeight: q.winner ? 600 : 400 }}>{q.unitPrice}</span>
                  <span style={{ fontSize: "1vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{q.lead}</span>
                  <span style={{ fontSize: "1vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{q.moq}</span>
                  <span style={{ fontSize: "1vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{q.total}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Screen Preview</div>
            <div
              style={{
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.3)",
                overflow: "hidden",
                flex: 1,
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part4-compare-quotes.jpg`}
                alt="FlowForge Quotes comparison table with Cheapest/Fastest/Above-Target badges and Convert to PO button"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          </div>

          <div style={{ flex: 0.8, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Steps</div>
            {steps.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.9vw",
                  alignItems: "flex-start",
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: "1px solid rgba(124,58,237,0.18)",
                  padding: "0.85vh 1.1vw",
                }}
              >
                <div
                  style={{
                    width: "1.3vw",
                    height: "1.3vw",
                    borderRadius: "50%",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "0.1vh",
                  }}
                >
                  <span style={{ fontSize: "0.68vw", color: "#A78BFA", fontWeight: 700, fontFamily: "var(--font-body-family)" }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: "0.95vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{s}</span>
              </div>
            ))}

            <div
              style={{
                background: "rgba(124,58,237,0.08)",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.28)",
                padding: "1vh 1.2vw",
                marginTop: "0.3vh",
              }}
            >
              <div style={{ fontSize: "0.9vw", fontWeight: 600, color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>What to Notice</div>
              <div style={{ fontSize: "0.95vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>
                FlowForge auto-computes savings vs. target price. The "Cheapest" badge highlights the winner instantly — no manual formula needed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
