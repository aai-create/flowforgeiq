export default function Slide05WhatItIs() {
  const capabilities = [
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="8" width="32" height="24" rx="3" stroke="#A78BFA" strokeWidth="1.8" />
          <path d="M4 14h32" stroke="#A78BFA" strokeWidth="1.8" />
          <circle cx="9" cy="11" r="1.5" fill="#7C3AED" />
          <circle cx="14" cy="11" r="1.5" fill="#7C3AED" />
          <path d="M10 20h8M10 25h14M10 30h6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="30" cy="27" r="5" fill="#7C3AED" />
          <path d="M28 27l1.5 1.5L32 25" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: "Unified Inbox",
      subtitle: "All channels, threaded by shipment",
      detail: "Email, WhatsApp, WeChat, SMS — one searchable feed, AI-tagged on arrival",
    },
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="13" stroke="#A78BFA" strokeWidth="1.8" />
          <path d="M14 20l4 4 8-8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 6V3M20 37v-3M34 20h3M3 20h3" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 12l2-2M10 30l2-2M28 28l2 2M10 10l2 2" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
      title: "AI Drafting & Extraction",
      subtitle: "Structured data from attachments; replies pre-written for review",
      detail: "AI writes, you approve — never auto-sent",
    },
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none">
          <path d="M6 34L6 16" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="12" r="3" stroke="#7C3AED" strokeWidth="1.8" />
          <circle cx="20" cy="20" r="3" stroke="#7C3AED" strokeWidth="1.8" />
          <circle cx="34" cy="10" r="3" stroke="#A78BFA" strokeWidth="1.8" />
          <path d="M9 12l8 6.5M23 19l8-7.5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 32v-16M20 28V23M34 18V13" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M4 34h36" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="28" r="2" fill="#7C3AED" opacity="0.5" />
          <circle cx="34" cy="18" r="2" fill="#A78BFA" opacity="0.5" />
        </svg>
      ),
      title: "11-Stage Pipeline",
      subtitle: "Factory quote → ex-factory, every milestone logged",
      detail: "Replying from the inbox advances the stage — no separate update",
    },
    {
      icon: (
        <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none">
          <path d="M20 6l3 9h9.5l-7.7 5.6 2.9 9-7.7-5.6-7.7 5.6 2.9-9L7.5 15H17z" stroke="#A78BFA" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M20 34v4M16 37h8" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="20" r="4" fill="rgba(124,58,237,0.2)" stroke="#7C3AED" strokeWidth="1.5" />
        </svg>
      ),
      title: "Risk & Payments",
      subtitle: "Exposure × delay probability; deposit and balance per PO",
      detail: "Surface the shipments that need attention before they escalate",
    },
  ];

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
          background: "radial-gradient(ellipse 50% 60% at 100% 50%, rgba(124,58,237,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "5vh 8vw 4vh" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "3.5vh" }}>
          <div>
            <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1vh" }}>What FlowForge Does</div>
            <h2 style={{ fontSize: "4vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
              One workspace for every<br />buyer-supplier conversation.
            </h2>
          </div>
          <div style={{ textAlign: "right", maxWidth: "28vw", paddingBottom: "0.4vh" }}>
            <p style={{ fontSize: "1.55vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45, margin: 0 }}>
              Sits above your existing channels. Suppliers change nothing. You get structure, history, and AI on every message.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.8vw", flex: 1 }}>
          {capabilities.map((cap) => (
            <div key={cap.title} style={{
              background: "#131929",
              borderRadius: "0.8vw",
              border: "1px solid rgba(124,58,237,0.2)",
              padding: "2.5vh 2.2vw",
              display: "flex",
              gap: "2vw",
              alignItems: "flex-start",
            }}>
              <div style={{ width: "3.2vw", height: "3.2vw", flexShrink: 0, marginTop: "0.2vh" }}>
                {cap.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.75vw", fontWeight: 700, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh", lineHeight: 1.2 }}>{cap.title}</div>
                <div style={{ fontSize: "1.4vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.8vh", lineHeight: 1.3 }}>{cap.subtitle}</div>
                <div style={{ fontSize: "1.3vw", color: "#475569", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{cap.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "2.5vh",
          display: "flex",
          alignItems: "center",
          gap: "0",
          background: "rgba(124,58,237,0.07)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: "0.6vw",
          overflow: "hidden",
        }}>
          <div style={{ background: "#7C3AED", padding: "1.4vh 2vw", fontSize: "1.2vw", fontWeight: 700, color: "#fff", fontFamily: "var(--font-body-family)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Key differentiator
          </div>
          <div style={{ padding: "1.4vh 2vw", fontSize: "1.5vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>
            Zero supplier onboarding. They keep their tools. You get the structure.
          </div>
          <div style={{ marginLeft: "auto", padding: "1.4vh 2vw", display: "flex", gap: "1.2vw 2vw", flexWrap: "wrap" }}>
            {["Not a new channel", "Not an ERP", "Not passive monitoring"].map((item) => (
              <div key={item} style={{ display: "flex", gap: "0.5vw", alignItems: "center" }}>
                <span style={{ color: "#475569", fontSize: "1.3vw", fontWeight: 700 }}>×</span>
                <span style={{ fontSize: "1.3vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
