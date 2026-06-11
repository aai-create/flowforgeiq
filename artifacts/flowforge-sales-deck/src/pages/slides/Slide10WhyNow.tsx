export default function Slide10WhyNow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(124,58,237,0.1) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex flex-col justify-center h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Market Context</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
          maxWidth: "65vw",
        }}>
          The window to act is now.
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "5vh" }} />

        <div style={{ display: "flex", gap: "2.5vw" }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
          }}>
            <div style={{ fontSize: "4vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, marginBottom: "1.5vh", letterSpacing: "-0.03em" }}>AI</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>Procurement is going AI-first</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", lineHeight: 1.45, fontFamily: "var(--font-body-family)" }}>Buyers expect intelligent document extraction and drafted responses as table stakes — not differentiators. Teams that adopt AI tools outpace those that don't on response time and error rate.</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
          }}>
            <div style={{ fontSize: "4vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, marginBottom: "1.5vh", letterSpacing: "-0.03em" }}>Visibility</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>Supply chain visibility is a board-level priority</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", lineHeight: 1.45, fontFamily: "var(--font-body-family)" }}>Post-2020 disruptions pushed real-time shipment tracking from a logistics feature to a C-suite requirement. Brands that can't see their supply chain in real time are operationally exposed.</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.25)",
          }}>
            <div style={{ fontSize: "4vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, marginBottom: "1.5vh", letterSpacing: "-0.03em" }}>Fragility</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>Legacy processes are showing their limits</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", lineHeight: 1.45, fontFamily: "var(--font-body-family)" }}>Email threads and spreadsheets worked at low volume. At 50+ concurrent shipments they become unmanageable. Growth creates urgency to consolidate.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
