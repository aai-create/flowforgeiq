export default function Slide14Roadmap() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 65% at 90% 50%, rgba(124,58,237,0.1) 0%, transparent 65%)" }} />
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex h-full" style={{ padding: "3.5vh 7vw" }}>
        <div className="flex flex-col justify-center" style={{ flex: "0 0 40vw", paddingRight: "4vw" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Roadmap</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", marginBottom: "2vh" }}>
            Where FlowForge goes next.
          </h2>

          <p style={{ fontSize: "1.45vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "2.5vh", fontFamily: "var(--font-body-family)" }}>
            We're focused on making the core workflow excellent before expanding. These are the next chapters — shared so you can see the upside without muddying the current story.
          </p>

          <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "0.6vw", padding: "1.8vh 2vw" }}>
            <div style={{ fontSize: "1.45vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", lineHeight: 1.5, fontStyle: "italic" }}>
              "The current product is the wedge. The roadmap is the platform."
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, gap: "1.8vh" }}>
          {[
            { horizon: "Near-term", color: "#7C3AED", title: "Supplier directory & marketplace", detail: "A verified directory of factories and agents — searchable by category, geography, and MOQ. Buyers discover new suppliers without leaving FlowForge." },
            { horizon: "Mid-term", color: "#A78BFA", title: "Localization — 中文 · 한국어", detail: "Full UI and AI drafting in Simplified Chinese, Traditional Chinese, and Korean. Removes the translation layer from the drafting step entirely." },
            { horizon: "Longer horizon", color: "#475569", title: "Industry expansion", detail: "The same fragmented communication problem exists in electronics, furniture, food, and industrial goods. We'll expand category by category." },
          ].map((item) => (
            <div key={item.horizon} style={{ background: "#131929", borderRadius: "0.8vw", border: `1px solid ${item.color === "#475569" ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.3)"}`, padding: "2vh 2.2vw" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.8vh" }}>
                <div style={{ width: "0.5vw", height: "0.5vw", background: item.color, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ fontSize: "1.05vw", fontWeight: 700, color: item.color, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>{item.horizon}</div>
              </div>
              <div style={{ fontSize: "1.6vw", fontWeight: 700, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.6vh" }}>{item.title}</div>
              <div style={{ fontSize: "1.3vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
