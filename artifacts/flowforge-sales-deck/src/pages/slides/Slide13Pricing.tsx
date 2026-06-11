export default function Slide13Pricing() {
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
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.09) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Pricing</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "0.8vh",
        }}>
          Packaging
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "1.5vh" }} />

        <p style={{ fontSize: "1.6vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginBottom: "3.5vh" }}>Pricing confirmed during scoping. Tiers shown reflect capability boundaries, not final figures.</p>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh", fontFamily: "var(--font-body-family)" }}>Starter</div>
            <div style={{ fontSize: "4.5vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "0.6vh", letterSpacing: "-0.03em" }}>$—</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginBottom: "2.5vh" }}>per month</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1 }}>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Up to 25 active shipments</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Unified Inbox + Stage Tracker</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Up to 5 suppliers</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Email + PDF channels</div>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "2px solid rgba(124,58,237,0.55)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: "-1.5vh",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#7C3AED",
              borderRadius: "2vw",
              padding: "0.4vh 1.5vw",
              fontSize: "1.2vw",
              color: "#fff",
              fontFamily: "var(--font-body-family)",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}>Most Popular</div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh", fontFamily: "var(--font-body-family)" }}>Growth</div>
            <div style={{ fontSize: "4.5vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "0.6vh", letterSpacing: "-0.03em" }}>$—</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginBottom: "2.5vh" }}>per month</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1 }}>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Up to 150 active shipments</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>All features incl. AI Copilot + Risk Radar</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Up to 30 suppliers</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>All channels + Payment Orchestration</div>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.5vw",
            border: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh", fontFamily: "var(--font-body-family)" }}>Enterprise</div>
            <div style={{ fontSize: "4.5vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "0.6vh", letterSpacing: "-0.03em" }}>Custom</div>
            <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginBottom: "2.5vh" }}>contact sales</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1 }}>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Unlimited shipments and suppliers</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>SSO + custom integrations</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Dedicated onboarding + SLA</div>
              </div>
              <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Intermediary financing module</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
