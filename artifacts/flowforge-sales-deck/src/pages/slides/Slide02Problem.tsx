export default function Slide02Problem() {
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
        <div className="flex items-center" style={{ marginBottom: "1.5vh" }}>
          <span style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>The Problem</span>
        </div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          textWrap: "balance",
          marginBottom: "1.2vh",
        }}>
          Supply chains run on scattered messages.
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "5vh" }} />

        <div className="flex" style={{ gap: "2.5vw", flex: 1 }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.6vw",
            padding: "3.5vh 2.8vw",
            border: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, marginBottom: "1.5vh", letterSpacing: "-0.04em" }}>47+</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 500, color: "#F1F5F9", marginBottom: "1.2vh", fontFamily: "var(--font-body-family)" }}>Message threads</div>
            <div style={{ fontSize: "1.6vw", color: "#94A3B8", lineHeight: 1.45, fontFamily: "var(--font-body-family)" }}>Average per active shipment across email, WhatsApp, and spreadsheet chains. No shared context. No thread history.</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.6vw",
            padding: "3.5vh 2.8vw",
            border: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, marginBottom: "1.5vh", letterSpacing: "-0.04em" }}>4+</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 500, color: "#F1F5F9", marginBottom: "1.2vh", fontFamily: "var(--font-body-family)" }}>Disconnected channels</div>
            <div style={{ fontSize: "1.6vw", color: "#94A3B8", lineHeight: 1.45, fontFamily: "var(--font-body-family)" }}>Email, WhatsApp, WeChat, and shared spreadsheets — each a separate silo. Buyers context-switch constantly to stay informed.</div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.6vw",
            padding: "3.5vh 2.8vw",
            border: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "7vw", fontWeight: 700, color: "#7C3AED", lineHeight: 1, marginBottom: "1.5vh", letterSpacing: "-0.04em" }}>Days</div>
            <div style={{ fontSize: "1.8vw", fontWeight: 500, color: "#F1F5F9", marginBottom: "1.2vh", fontFamily: "var(--font-body-family)" }}>Lost to late detection</div>
            <div style={{ fontSize: "1.6vw", color: "#94A3B8", lineHeight: 1.45, fontFamily: "var(--font-body-family)" }}>Production delays and port holds go unnoticed until a shipment is already behind. By then, the window to act has closed.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
