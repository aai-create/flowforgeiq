export default function Slide11Pilot() {
  const steps = [
    { week: "Week 1–2", title: "Setup & onboarding", detail: "Import your supplier list. Configure inbound email routing. Select 5–10 shipments to track. No engineering required." },
    { week: "Month 1", title: "Live on a contained workflow", detail: "Forward real supplier messages. Track real shipments. AI extraction and drafting live on actual POs — not a sandbox." },
    { week: "Month 2", title: "First feedback call", detail: "30 minutes with the founding team. What's working, what's missing, what's surprising. Your feedback shapes the product." },
    { week: "Month 3", title: "Measure and decide", detail: "Compare response times, delay detection, and manual hours before vs. after. Expand, adjust, or walk away — no lock-in." },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 60% at 85% 50%, rgba(124,58,237,0.1) 0%, transparent 65%)" }} />
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex h-full" style={{ padding: "3.5vh 7vw" }}>
        <div className="flex flex-col justify-center" style={{ flex: "0 0 40vw", paddingRight: "4vw" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Pilot Structure</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: "2vh" }}>
            3 months. No commitment. Real results.
          </h2>

          <p style={{ fontSize: "1.45vw", color: "#CBD5E1", lineHeight: 1.5, marginBottom: "2.5vh", fontFamily: "var(--font-body-family)" }}>
            We offer a 3-month free pilot because the only honest way to sell this is to let you run it on real shipments and measure the difference yourself.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.1vh" }}>
            {[
              { label: "Cost", value: "Free for 3 months" },
              { label: "Scope", value: "5–10 shipments of your choice" },
              { label: "Cadence", value: "Monthly calls with the founding team" },
              { label: "Exit", value: "No contract. Stop at any time." },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", gap: "1.2vw", alignItems: "baseline" }}>
                <div style={{ fontSize: "1.25vw", color: "#475569", fontFamily: "var(--font-body-family)", fontWeight: 600, minWidth: "7vw" }}>{item.label}</div>
                <div style={{ fontSize: "1.35vw", color: "#F1F5F9", fontFamily: "var(--font-body-family)", fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, gap: "1.2vh" }}>
          {steps.map((step, i) => (
            <div key={step.week} style={{ background: "#131929", borderRadius: "0.7vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.8vw", display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, paddingTop: "0.2vh" }}>
                <div style={{ width: "2.4vw", height: "2.4vw", background: i === 0 ? "#7C3AED" : "rgba(124,58,237,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.2vw", fontWeight: 700, color: i === 0 ? "#fff" : "#7C3AED" }}>{i + 1}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3vh" }}>{step.week}</div>
                <div style={{ fontSize: "1.4vw", fontWeight: 700, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.3vh" }}>{step.title}</div>
                <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
