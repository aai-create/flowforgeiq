export default function Slide26Part9MobileDoc() {
  const steps = [
    'In the Capture tab, tap the File attach button (paperclip icon)',
    "Pick the quote PDF or packing list from your phone's Files app",
    "The file appears as an attachment card below the text area",
    'Optionally link it to the Chrome Retail Hangers shipment, then tap "Submit for Routing"',
    'Navigate to the "Documents" tab (bottom bar) — find your new upload',
    "Tap the document card to open Document Detail",
    "Review the AI-extracted fields: product name, unit price, quantities, dates",
    "Correct any extraction errors by tapping a field and editing inline",
    'Tap "Save Corrections" — the verified document is now linked to your PO',
  ];

  const extractedFields = [
    { label: "Supplier", value: "Tianjin Wire Works" },
    { label: "Product", value: "Chrome Retail Hanger" },
    { label: "Unit Price", value: "$0.87" },
    { label: "Quantity", value: "5,000 units" },
    { label: "Lead Time", value: "28 days" },
    { label: "Document Type", value: "Proforma Invoice" },
  ];

  const docStatuses = [
    { label: "Processing", color: "#F59E0B", desc: "AI extraction in progress" },
    { label: "Extracted", color: "#22C55E", desc: "Fields parsed — ready to review" },
    { label: "Unmatched", color: "#596A7C", desc: "No shipment linked yet" },
    { label: "Failed", color: "#E63946", desc: "Extraction error — review manually" },
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
              Part 9 · Screen: Capture → Documents Tab → Document Detail
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
            Upload a Document
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: "0.6vh" }}>
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
                  padding: "0.58vh 1.1vw",
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
                <span style={{ fontSize: "0.9vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", lineHeight: 1.33 }}>{s}</span>
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
                src={`${import.meta.env.BASE_URL}screenshots/part9-mobile-document.jpg`}
                alt="FlowForge Mobile Document Detail showing AI-extracted fields with 94% confidence and document status badges"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>

            <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#A78BFA", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-body-family)" }}>AI-Extracted Fields</div>
            <div
              style={{
                background: "#131929",
                borderRadius: "0.5vw",
                border: "1px solid rgba(124,58,237,0.22)",
                padding: "0.85vh 1.2vw",
                display: "flex",
                flexDirection: "column",
                gap: "0.45vh",
              }}
            >
              {extractedFields.map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderBottom: "1px solid rgba(124,58,237,0.08)",
                    paddingBottom: "0.42vh",
                  }}
                >
                  <span style={{ fontSize: "0.82vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{label}</span>
                  <span style={{ fontSize: "0.88vw", color: "#CBD5E1", fontFamily: "var(--font-body-family)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              <div style={{ fontSize: "0.72vw", color: "#475569", fontFamily: "var(--font-body-family)", marginTop: "0.2vh" }}>
                Confidence: 94% · Tap any field to edit inline
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45vh" }}>
              {docStatuses.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    gap: "0.8vw",
                    alignItems: "center",
                    background: "#131929",
                    borderRadius: "0.35vw",
                    border: "1px solid rgba(124,58,237,0.12)",
                    padding: "0.55vh 1.1vw",
                  }}
                >
                  <div
                    style={{
                      padding: "0.1vh 0.5vw",
                      borderRadius: "1vw",
                      background: `${s.color}18`,
                      fontSize: "0.75vw",
                      color: s.color,
                      fontFamily: "var(--font-body-family)",
                      fontWeight: 600,
                      flexShrink: 0,
                      minWidth: "4.5vw",
                      textAlign: "center",
                    }}
                  >
                    {s.label}
                  </div>
                  <span style={{ fontSize: "0.82vw", color: "#64748B", fontFamily: "var(--font-body-family)" }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
