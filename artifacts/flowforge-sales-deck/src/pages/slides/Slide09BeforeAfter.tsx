export default function Slide09BeforeAfter() {
  const beforeItems = [
    { label: "Communication", detail: "6 parallel threads per shipment across WhatsApp, email, and shared sheets — no unified history" },
    { label: "Delay detection", detail: "Found out 3–5 days after the fact, when it's too late to reroute or renegotiate" },
    { label: "Updates", detail: "Manual — reply to supplier, then update the sheet, then message the team separately" },
    { label: "Status visibility", detail: "Whoever last checked the thread knows. Everyone else is guessing." },
    { label: "Document handling", detail: "PDFs in email attachments. Re-keyed by hand into the ERP or spreadsheet." },
  ];

  const afterItems = [
    { label: "Communication", detail: "One thread per shipment. All channels land there. Full context, always available to the whole team." },
    { label: "Delay detection", detail: "Risk scored on arrival. High-exposure delays surface before they become crises." },
    { label: "Updates", detail: "Reply once. Stage tracker advances automatically. Team sees it in real time." },
    { label: "Status visibility", detail: "Any team member can open FlowForge and see exactly where every shipment stands." },
    { label: "Document handling", detail: "Attachments extracted automatically. PO fields populated. No re-keying." },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "3.5vw 3.5vw" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 7vw" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <div style={{ fontSize: "1.1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Before / After</div>
          <h2 style={{ fontSize: "3.2vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            The same team. A different operating model.
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1vh", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "0.3vh" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", background: "#EF4444", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#EF4444", fontFamily: "var(--font-body-family)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Before FlowForge</div>
            </div>
            {beforeItems.map((item) => (
              <div key={item.label} style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(239,68,68,0.2)", padding: "1.2vh 1.5vw", flex: 1 }}>
                <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#CBD5E1", fontFamily: "var(--font-body-family)", marginBottom: "0.3vh" }}>{item.label}</div>
                <div style={{ fontSize: "1.2vw", color: "#64748B", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ width: "0.15vw", background: "rgba(124,58,237,0.2)", borderRadius: "1px", flexShrink: 0 }} />

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1vh", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "0.3vh" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", background: "#7C3AED", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#A78BFA", fontFamily: "var(--font-body-family)", letterSpacing: "0.08em", textTransform: "uppercase" }}>With FlowForge</div>
            </div>
            {afterItems.map((item) => (
              <div key={item.label} style={{ background: "#131929", borderRadius: "0.6vw", border: "1px solid rgba(124,58,237,0.25)", padding: "1.2vh 1.5vw", flex: 1 }}>
                <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#CBD5E1", fontFamily: "var(--font-body-family)", marginBottom: "0.3vh" }}>{item.label}</div>
                <div style={{ fontSize: "1.2vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
