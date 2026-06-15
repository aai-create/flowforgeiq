export default function Slide06Workflow() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />
      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>How It Fits</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Suppliers change nothing. You change everything.
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.2vh", minHeight: 0 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>How messages arrive</div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>Forward from WhatsApp / WeChat / iMessage</div>
              <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Export or screenshot a chat and paste into FlowForge. AI extracts the structured content and routes it to the right shipment thread. No native integration needed.</div>
            </div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>Email via Postmark inbound</div>
              <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Forward supplier emails to your FlowForge address. Attachments and PDFs extracted automatically, linked to the correct PO.</div>
            </div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>Mobile companion for on-the-go</div>
              <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>Paste and preview chat exports from your phone — useful at trade shows, markets, and factory floors.</div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.2vh", minHeight: 0 }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>What we're honest about</div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>No passive chat monitoring</div>
              <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>FlowForge doesn't silently read your WhatsApp or WeChat groups. Ingestion is buyer-initiated — a deliberate design choice for compliance and trust.</div>
            </div>

            <div style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.22)", padding: "1.5vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>Downstream ERP/systems integration is a scoped project</div>
              <div style={{ fontSize: "1.25vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>ERP connections are possible and supported — but priced separately from standard tiers. We say this upfront so expectations are set correctly.</div>
            </div>

            <div style={{ background: "rgba(124,58,237,0.08)", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.25)", padding: "1.5vh 1.8vw", flex: 1 }}>
              <div style={{ fontSize: "1.4vw", fontWeight: 600, color: "#A78BFA", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>The honest pitch</div>
              <div style={{ fontSize: "1.25vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.45 }}>We make your existing stack more useful — not the platform that replaces it all. Start with 5 shipments in 2 weeks. Prove it before you commit.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
