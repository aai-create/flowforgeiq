export default function Slide04UnifiedInbox() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ flex: "0 0 46vw", paddingRight: "4vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Feature 01</div>

          <h2 style={{
            fontSize: "4.5vw",
            fontWeight: 700,
            color: "#F1F5F9",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            marginBottom: "1.2vh",
          }}>
            Unified Inbox
          </h2>

          <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "3.5vh" }} />

          <p style={{ fontSize: "1.8vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "3.5vh", fontFamily: "var(--font-body-family)" }}>
            Every message from every channel — email, WhatsApp, PDF attachments, and spreadsheet uploads — flows into one unified, searchable feed, threaded by shipment.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2.2vh" }}>
            <div style={{ display: "flex", gap: "1.4vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", background: "#7C3AED", borderRadius: "50%", marginTop: "0.8vh", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>Filter by channel, supplier, or shipment</div>
                <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Surface exactly what needs attention, with no manual sorting</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.4vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", background: "#7C3AED", borderRadius: "50%", marginTop: "0.8vh", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>AI-tagged messages on arrival</div>
                <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Delay risks, quote confirmations, and payment queries identified instantly</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.4vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", background: "#7C3AED", borderRadius: "50%", marginTop: "0.8vh", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.4vh" }}>Reply advances the shipment stage</div>
                <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Sending a reply clears the related task automatically — no separate update needed</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5vh" }}>
          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.25)", padding: "2vh 2.2vw", display: "flex", gap: "1.5vw", alignItems: "center" }}>
            <div style={{ width: "2.5vw", height: "2.5vw", background: "rgba(124,58,237,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "1vw", height: "1vw", background: "#7C3AED", borderRadius: "50%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Suzhou Mills — PO-8821</div>
              <div style={{ fontSize: "1.3vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>WhatsApp · Production update received</div>
            </div>
            <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", background: "rgba(124,58,237,0.15)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>risk: delay 2d</div>
          </div>

          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.18)", padding: "2vh 2.2vw", display: "flex", gap: "1.5vw", alignItems: "center" }}>
            <div style={{ width: "2.5vw", height: "2.5vw", background: "rgba(124,58,237,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "1vw", height: "1vw", background: "#A78BFA", borderRadius: "50%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Bangkok Textiles — PO-7743</div>
              <div style={{ fontSize: "1.3vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Email · Factory quote attached</div>
            </div>
            <div style={{ fontSize: "1.2vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", background: "rgba(167,139,250,0.12)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>quote: review</div>
          </div>

          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.18)", padding: "2vh 2.2vw", display: "flex", gap: "1.5vw", alignItems: "center" }}>
            <div style={{ width: "2.5vw", height: "2.5vw", background: "rgba(124,58,237,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: "1vw", height: "1vw", background: "#A78BFA", borderRadius: "50%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Guangdong Co. — PO-9102</div>
              <div style={{ fontSize: "1.3vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Email · Shipping docs uploaded</div>
            </div>
            <div style={{ fontSize: "1.2vw", color: "#64748B", fontFamily: "var(--font-body-family)", background: "rgba(100,116,139,0.15)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>docs: attached</div>
          </div>

          <div style={{ background: "#0E1220", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.12)", padding: "2vh 2.2vw", display: "flex", gap: "1.5vw", alignItems: "center", opacity: 0.6 }}>
            <div style={{ width: "2.5vw", height: "2.5vw", background: "rgba(100,116,139,0.15)", borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#64748B", fontFamily: "var(--font-body-family)" }}>Medellin Factory — PO-6619</div>
              <div style={{ fontSize: "1.3vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>WhatsApp · Delivery confirmed</div>
            </div>
            <div style={{ fontSize: "1.2vw", color: "#475569", fontFamily: "var(--font-body-family)", background: "rgba(71,85,105,0.15)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>delivered</div>
          </div>

          <div style={{ marginTop: "1vh", padding: "1.5vh 2vw", background: "rgba(124,58,237,0.08)", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div style={{ fontSize: "1.5vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontStyle: "italic" }}>
              "Re: PO-8821 — Understood. I'll confirm with the factory on the new timeline and get back to you by end of day." (AI-drafted)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
