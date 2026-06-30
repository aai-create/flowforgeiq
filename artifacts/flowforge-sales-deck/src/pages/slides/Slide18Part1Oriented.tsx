export default function Slide18Part1Oriented() {
  const actions = [
    "Sign in at flowforgeiq.com — you land on the Inbox by default",
    "Identify the sidebar: Inbox (home), Orders, RFQs, Copilot, Risk Radar",
    "Use the channel filter pills (All · Gmail · WhatsApp · WeChat · iMessage) to scope messages",
    "Click any message row to open the thread panel on the right",
    "The AI draft reply appears below the thread — edit or send as-is",
  ];

  const notices = [
    "Unread messages appear with a bold sender name and blue left border",
    "AI tags (risk, payment, milestone) appear beneath each snippet",
    "The stage pill shows which shipment stage each message belongs to",
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
            Part 1 · Screen: Inbox
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Getting Oriented
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Key Actions</div>
            {actions.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1.2vw",
                  alignItems: "flex-start",
                  background: "#131929",
                  borderRadius: "0.5vw",
                  border: "1px solid rgba(124,58,237,0.18)",
                  padding: "0.8vh 1.2vw",
                }}
              >
                <div
                  style={{
                    width: "1.4vw",
                    height: "1.4vw",
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
                  <span style={{ fontSize: "0.7vw", color: "#A78BFA", fontWeight: 700, fontFamily: "var(--font-body-family)" }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: "1.05vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{a}</span>
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
                flex: "0 0 auto",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part1-inbox-overview.jpg`}
                alt="FlowForge Inbox — channel filter pills, message list, thread panel, and AI draft reply"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>What to Notice</div>
            {notices.map((n, i) => (
              <div
                key={i}
                style={{
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: "1px solid rgba(124,58,237,0.15)",
                  padding: "0.7vh 1.1vw",
                  display: "flex",
                  gap: "0.8vw",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#7C3AED", flexShrink: 0, marginTop: "0.55vh" }} />
                <span style={{ fontSize: "1vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
