export default function Slide22Part5ConvertPO() {
  const fields = [
    { label: "Accepted Quote", value: "Tianjin Wire Works · $0.87", required: true },
    { label: "PO Number", value: "PO-2026-HANGERS-001", required: true },
    { label: "Due Date", value: "8 weeks from today", required: true },
    { label: "Ex-Factory Date", value: "6 weeks from today", required: true },
    { label: "Destination", value: "Chicago, IL", required: true },
    { label: "Via", value: "OCEAN", required: false },
    { label: "Deposit %", value: "30%", required: false },
  ];

  const steps = [
    'In the Quotes tab, click "Convert to PO" on the Tianjin Wire Works row',
    'The Convert to PO dialog opens — select the winning quote from the dropdown',
    "Enter a PO number (e.g. PO-2026-HANGERS-001) and confirm supplier",
    "Set Due Date (delivery deadline) and Ex-Factory Date",
    "Enter Destination and Via (OCEAN / AIR) — set Deposit % to 30",
    'Click "Convert" — FlowForge creates the shipment and marks the RFQ as Awarded',
    "You are redirected to the Orders grid with the new PO highlighted",
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
            Part 5 · Screen: Convert-to-PO Dialog
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Convert to PO
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "0.7vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)", marginBottom: "0.1vh" }}>Steps</div>
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
                  padding: "0.65vh 1.1vw",
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
                <span style={{ fontSize: "0.95vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.35 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 0.9, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Screen Preview</div>
            <div
              style={{
                borderRadius: "0.6vw",
                border: "1px solid rgba(124,58,237,0.3)",
                overflow: "hidden",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part5-convert-to-po.jpg`}
                alt="FlowForge Convert-to-PO dialog with PO number, due dates, destination, and deposit percentage"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Dialog Fields</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.22)",
                padding: "0.9vh 1.2vw",
                display: "flex",
                flexDirection: "column",
                gap: "0.55vh",
              }}
            >
              {fields.map(({ label, value, required }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(124,58,237,0.08)", paddingBottom: "0.5vh" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3vw" }}>
                    <span style={{ fontSize: "0.85vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{label}</span>
                    {required && <span style={{ fontSize: "0.7vw", color: "#7C3AED" }}>*</span>}
                  </div>
                  <span style={{ fontSize: "0.9vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
