export default function Slide07RiskRadar() {
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
          background: "radial-gradient(ellipse 45% 55% at 85% 55%, rgba(124,58,237,0.1) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex h-full" style={{ padding: "6vh 8vw" }}>
        <div style={{ flex: "0 0 46vw", paddingRight: "4vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "1.2vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Feature 04</div>

          <h2 style={{
            fontSize: "4.5vw",
            fontWeight: 700,
            color: "#F1F5F9",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            marginBottom: "1.2vh",
          }}>
            Risk Radar
          </h2>

          <div style={{ width: "5vw", height: "0.25vh", background: "#7C3AED", marginBottom: "3.5vh" }} />

          <p style={{ fontSize: "1.8vw", color: "#94A3B8", lineHeight: 1.5, marginBottom: "3.5vh", fontFamily: "var(--font-body-family)" }}>
            Scores every active shipment by combining financial exposure with delay probability. High-risk orders surface at the top — so buyers act before a delay becomes a crisis.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ display: "flex", gap: "1.4vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", background: "#7C3AED", borderRadius: "50%", marginTop: "0.8vh", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Risk score = exposure x probability</div>
                <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Scores 0–100. Items above 70 are flagged red and surface first in the radar view</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.4vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", background: "#7C3AED", borderRadius: "50%", marginTop: "0.8vh", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>Top risk signal per shipment</div>
                <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Port congestion, production hold, customs delay — one plain-language signal, not a raw data dump</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.4vw", alignItems: "flex-start" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", background: "#7C3AED", borderRadius: "50%", marginTop: "0.8vh", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>One click to the inbox thread</div>
                <div style={{ fontSize: "1.5vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>Jump from a risk score directly to the supplier conversation — no separate search required</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(239,68,68,0.3)", padding: "2vh 2.2vw", display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "4vw" }}>
              <div style={{ fontSize: "3.2vw", fontWeight: 700, color: "#EF4444", lineHeight: 1, letterSpacing: "-0.04em" }}>88</div>
              <div style={{ fontSize: "1.1vw", color: "#EF4444", fontFamily: "var(--font-body-family)", fontWeight: 600 }}>HIGH</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>PO-8821 — Suzhou Mills</div>
              <div style={{ fontSize: "1.3vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Signal: port congestion · $148,000 exposure</div>
            </div>
            <div style={{ fontSize: "1.3vw", color: "#EF4444", fontFamily: "var(--font-body-family)", background: "rgba(239,68,68,0.1)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>+4d predicted</div>
          </div>

          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(234,179,8,0.25)", padding: "2vh 2.2vw", display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "4vw" }}>
              <div style={{ fontSize: "3.2vw", fontWeight: 700, color: "#EAB308", lineHeight: 1, letterSpacing: "-0.04em" }}>64</div>
              <div style={{ fontSize: "1.1vw", color: "#EAB308", fontFamily: "var(--font-body-family)", fontWeight: 600 }}>MED</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>PO-7743 — Bangkok Textiles</div>
              <div style={{ fontSize: "1.3vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Signal: production hold · $92,000 exposure</div>
            </div>
            <div style={{ fontSize: "1.3vw", color: "#EAB308", fontFamily: "var(--font-body-family)", background: "rgba(234,179,8,0.1)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>+2d predicted</div>
          </div>

          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.18)", padding: "2vh 2.2vw", display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "4vw" }}>
              <div style={{ fontSize: "3.2vw", fontWeight: 700, color: "#A78BFA", lineHeight: 1, letterSpacing: "-0.04em" }}>41</div>
              <div style={{ fontSize: "1.1vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 600 }}>LOW</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>PO-9102 — Guangdong Co.</div>
              <div style={{ fontSize: "1.3vw", color: "#94A3B8", fontFamily: "var(--font-body-family)" }}>Signal: customs review · $67,000 exposure</div>
            </div>
            <div style={{ fontSize: "1.3vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", background: "rgba(167,139,250,0.1)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>on track</div>
          </div>

          <div style={{ background: "#131929", borderRadius: "0.8vw", border: "1px solid rgba(124,58,237,0.12)", padding: "2vh 2.2vw", display: "flex", alignItems: "center", gap: "2vw", opacity: 0.5 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "4vw" }}>
              <div style={{ fontSize: "3.2vw", fontWeight: 700, color: "#64748B", lineHeight: 1, letterSpacing: "-0.04em" }}>12</div>
              <div style={{ fontSize: "1.1vw", color: "#64748B", fontFamily: "var(--font-body-family)", fontWeight: 600 }}>LOW</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "#64748B", fontFamily: "var(--font-body-family)" }}>PO-6619 — Medellin Factory</div>
              <div style={{ fontSize: "1.3vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>On schedule · $31,000 exposure</div>
            </div>
            <div style={{ fontSize: "1.3vw", color: "#475569", fontFamily: "var(--font-body-family)", background: "rgba(71,85,105,0.15)", padding: "0.4vh 0.8vw", borderRadius: "0.3vw" }}>on track</div>
          </div>
        </div>
      </div>
    </div>
  );
}
