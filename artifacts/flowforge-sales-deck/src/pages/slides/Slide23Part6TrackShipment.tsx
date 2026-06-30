export default function Slide23Part6TrackShipment() {
  const stages = [
    { id: "spec", label: "Spec Sheet", active: true },
    { id: "quotes", label: "Factory Quotes", active: false },
    { id: "sample_ord", label: "Sample Order", active: false },
    { id: "sample_apr", label: "Sample Approval", active: false },
    { id: "po_issued", label: "PO Issued", active: false },
    { id: "production", label: "Production", active: false },
    { id: "qc", label: "QC Inspection", active: false },
    { id: "ex_factory", label: "Ex-Factory", active: false },
    { id: "in_transit", label: "In Transit", active: false },
    { id: "delivered", label: "Delivered", active: false },
  ];

  const steps = [
    'Navigate to "Orders" in the sidebar — locate your new PO-2026-HANGERS-001',
    "Click the shipment row to open its detail panel on the right",
    "Review: current stage (Spec Sheet), supplier, buyer, due dates, spread badge",
    'To advance stage: click the "→ Advance Stage" button in the detail panel header',
    "Confirm the stage transition — the tracker updates and an event is logged",
    "Notice the spread badge: shows buyer price vs. cost, auto-calculated from payments",
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
            Part 6 · Screen: Orders Grid + Shipment Detail
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Track the Shipment
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75vh" }}>
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
                <span style={{ fontSize: "0.95vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.38 }}>{s}</span>
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
                src={`${import.meta.env.BASE_URL}screenshots/part6-track-shipment.jpg`}
                alt="FlowForge Orders grid with shipment detail panel showing stage tracker at Spec Sheet and spread badge"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          </div>

          <div style={{ flex: 0.9, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Stage Tracker</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.6vw",
                border: "1px solid rgba(124,58,237,0.22)",
                padding: "1vh 1.3vw",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                {stages.map((stage, i) => (
                  <div
                    key={stage.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.7vw",
                      padding: "0.3vh 0.5vw",
                      borderRadius: "0.25vw",
                      background: stage.active ? "rgba(124,58,237,0.12)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        width: "0.65vw",
                        height: "0.65vw",
                        borderRadius: "50%",
                        background: stage.active ? "#7C3AED" : i < 1 ? "#334155" : "rgba(124,58,237,0.2)",
                        border: stage.active ? "none" : `1px solid ${i < 1 ? "#475569" : "rgba(124,58,237,0.3)"}`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.9vw",
                        color: stage.active ? "#F1F5F9" : "#475569",
                        fontFamily: "var(--font-body-family)",
                        fontWeight: stage.active ? 600 : 400,
                      }}
                    >
                      {stage.label}
                    </span>
                    {stage.active && (
                      <span
                        style={{
                          fontSize: "0.7vw",
                          background: "rgba(124,58,237,0.2)",
                          color: "#A78BFA",
                          padding: "0.1vh 0.4vw",
                          borderRadius: "0.2vw",
                          fontFamily: "var(--font-body-family)",
                          fontWeight: 600,
                          marginLeft: "auto",
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>What to Notice</div>
            {[
              "Green spread badge = positive margin. Red = underwater.",
              "Each stage advance is recorded with timestamp in Stage History",
              "Risk score (0–100) driven by delay patterns and unpaid milestones",
            ].map((n, i) => (
              <div
                key={i}
                style={{
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: "1px solid rgba(124,58,237,0.15)",
                  padding: "0.7vh 1.1vw",
                  display: "flex",
                  gap: "0.7vw",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ width: "0.38vw", height: "0.38vw", borderRadius: "50%", background: "#7C3AED", flexShrink: 0, marginTop: "0.5vh" }} />
                <span style={{ fontSize: "0.9vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
