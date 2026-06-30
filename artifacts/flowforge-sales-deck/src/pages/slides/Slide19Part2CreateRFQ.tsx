export default function Slide19Part2CreateRFQ() {
  const actions = [
    'Click "RFQs" in the left sidebar to open the RFQ Manager',
    'Click the blue "+ New RFQ" button (top right of the RFQ list)',
    'Fill in: Product — "Chrome Retail Hangers", Category — "Chrome Hanger"',
    'Set Buyer Name to "Northbound Outfitters" (type or select from dropdown)',
    'Enter Target Price: $0.95 per unit · Quantity: 5,000 · Deadline: 4 weeks out',
    'Optionally add Notes: "Must pass 3kg load test, standard chrome finish"',
    'Click "Create RFQ" — the new RFQ appears selected in the left panel',
  ];

  const fields = [
    { label: "Product", value: "Chrome Retail Hangers", required: true },
    { label: "Buyer", value: "Northbound Outfitters", required: true },
    { label: "Target Price", value: "$0.95 / unit", required: true },
    { label: "Quantity", value: "5,000 units", required: true },
    { label: "Deadline", value: "4 weeks from today", required: true },
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
            Part 2 · Screen: RFQs → New RFQ Modal
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Create the RFQ
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: "0.75vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)", marginBottom: "0.2vh" }}>Steps</div>
            {actions.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1.2vw",
                  alignItems: "flex-start",
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: "1px solid rgba(124,58,237,0.18)",
                  padding: "0.7vh 1.1vw",
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
                <span style={{ fontSize: "1vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.35 }}>{a}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 0.85, display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Screen Preview</div>
            <div
              style={{
                borderRadius: "0.6vw",
                border: "1px solid rgba(124,58,237,0.3)",
                overflow: "hidden",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part2-create-rfq.jpg`}
                alt="FlowForge New RFQ modal with form fields: product, buyer, target price, quantity, deadline"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Required Fields</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.22)",
                padding: "0.9vh 1.2vw",
                display: "flex",
                flexDirection: "column",
                gap: "0.5vh",
              }}
            >
              {fields.map(({ label, value, required }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(124,58,237,0.08)", paddingBottom: "0.45vh" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3vw" }}>
                    <span style={{ fontSize: "0.9vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{label}</span>
                    {required && <span style={{ fontSize: "0.7vw", color: "#7C3AED" }}>*</span>}
                  </div>
                  <span style={{ fontSize: "0.95vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
