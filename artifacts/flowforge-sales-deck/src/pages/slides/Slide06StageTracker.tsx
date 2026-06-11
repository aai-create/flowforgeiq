export default function Slide06StageTracker() {
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
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Feature 03</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
        }}>
          Stage Tracker
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "2.5vh" }} />

        <p style={{ fontSize: "1.8vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "3.5vh", fontFamily: "var(--font-body-family)", maxWidth: "58vw" }}>
          Every shipment advances through 11 defined milestones from factory quote to final delivery. Each stage change is logged with a timestamp and optional note — a full audit trail, always available.
        </p>

        <div style={{ position: "relative", marginBottom: "3.5vh" }}>
          <div style={{ position: "absolute", top: "1.1vh", left: "0", right: "0", height: "0.2vh", background: "rgba(124,58,237,0.25)" }} />

          <div style={{ display: "flex", gap: "0", position: "relative" }}>
            {["Spec Sheet","Factory Quote","PO Issued","Deposit Due","Production","QC Check","Ex-Factory","In Transit","Customs","Arrived","Delivered"].map((stage, i) => (
              <div key={stage} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2vh" }}>
                <div style={{
                  width: "2.2vh",
                  height: "2.2vh",
                  borderRadius: "50%",
                  background: i <= 5 ? "#7C3AED" : i === 6 ? "#A78BFA" : "rgba(124,58,237,0.25)",
                  border: i === 6 ? "2px solid #A78BFA" : i > 6 ? "2px solid rgba(124,58,237,0.35)" : "none",
                  zIndex: 2,
                  position: "relative",
                  flexShrink: 0,
                }} />
                <div style={{
                  fontSize: "1.2vw",
                  color: i <= 5 ? "#F1F5F9" : i === 6 ? "#A78BFA" : "#475569",
                  fontFamily: "var(--font-body-family)",
                  fontWeight: i <= 6 ? 600 : 400,
                  textAlign: "center",
                  lineHeight: 1.3,
                }}>
                  {stage}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "2.5vw" }}>
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.6vw", padding: "2.5vh 2vw", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>Advance with a note</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>One-click stage advancement with an optional logged note — "QC passed, container booked" — stored in the audit trail forever.</div>
          </div>
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.6vw", padding: "2.5vh 2vw", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>Full history, always</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Every stage transition is timestamped. Finance and ops teams can reconstruct exactly what happened on any shipment, months later.</div>
          </div>
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.6vw", padding: "2.5vh 2vw", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#A78BFA", marginBottom: "0.8vh", fontFamily: "var(--font-body-family)" }}>Tasks clear on reply</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Sending a reply from the Inbox automatically clears the related stage task — no duplicate updates required across tools.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
