export default function Slide25Part8MobileChat() {
  const steps = [
    "Open FlowForge Mobile on your phone (iOS or Android)",
    'Tap the "Capture" tab (lightning icon) at the bottom',
    "Select your channel: tap the WhatsApp pill (or WeChat, iMessage, SMS)",
    "Open WhatsApp → long-press the factory conversation → Export Chat",
    "Share the exported text to FlowForge Mobile — it auto-pastes into the field",
    "Optionally set a Sender Hint (factory name) and link to a Shipment",
    'Tap "Submit for Routing" — the AI engine analyses the chat',
    "On the Routing Result screen: review confidence, check the matched PO",
    'Tap "Confirm & Save" to persist the message to the web Inbox',
  ];

  const channels = [
    { name: "WhatsApp", color: "#25D366" },
    { name: "WeChat", color: "#09B83E" },
    { name: "iMessage", color: "#007AFF" },
    { name: "SMS", color: "#5856D6" },
    { name: "Email", color: "#FF6B35" },
  ];

  const resultStates = [
    { label: "High confidence (≥ 75%)", desc: "Auto-routed · Confirm & Save", color: "#7C3AED" },
    { label: "Medium confidence (40–75%)", desc: "Possible match · confirm or pick another", color: "#D97706" },
    { label: "Low confidence (< 40%)", desc: "Needs review · send to web queue", color: "#DC2626" },
  ];

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div
        className="relative z-10 flex flex-col h-full"
        style={{ padding: "2.5vh 7vw 2vh" }}
      >
        <div style={{ marginBottom: "1.5vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "0.4vh" }}>
            <div style={{ fontSize: "1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Part 8 · Screen: Capture Tab → Routing Result
            </div>
            <div
              style={{
                fontSize: "0.75vw",
                background: "rgba(37,211,102,0.12)",
                color: "#25D366",
                padding: "0.12vh 0.6vw",
                borderRadius: "0.25vw",
                fontFamily: "var(--font-body-family)",
                fontWeight: 600,
              }}
            >
              📱 Mobile
            </div>
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Paste a Supplier Chat
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "0.65vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Steps</div>
            {steps.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1.1vw",
                  alignItems: "flex-start",
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: "1px solid rgba(124,58,237,0.18)",
                  padding: "0.6vh 1.1vw",
                }}
              >
                <div
                  style={{
                    width: "1.25vw",
                    height: "1.25vw",
                    borderRadius: "50%",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "0.08vh",
                  }}
                >
                  <span style={{ fontSize: "0.62vw", color: "#A78BFA", fontWeight: 700, fontFamily: "var(--font-body-family)" }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: "0.92vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.35 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 0.9, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Screen Preview</div>
            <div
              style={{
                borderRadius: "0.6vw",
                border: "1px solid rgba(124,58,237,0.3)",
                overflow: "hidden",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part8-mobile-chat.jpg`}
                alt="FlowForge Mobile Capture tab with WhatsApp channel selected and routing result confidence states"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Channel Picker</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.2)",
                padding: "0.9vh 1.2vw",
                display: "flex",
                gap: "0.6vw",
                flexWrap: "wrap",
              }}
            >
              {channels.map((ch) => (
                <div
                  key={ch.name}
                  style={{
                    padding: "0.4vh 0.8vw",
                    borderRadius: "2vw",
                    border: `1px solid ${ch.color}`,
                    background: `${ch.color}18`,
                    fontSize: "0.85vw",
                    color: ch.color,
                    fontFamily: "var(--font-body-family)",
                    fontWeight: 600,
                  }}
                >
                  {ch.name}
                </div>
              ))}
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Routing Result States</div>
            {resultStates.map((r) => (
              <div
                key={r.label}
                style={{
                  background: "#131929",
                  borderRadius: "0.4vw",
                  border: `1px solid ${r.color}30`,
                  padding: "0.7vh 1.1vw",
                }}
              >
                <div style={{ fontSize: "0.88vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)", marginBottom: "0.2vh" }}>{r.label}</div>
                <div style={{ fontSize: "0.82vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
