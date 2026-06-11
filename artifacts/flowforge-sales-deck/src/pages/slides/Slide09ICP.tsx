export default function Slide09ICP() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Who We Serve</div>

        <h2 style={{
          fontSize: "4.5vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
          marginBottom: "1.2vh",
        }}>
          Ideal Customer Profile
        </h2>

        <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "4.5vh" }} />

        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.8vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh", fontFamily: "var(--font-body-family)" }}>Retail Buyers</div>
            <div style={{ fontSize: "2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.15, marginBottom: "2.2vh", letterSpacing: "-0.01em" }}>Brands sourcing from Asia, LATAM, or EMEA factories</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1 }}>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Managing 20–200 active POs at any given time</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Today: email threads, WhatsApp groups, shared sheets</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Painful: delayed shipments discovered too late to act</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Primary buyer: VP Supply Chain, Head of Sourcing</div>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.8vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh", fontFamily: "var(--font-body-family)" }}>Global Sourcing Teams</div>
            <div style={{ fontSize: "2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.15, marginBottom: "2.2vh", letterSpacing: "-0.01em" }}>Enterprise procurement orgs managing cross-border supplier networks</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1 }}>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Multiple buyers, multiple suppliers, one team</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Need audit trails, compliance records, and reporting</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Existing tools: ERPs that lack communication layers</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Primary buyer: COO, Director of Operations</div>
              </div>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#131929",
            borderRadius: "0.8vw",
            padding: "3.5vh 2.8vw",
            border: "1px solid rgba(124,58,237,0.25)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#7C3AED", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh", fontFamily: "var(--font-body-family)" }}>Trade Finance Intermediaries</div>
            <div style={{ fontSize: "2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.15, marginBottom: "2.2vh", letterSpacing: "-0.01em" }}>Financing firms bridging buyers and suppliers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1 }}>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Front payments to suppliers, recover from buyers</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Need full payment trail and recovery tracking</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Today: spreadsheets and disconnected bank portals</div>
              </div>
              <div style={{ display: "flex", gap: "1vw" }}>
                <div style={{ color: "#7C3AED", fontWeight: 700, fontSize: "1.6vw", flexShrink: 0 }}>—</div>
                <div style={{ fontSize: "1.6vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>Primary buyer: Finance Director, Treasury Head</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
