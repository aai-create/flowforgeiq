export default function Slide17WalkthroughCover() {
  const parts = [
    "Part 1 · Getting Oriented",
    "Part 2 · Create the RFQ",
    "Part 3 · Add Three Quotes",
    "Part 4 · Compare & Pick a Winner",
    "Part 5 · Convert to PO",
    "Part 6 · Track the Shipment",
    "Part 7 · Log a Payment",
    "Part 8 · Mobile — Paste Chat",
    "Part 9 · Mobile — Upload Document",
  ];

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 5% 50%, rgba(124,58,237,0.18) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div
        className="relative z-10 flex h-full"
        style={{ padding: "3.5vh 7vw" }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: "4vw" }}>
          <div
            style={{
              fontSize: "1.05vw",
              color: "#7C3AED",
              fontFamily: "var(--font-body-family)",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: "1.2vh",
            }}
          >
            Team Walkthrough
          </div>

          <h1
            style={{
              fontSize: "5.2vw",
              fontWeight: 700,
              color: "#F1F5F9",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: "1.8vh",
            }}
          >
            RFQ → Shipment<br />
            → Payout
          </h1>

          <div style={{ width: "5vw", height: "0.22vh", background: "#7C3AED", marginBottom: "2.2vh" }} />

          <div
            style={{
              background: "#131929",
              borderRadius: "0.7vw",
              border: "1px solid rgba(124,58,237,0.3)",
              padding: "2vh 2vw",
              maxWidth: "28vw",
            }}
          >
            <div style={{ fontSize: "1vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "1.2vh" }}>
              Scenario
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7vh" }}>
              {[
                { label: "Product", value: "Chrome Retail Hangers" },
                { label: "Supplier", value: "Tianjin Wire Works" },
                { label: "Buyer", value: "Northbound Outfitters" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", gap: "1vw", alignItems: "baseline" }}>
                  <span style={{ fontSize: "1vw", color: "#475569", fontFamily: "var(--font-body-family)", minWidth: "5.5vw" }}>{label}</span>
                  <span style={{ fontSize: "1.15vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "1.1vh",
          }}
        >
          <div style={{ fontSize: "1vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.6vh" }}>
            Roadmap — 9 Parts
          </div>
          {parts.map((part, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1vw",
                background: "#131929",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.18)",
                padding: "1.1vh 1.4vw",
              }}
            >
              <div
                style={{
                  width: "2vw",
                  height: "2vw",
                  borderRadius: "50%",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "0.85vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", fontWeight: 700 }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: "1.15vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{part}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute"
        style={{ bottom: "3.5vh", left: "7vw", display: "flex", alignItems: "center", gap: "1.5vw" }}
      >
        <span style={{ fontSize: "1.1vw", color: "#334155", fontFamily: "var(--font-body-family)" }}>flowforgeiq.com</span>
        <div style={{ width: "0.12vw", height: "1.5vh", background: "#1E293B" }} />
        <span style={{ fontSize: "1.1vw", color: "#334155", fontFamily: "var(--font-body-family)" }}>Internal Team Guide</span>
      </div>
    </div>
  );
}
