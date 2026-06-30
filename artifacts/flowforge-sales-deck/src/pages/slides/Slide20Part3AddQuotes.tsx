export default function Slide20Part3AddQuotes() {
  const quotes = [
    {
      factory: "Tianjin Wire Works",
      country: "CN",
      unitPrice: "$0.87",
      lead: "28 days",
      moq: "1,000",
      note: "Existing supplier — fastest",
    },
    {
      factory: "Guangzhou Metalworks",
      country: "CN",
      unitPrice: "$0.91",
      lead: "32 days",
      moq: "2,000",
      note: "Mid-range price, higher MOQ",
    },
    {
      factory: "Ningbo Alloy Co.",
      country: "CN",
      unitPrice: "$0.96",
      lead: "35 days",
      moq: "500",
      note: "Above target price — low MOQ",
    },
  ];

  const steps = [
    'With your new RFQ selected, click the "Quotes" tab in the right panel',
    'Click "+ Add Quote" to open the Add Quote modal',
    'Fill in Factory Name, Country, Unit Price, Lead Time (days), and MOQ',
    'Click "Add Quote" to save — the quote appears in the comparison table',
    "Repeat for all three factories listed on this slide",
  ];

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
            Part 3 · Screen: Quotes Tab → Add Quote
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Add Three Quotes
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Steps</div>
            {steps.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1.1vw",
                  alignItems: "flex-start",
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: "1px solid rgba(124,58,237,0.18)",
                  padding: "0.75vh 1.1vw",
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
                <span style={{ fontSize: "1vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.38 }}>{s}</span>
              </div>
            ))}

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)", marginTop: "0.5vh" }}>Screen Preview</div>
            <div
              style={{
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.3)",
                overflow: "hidden",
                flex: 1,
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part3-add-quotes.jpg`}
                alt="FlowForge Add Quote modal showing Tianjin Wire Works, Guangzhou Metalworks, and Ningbo Alloy Co. quotes"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Three Quotes to Enter</div>
            {quotes.map((q, i) => (
              <div
                key={i}
                style={{
                  background: "#131929",
                  borderRadius: "0.5vw",
                  border: "1px solid rgba(124,58,237,0.2)",
                  padding: "0.9vh 1.2vw",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4vh" }}>
                  <span style={{ fontSize: "1.05vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>{q.factory}</span>
                  <span style={{ fontSize: "0.8vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>{q.country}</span>
                </div>
                <div style={{ display: "flex", gap: "1.5vw", marginBottom: "0.3vh" }}>
                  <div>
                    <div style={{ fontSize: "0.75vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>Unit Price</div>
                    <div style={{ fontSize: "1.05vw", fontWeight: 600, color: "#34D399", fontFamily: "var(--font-body-family)" }}>{q.unitPrice}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>Lead Time</div>
                    <div style={{ fontSize: "1.05vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{q.lead}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>MOQ</div>
                    <div style={{ fontSize: "1.05vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{q.moq}</div>
                  </div>
                </div>
                <div style={{ fontSize: "0.9vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{q.note}</div>
              </div>
            ))}

            <div
              style={{
                background: "rgba(124,58,237,0.08)",
                borderRadius: "0.4vw",
                border: "1px solid rgba(124,58,237,0.25)",
                padding: "0.8vh 1.1vw",
              }}
            >
              <div style={{ fontSize: "0.95vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>
                <span style={{ color: "#A78BFA", fontWeight: 600 }}>Target price:</span> $0.95 · Tianjin Wire Works at $0.87 beats target by 8.4%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
