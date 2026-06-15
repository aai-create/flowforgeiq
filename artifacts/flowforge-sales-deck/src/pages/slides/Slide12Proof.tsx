export default function Slide12Proof() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "2vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Proof</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: "0.6vh" }}>
            What pilot proof will look like.
          </h2>
          <p style={{ fontSize: "1.35vw", color: "#64748B", fontFamily: "var(--font-body-family)", margin: 0, lineHeight: 1.4, maxWidth: "55vw" }}>
            We don't have testimonials yet — we're being deliberate about who we pilot with. Here's exactly how we'll measure and document results.
          </p>
        </div>

        <div style={{ display: "flex", gap: "2vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1vh", minHeight: 0 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>What gets measured</div>
            {[
              { metric: "Response time", desc: "Average hours from supplier message to buyer reply — before and after" },
              { metric: "Delay detection lag", desc: "Days between when a delay occurred and when the buyer became aware" },
              { metric: "Manual tracking hours", desc: "Time spent on status updates, spreadsheet entries, and team sync" },
              { metric: "Thread fragmentation", desc: "Number of tools touched per shipment, per week" },
            ].map((item) => (
              <div key={item.metric} style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.2)", padding: "1.2vh 1.6vw", flex: 1 }}>
                <div style={{ fontSize: "1.35vw", fontWeight: 700, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.3vh" }}>{item.metric}</div>
                <div style={{ fontSize: "1.2vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1vh", minHeight: 0 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>How we'll document it</div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.6vw", flex: 1 }}>
              <div style={{ fontSize: "1.35vw", fontWeight: 700, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "1vh" }}>Anonymized case study format</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh" }}>
                {[
                  "Company type and size (not name) — e.g. retail brand, 60 POs, 3-person team",
                  "Baseline metrics captured in week 1 before FlowForge goes live",
                  "Month 1, 2, and 3 snapshots vs. baseline",
                  "One-paragraph qualitative: what changed operationally",
                  "Shared only with your approval — you control what we publish",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", gap: "0.8vw" }}>
                    <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.3vw", flexShrink: 0, lineHeight: 1.4 }}>→</div>
                    <div style={{ fontSize: "1.25vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(124,58,237,0.08)", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.25)", padding: "1.5vh 1.6vw" }}>
              <div style={{ fontSize: "1.35vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", lineHeight: 1.5, fontStyle: "italic" }}>
                "We'd rather show you one real before/after from a team like yours than ten testimonials from teams you can't relate to."
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
