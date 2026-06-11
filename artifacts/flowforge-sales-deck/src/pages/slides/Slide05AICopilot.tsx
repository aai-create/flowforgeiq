export default function Slide05AICopilot() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 60% at 85% 50%, rgba(124,58,237,0.1) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Feature 02</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
        }}>
          AI Copilot
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "2.5vh" }} />

        <p style={{ fontSize: "1.8vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "4vh", fontFamily: "var(--font-body-family)", maxWidth: "55vw" }}>
          The copilot reads every inbound message, extracts structured data, drafts a reply, and routes the thread — so buyers act in seconds, not minutes.
        </p>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.22)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Extract</div>
            <div style={{ fontSize: "2.8vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "2vh", letterSpacing: "-0.02em" }}>Structure from noise</div>
            <div style={{ flex: 1, fontSize: "1.6vw", color: "#94A3B8", lineHeight: 1.5, fontFamily: "var(--font-body-family)" }}>
              Reads PDFs, WhatsApp threads, and email attachments. Pulls out PO numbers, dates, quantities, and price fields — and attaches them to the right shipment record automatically.
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.22)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Draft</div>
            <div style={{ fontSize: "2.8vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "2vh", letterSpacing: "-0.02em" }}>Ready to send</div>
            <div style={{ flex: 1, fontSize: "1.6vw", color: "#94A3B8", lineHeight: 1.5, fontFamily: "var(--font-body-family)" }}>
              Generates a context-aware reply pre-populated in the compose area. The buyer reviews, edits if needed, and sends — with the shipment stage advancing on delivery.
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.22)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Route</div>
            <div style={{ fontSize: "2.8vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "2vh", letterSpacing: "-0.02em" }}>Right thread, right now</div>
            <div style={{ flex: 1, fontSize: "1.6vw", color: "#94A3B8", lineHeight: 1.5, fontFamily: "var(--font-body-family)" }}>
              Classifies every message and links it to the correct shipment thread using configurable confidence thresholds. Low-confidence matches go to Needs Review instead of routing blindly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
