export default function Slide04OriginStory() {
  const beats = [
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none">
          <rect x="8" y="28" width="16" height="18" rx="2" stroke="#7C3AED" strokeWidth="2.2" />
          <rect x="20" y="20" width="16" height="26" rx="2" stroke="#A78BFA" strokeWidth="2.2" />
          <rect x="32" y="24" width="16" height="22" rx="2" stroke="#7C3AED" strokeWidth="2.2" />
          <path d="M4 46h48" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 8v6M24 11l4-4 4 4" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      step: "01",
      headline: "We ran sourcing",
      body: "Factories in Asia and LATAM. 50+ concurrent POs.",
    },
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="10" r="5" stroke="#A78BFA" strokeWidth="2" />
          <circle cx="10" cy="38" r="5" stroke="#7C3AED" strokeWidth="2" />
          <circle cx="46" cy="38" r="5" stroke="#7C3AED" strokeWidth="2" />
          <circle cx="28" cy="44" r="5" stroke="#A78BFA" strokeWidth="2" />
          <path d="M23 13l-8 20M33 13l8 20M28 15v24" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3" />
          <path d="M15 38h8M33 44l8-6" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3" />
          <circle cx="10" cy="38" r="2" fill="#EF4444" />
          <circle cx="46" cy="38" r="2" fill="#EF4444" />
        </svg>
      ),
      step: "02",
      headline: "6 channels, no thread",
      body: "WhatsApp, email, WeChat, SMS — all fragmented, no history.",
    },
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none">
          <path d="M28 8l4 12h13l-10.5 7.5 4 12L28 32l-10.5 7.5 4-12L11 20h13z" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 32v14" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <circle cx="28" cy="50" r="2.5" fill="#EF4444" />
        </svg>
      ),
      step: "03",
      headline: "A delay hit us late",
      body: "4 days after it happened. Expedited freight. A markdown. Both avoidable.",
    },
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="9" stroke="#7C3AED" strokeWidth="2.5" />
          <circle cx="28" cy="28" r="3" fill="#7C3AED" />
          <path d="M28 10V6M28 50v-4M10 28H6M50 28h-4" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
          <path d="M17.6 17.6l-2.8-2.8M41.2 41.2l-2.8-2.8M41.2 17.6l2.8-2.8M17.6 41.2l-2.8 2.8" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="28" cy="10" r="3" fill="#A78BFA" />
          <circle cx="28" cy="46" r="3" fill="#A78BFA" />
          <circle cx="10" cy="28" r="3" fill="#A78BFA" />
          <circle cx="46" cy="28" r="3" fill="#A78BFA" />
        </svg>
      ),
      step: "04",
      headline: "So we built it",
      body: "One hub above all channels. Zero changes for suppliers.",
    },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(124,58,237,0.1) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.05) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "5vh 8vw 4vh" }}>
        <div style={{ marginBottom: "3.5vh" }}>
          <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.2vh" }}>Origin Story</div>
          <h2 style={{ fontSize: "4.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            We built this for ourselves first.
          </h2>
        </div>

        <div style={{ display: "flex", gap: "1.5vw", flex: 1, alignItems: "stretch" }}>
          {beats.map((beat, i) => (
            <div key={beat.step} style={{ display: "flex", alignItems: "stretch", flex: 1, gap: "1.5vw" }}>
              <div style={{
                flex: 1,
                background: "#131929",
                borderRadius: "0.8vw",
                border: i === 3 ? "2px solid rgba(124,58,237,0.5)" : "1px solid rgba(124,58,237,0.18)",
                padding: "3vh 2vw",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "1.8vh",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <div style={{ fontSize: "1.1vw", fontWeight: 700, color: i === 2 ? "#EF4444" : "#475569", fontFamily: "var(--font-body-family)", letterSpacing: "0.12em" }}>{beat.step}</div>
                  {i < 3 && (
                    <div style={{ fontSize: "1.5vw", color: "#334155" }}>—</div>
                  )}
                </div>
                <div style={{ width: "4.5vw", height: "4.5vw", flexShrink: 0 }}>
                  {beat.icon}
                </div>
                <div>
                  <div style={{ fontSize: "1.7vw", fontWeight: 700, color: i === 2 ? "#FCA5A5" : "#F1F5F9", fontFamily: "var(--font-body-family)", lineHeight: 1.2, marginBottom: "0.8vh" }}>
                    {beat.headline}
                  </div>
                  <div style={{ fontSize: "1.4vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>
                    {beat.body}
                  </div>
                </div>
              </div>
              {i < beats.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12M12 6l4 4-4 4" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "3vh",
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: "0.7vw",
          padding: "2vh 2.5vw",
          display: "flex",
          alignItems: "center",
          gap: "2vw",
        }}>
          <div style={{ width: "0.25vw", height: "3.5vh", background: "#7C3AED", borderRadius: "2px", flexShrink: 0 }} />
          <p style={{ fontSize: "1.7vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontStyle: "italic", margin: 0, lineHeight: 1.45 }}>
            "The problem wasn't the suppliers or the channels. It was that we had no single place where everything landed."
          </p>
        </div>
      </div>
    </div>
  );
}
