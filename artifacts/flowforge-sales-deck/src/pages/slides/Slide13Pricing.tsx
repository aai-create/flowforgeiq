export default function Slide13Pricing() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.09) 0%, transparent 65%)" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "2vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Pricing</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: "0.6vh" }}>
            Founding member pricing.
          </h2>
          <p style={{ fontSize: "1.3vw", color: "#64748B", fontFamily: "var(--font-body-family)", margin: 0, lineHeight: 1.4 }}>
            Teams that pilot with us and convert lock in founding pricing for the life of their subscription.
          </p>
        </div>

        <div style={{ display: "flex", gap: "2vw", flex: 1, minHeight: 0 }}>
          {/* Monthly */}
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2vw", border: "1px solid rgba(124,58,237,0.2)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>Monthly</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5vw", marginBottom: "0.3vh" }}>
              <div style={{ fontSize: "5vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, letterSpacing: "-0.04em" }}>$99</div>
              <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>/month</div>
            </div>
            <div style={{ fontSize: "1.2vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginBottom: "1.8vh" }}>Founding member rate</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh", flex: 1 }}>
              {[
                "Full product access — all modules included",
                "Unlimited active shipments during pilot",
                "Up to 50 supplier relationships",
                "All channels: email, WhatsApp, PDF, WeChat",
                "Monthly calls with the founding team",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.8vw", alignItems: "flex-start" }}>
                  <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.3vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                  <div style={{ fontSize: "1.25vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Annual */}
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2vw", border: "2px solid rgba(124,58,237,0.55)", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: "-1.4vh", left: "50%", transform: "translateX(-50%)", background: "#7C3AED", borderRadius: "2vw", padding: "0.3vh 1.2vw", fontSize: "1.1vw", color: "#fff", fontFamily: "var(--font-body-family)", fontWeight: 700, whiteSpace: "nowrap" }}>Best value</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>Annual</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5vw", marginBottom: "0.3vh" }}>
              <div style={{ fontSize: "5vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, letterSpacing: "-0.04em" }}>$1,000</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "1.8vh" }}>
              <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>/year — founding member rate</div>
              <div style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: "0.3vw", padding: "0.2vh 0.6vw", fontSize: "1.1vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 600, whiteSpace: "nowrap" }}>2 months free</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh", flex: 1 }}>
              {[
                "Everything in monthly — same full access",
                "Founding pricing locked for life of subscription",
                "Priority access to new features and localization",
                "First access to supplier directory at launch",
                "Annual review with the product team",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.8vw", alignItems: "flex-start" }}>
                  <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.3vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                  <div style={{ fontSize: "1.25vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise */}
          <div style={{ flex: 1, background: "#131929", borderRadius: "0.8vw", padding: "2vh 2vw", border: "1px solid rgba(124,58,237,0.2)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#64748B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh", fontFamily: "var(--font-body-family)" }}>Enterprise & Custom</div>
            <div style={{ fontSize: "3.8vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1, marginBottom: "0.3vh", letterSpacing: "-0.03em" }}>Scoped</div>
            <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", marginBottom: "1.8vh" }}>contact us to scope</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh", flex: 1 }}>
              {[
                "SSO and custom auth configurations",
                "SAP / Oracle / NetSuite integrations",
                "Dedicated onboarding and SLA",
                "Unlimited shipments and suppliers",
                "Custom integrations priced separately",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: "0.8vw", alignItems: "flex-start" }}>
                  <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.3vw", flexShrink: 0, lineHeight: 1.4 }}>+</div>
                  <div style={{ fontSize: "1.25vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1.5vh", fontSize: "1.1vw", color: "#475569", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>
              Custom integrations scoped and priced separately from the base subscription.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
