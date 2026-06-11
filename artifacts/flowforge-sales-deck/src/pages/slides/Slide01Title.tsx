export default function Slide01Title() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 15% 50%, rgba(124,58,237,0.22) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.07) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />

      <div className="relative z-10 flex flex-col justify-center h-full" style={{ paddingLeft: "8vw", paddingRight: "8vw" }}>
        <div className="flex items-center" style={{ marginBottom: "1.8vh" }}>
          <div style={{ width: "2.8vw", height: "0.22vh", background: "#7C3AED", marginRight: "1.2vw" }} />
          <span style={{ fontSize: "1.4vw", color: "#A78BFA", fontFamily: "var(--font-body-family)", letterSpacing: "0.18em", fontWeight: 500, textTransform: "uppercase" }}>Sales Playbook</span>
        </div>

        <h1 style={{
          fontSize: "9vw",
          fontWeight: 700,
          color: "#F1F5F9",
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          textWrap: "balance",
          marginBottom: "2.5vh",
        }}>
          FlowForge
        </h1>

        <div style={{ width: "6vw", height: "0.3vh", background: "#7C3AED", marginBottom: "3vh" }} />

        <p style={{
          fontSize: "2.8vw",
          fontWeight: 400,
          color: "#CBD5E1",
          lineHeight: 1.25,
          maxWidth: "52vw",
          textWrap: "balance",
          marginBottom: "1.8vh",
          fontFamily: "var(--font-body-family)",
        }}>
          Supply-chain communication, unified.
        </p>

        <p style={{
          fontSize: "1.8vw",
          fontWeight: 400,
          color: "#64748B",
          lineHeight: 1.4,
          maxWidth: "44vw",
          fontFamily: "var(--font-body-family)",
        }}>
          One workspace for every buyer-supplier conversation,<br />
          shipment milestone, and payment — across every channel.
        </p>

        <div className="absolute" style={{ bottom: "5vh", left: "8vw", display: "flex", alignItems: "center", gap: "1.2vw" }}>
          <span style={{ fontSize: "1.5vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>flowforge.com</span>
          <div style={{ width: "0.15vw", height: "1.8vh", background: "#334155" }} />
          <span style={{ fontSize: "1.5vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>Confidential — Sales Use Only</span>
        </div>

        <div
          className="absolute"
          style={{
            right: "6vw",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "1.8vh",
            alignItems: "flex-end",
          }}
        >
          <div style={{ width: "18vw", height: "0.15vh", background: "rgba(124,58,237,0.3)" }} />
          <div style={{ width: "12vw", height: "0.15vh", background: "rgba(124,58,237,0.2)" }} />
          <div style={{ width: "15vw", height: "0.15vh", background: "rgba(124,58,237,0.25)" }} />
          <div style={{ width: "10vw", height: "0.15vh", background: "rgba(124,58,237,0.15)" }} />
          <div style={{ width: "20vw", height: "0.15vh", background: "rgba(124,58,237,0.2)" }} />
        </div>
      </div>
    </div>
  );
}
