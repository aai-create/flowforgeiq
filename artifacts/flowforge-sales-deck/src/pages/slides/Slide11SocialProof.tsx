export default function Slide11SocialProof() {
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
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Platform Scale</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
        }}>
          Real workloads. Real complexity.
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "4.5vh" }} />

        <div style={{ display: "flex", gap: "2.5vw", marginBottom: "3.5vh" }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1.2vh" }}>500+</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>Shipments tracked</div>
            <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Across active, in-transit, and completed POs</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1.2vh" }}>40+</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>Supplier relationships</div>
            <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Factories across Asia, LATAM, and EMEA</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1.2vh" }}>11</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>Pipeline stages</div>
            <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>From spec sheet to delivered, every milestone captured</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1.2vh" }}>2</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>Payment tiers</div>
            <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Deposit and balance, with intermediary financing support</div>
          </div>
        </div>

        <div style={{
          background: "rgba(124,58,237,0.08)",
          borderRadius: "0.8vw",
          padding: "2.5vh 2.5vw",
          border: "1px solid rgba(124,58,237,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "2vw",
        }}>
          <div style={{ width: "0.3vw", height: "5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
          <div style={{ fontSize: "1.7vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>
            Built on real F21 shipping data — 500+ SKU-level shipments spanning 5 years, spanning factories in 8 countries. The platform handles the complexity that actually exists in global sourcing, not a simplified demo scenario.
          </div>
        </div>
      </div>
    </div>
  );
}
