export default function Slide08Payments() {
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
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Feature 05</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
        }}>
          Payment Orchestration
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "2.5vh" }} />

        <p style={{ fontSize: "1.8vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "3.5vh", fontFamily: "var(--font-body-family)", maxWidth: "62vw" }}>
          Tracks every deposit and balance payment per shipment — with due dates, reference numbers, and wire confirmations — and supports a three-party intermediary financing model.
        </p>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ fontSize: "1.4vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>Standard Payments</div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.25)", padding: "2.2vh 2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "1.6vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Deposit — 30%</div>
                <div style={{ fontSize: "1.35vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Due before production starts</div>
              </div>
              <div style={{ fontSize: "1.3vw", color: "#22C55E", fontFamily: "var(--font-body-family)", background: "rgba(34,197,94,0.12)", padding: "0.5vh 1vw", borderRadius: "0.4vw" }}>Paid Jun 3</div>
            </div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.2)", padding: "2.2vh 2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "1.6vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Balance — 70%</div>
                <div style={{ fontSize: "1.35vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Due on confirmed ex-factory</div>
              </div>
              <div style={{ fontSize: "1.3vw", color: "#EAB308", fontFamily: "var(--font-body-family)", background: "rgba(234,179,8,0.12)", padding: "0.5vh 1vw", borderRadius: "0.4vw" }}>Due Jul 18</div>
            </div>

            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.5, marginTop: "0.5vh" }}>
              Each payment records amount in USD, date paid, reference number, and wire method. The Finance calendar shows all upcoming due dates across every active shipment on one grid.
            </div>
          </div>

          <div style={{ width: "0.15vw", background: "rgba(124,58,237,0.2)", borderRadius: "1px" }} />

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ fontSize: "1.4vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>Intermediary Financing</div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.25)", padding: "2.2vh 2vw" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "1.5vh" }}>Three-party model</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
                <div style={{ display: "flex", gap: "1vw", alignItems: "center" }}>
                  <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#7C3AED", fontFamily: "var(--font-body-family)", minWidth: "9vw" }}>Buyer</div>
                  <div style={{ fontSize: "1.4vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Commits 40% — frees working capital</div>
                </div>
                <div style={{ display: "flex", gap: "1vw", alignItems: "center" }}>
                  <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#7C3AED", fontFamily: "var(--font-body-family)", minWidth: "9vw" }}>Intermediary</div>
                  <div style={{ fontSize: "1.4vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Fronts 60% to supplier immediately</div>
                </div>
                <div style={{ display: "flex", gap: "1vw", alignItems: "center" }}>
                  <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#7C3AED", fontFamily: "var(--font-body-family)", minWidth: "9vw" }}>Supplier</div>
                  <div style={{ fontSize: "1.4vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Starts production without waiting</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.5 }}>
              The Recovery panel tracks total advanced, recovered, and outstanding across all shipments. Recovery updates automatically when the buyer remits the outstanding balance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
