export default function Slide03Solution() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 55% 70% at 90% 50%, rgba(124,58,237,0.12) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex h-full" style={{ padding: "6vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ flex: "0 0 48vw", paddingRight: "4vw" }}>
          <div className="flex items-center" style={{ marginBottom: "1.5vh" }}>
            <span style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>The Solution</span>
          </div>

          <h2 style={{
            fontSize: "4vw",
            fontWeight: 700,
            color: "#F1F5F9",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            textWrap: "balance",
            marginBottom: "1.2vh",
          }}>
            One hub for the entire supply chain.
          </h2>

          <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "3.5vh" }} />

          <p style={{ fontSize: "1.8vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "4vh", fontFamily: "var(--font-body-family)", maxWidth: "40vw" }}>
            FlowForge consolidates every buyer-supplier interaction — from first quote to final payment — into a single shared workspace.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.3vw", height: "2.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: "1.8vw", color: "#F1F5F9", fontWeight: 500, fontFamily: "var(--font-body-family)" }}>Unified Inbox — all channels, one feed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.3vw", height: "2.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: "1.8vw", color: "#F1F5F9", fontWeight: 500, fontFamily: "var(--font-body-family)" }}>AI Copilot — extract, draft, route automatically</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.3vw", height: "2.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: "1.8vw", color: "#F1F5F9", fontWeight: 500, fontFamily: "var(--font-body-family)" }}>Stage Tracker — 11-stage shipment pipeline</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.3vw", height: "2.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: "1.8vw", color: "#F1F5F9", fontWeight: 500, fontFamily: "var(--font-body-family)" }}>Risk Radar — score and flag delays early</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
              <div style={{ width: "0.3vw", height: "2.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: "1.8vw", color: "#F1F5F9", fontWeight: 500, fontFamily: "var(--font-body-family)" }}>Payment Orchestration — deposits, balances, financing</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, paddingLeft: "2vw", gap: "2vh" }}>
          <div style={{
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.35)",
            borderRadius: "0.8vw",
            padding: "2.2vh 2vw",
            display: "flex",
            alignItems: "center",
            gap: "1.5vw",
          }}>
            <div style={{ fontSize: "2.2vw", fontWeight: 700, color: "#7C3AED", minWidth: "3.5vw" }}>01</div>
            <div>
              <div style={{ fontSize: "1.7vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Unified Inbox</div>
              <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Email · WhatsApp · PDF · Sheets</div>
            </div>
          </div>
          <div style={{
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "0.8vw",
            padding: "2.2vh 2vw",
            display: "flex",
            alignItems: "center",
            gap: "1.5vw",
          }}>
            <div style={{ fontSize: "2.2vw", fontWeight: 700, color: "#7C3AED", minWidth: "3.5vw" }}>02</div>
            <div>
              <div style={{ fontSize: "1.7vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>AI Copilot</div>
              <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Extract · Draft · Route</div>
            </div>
          </div>
          <div style={{
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "0.8vw",
            padding: "2.2vh 2vw",
            display: "flex",
            alignItems: "center",
            gap: "1.5vw",
          }}>
            <div style={{ fontSize: "2.2vw", fontWeight: 700, color: "#7C3AED", minWidth: "3.5vw" }}>03</div>
            <div>
              <div style={{ fontSize: "1.7vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Stage Tracker</div>
              <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>11 milestones · full audit trail</div>
            </div>
          </div>
          <div style={{
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "0.8vw",
            padding: "2.2vh 2vw",
            display: "flex",
            alignItems: "center",
            gap: "1.5vw",
          }}>
            <div style={{ fontSize: "2.2vw", fontWeight: 700, color: "#7C3AED", minWidth: "3.5vw" }}>04</div>
            <div>
              <div style={{ fontSize: "1.7vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Risk Radar</div>
              <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Financial exposure scoring</div>
            </div>
          </div>
          <div style={{
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "0.8vw",
            padding: "2.2vh 2vw",
            display: "flex",
            alignItems: "center",
            gap: "1.5vw",
          }}>
            <div style={{ fontSize: "2.2vw", fontWeight: 700, color: "#7C3AED", minWidth: "3.5vw" }}>05</div>
            <div>
              <div style={{ fontSize: "1.7vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Payment Orchestration</div>
              <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Deposit · Balance · Intermediary</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
