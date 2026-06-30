export default function Slide24Part7LogPayment() {
  const milestones = [
    {
      label: "Deposit (30%)",
      amount: "$1,305",
      due: "2 weeks from today",
      status: "unpaid",
    },
    {
      label: "Balance (70%)",
      amount: "$3,045",
      due: "Ex-Factory − 3 days",
      status: "unpaid",
    },
  ];

  const formFields = [
    { label: "Payment Amount", value: "$1,305" },
    { label: "Date Paid", value: "Today's date" },
    { label: "Payment Method", value: "Wire" },
    { label: "Invoice Number", value: "INV-TWW-001 (required)" },
    { label: "Reference", value: "Bank ref / TT number" },
  ];

  const steps = [
    'In the shipment detail panel, click the Payments section or scroll to it',
    "Find the Deposit milestone row — it shows amount, due date, and status",
    'Click "Mark as Paid" on the Deposit row',
    "Fill in: Amount, Date Paid, Method (Wire), Invoice Number, and Reference",
    'Click "Confirm" — the milestone turns green and the balance due updates',
    "Observe: spread badge recalculates automatically based on logged payments",
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
          <div style={{ fontSize: "1vw", color: "#7C3AED", fontFamily: "var(--font-body-family)", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "0.4vh" }}>
            Part 7 · Screen: Shipment Detail → Payment Milestones
          </div>
          <h2 style={{ fontSize: "3vw", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0 }}>
            Log a Payment
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "0.7vh" }}>
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
                  padding: "0.65vh 1.1vw",
                }}
              >
                <div
                  style={{
                    width: "1.3vw",
                    height: "1.3vw",
                    borderRadius: "50%",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "0.1vh",
                  }}
                >
                  <span style={{ fontSize: "0.68vw", color: "#A78BFA", fontWeight: 700, fontFamily: "var(--font-body-family)" }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: "0.95vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.35 }}>{s}</span>
              </div>
            ))}

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)", marginTop: "0.5vh" }}>Screen Preview</div>
            <div
              style={{
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.3)",
                overflow: "hidden",
                flex: 1,
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}screenshots/part7-log-payment.jpg`}
                alt="FlowForge payment milestones panel showing Deposit 30% and Balance 70% with Mark as Paid form"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          </div>

          <div style={{ flex: 0.9, display: "flex", flexDirection: "column", gap: "0.9vh" }}>
            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Payment Milestones</div>
            {milestones.map((m, i) => (
              <div
                key={i}
                style={{
                  background: "#131929",
                  borderRadius: "0.5vw",
                  border: "1px solid rgba(124,58,237,0.2)",
                  padding: "0.9vh 1.2vw",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4vh" }}>
                  <span style={{ fontSize: "1vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>{m.label}</span>
                  <span
                    style={{
                      fontSize: "0.72vw",
                      background: "rgba(250,204,21,0.12)",
                      color: "#FBBF24",
                      padding: "0.1vh 0.5vw",
                      borderRadius: "0.25vw",
                      fontFamily: "var(--font-body-family)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "2vw" }}>
                  <div>
                    <div style={{ fontSize: "0.75vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>Amount</div>
                    <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#F1F5F9", fontFamily: "var(--font-body-family)" }}>{m.amount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75vw", color: "#475569", fontFamily: "var(--font-body-family)" }}>Due</div>
                    <div style={{ fontSize: "0.95vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{m.due}</div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>Mark Paid Form</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.22)",
                padding: "0.9vh 1.2vw",
                display: "flex",
                flexDirection: "column",
                gap: "0.5vh",
              }}
            >
              {formFields.map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(124,58,237,0.08)", paddingBottom: "0.45vh" }}>
                  <span style={{ fontSize: "0.82vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{label}</span>
                  <span style={{ fontSize: "0.88vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)" }}>{value}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(124,58,237,0.08)",
                borderRadius: "0.4vw",
                border: "1px solid rgba(124,58,237,0.25)",
                padding: "0.7vh 1.1vw",
              }}
            >
              <div style={{ fontSize: "0.9vw", color: "#94A3B8", fontFamily: "var(--font-body-family)", lineHeight: 1.4 }}>
                <span style={{ color: "#A78BFA", fontWeight: 600 }}>Invoice Number is required</span> — used for audit trail and proforma reconciliation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
