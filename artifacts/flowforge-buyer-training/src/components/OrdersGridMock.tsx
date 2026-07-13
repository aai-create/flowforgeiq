import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const ROWS = [
  {
    supplier: "Sunrise Apparel",
    supplierPo: "SA-2026-4821",
    buyerPo: "F21-PO-00291",
    stage: "Production",
    spread: "+12.4%",
    spreadOk: true,
    status: "On Track",
    timeline: [
      { label: "Quote", done: true },
      { label: "PO Issued", done: true },
      { label: "Fabric", done: true },
      { label: "Production", done: false, active: true },
      { label: "Ex-Factory", done: false },
    ],
  },
  {
    supplier: "Gold Top Garment",
    supplierPo: "GT-2026-0339",
    buyerPo: "F21-PO-00288",
    stage: "Ex-Factory",
    spread: "+8.1%",
    spreadOk: true,
    status: "Shipped",
    timeline: [
      { label: "Quote", done: true },
      { label: "PO Issued", done: true },
      { label: "Fabric", done: true },
      { label: "Production", done: true },
      { label: "Ex-Factory", done: true, active: true },
    ],
  },
  {
    supplier: "Pacific Mills",
    supplierPo: "PM-2026-1152",
    buyerPo: "F21-PO-00302",
    stage: "Quote",
    spread: "+3.2%",
    spreadOk: false,
    status: "Pending",
    timeline: [
      { label: "Quote", done: false, active: true },
      { label: "PO Issued", done: false },
      { label: "Fabric", done: false },
      { label: "Production", done: false },
      { label: "Ex-Factory", done: false },
    ],
  },
  {
    supplier: "ShiningTex",
    supplierPo: "ST-2026-0071",
    buyerPo: "F21-PO-00295",
    stage: "Production",
    spread: "+18.7%",
    spreadOk: true,
    status: "On Track",
    timeline: [
      { label: "Quote", done: true },
      { label: "PO Issued", done: true },
      { label: "Fabric", done: true },
      { label: "Production", done: false, active: true },
      { label: "Ex-Factory", done: false },
    ],
  },
];

export default function OrdersGridMock() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <div
      style={{
        background: "#131929",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: "1vw",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "#0B0F1A",
          padding: "1.2vh 1.5vw",
          borderBottom: "1px solid rgba(124,58,237,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "1vw",
        }}
      >
        <div
          style={{
            color: "#F1F5F9",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.4vw",
          }}
        >
          Orders
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            background: "rgba(124,58,237,0.15)",
            color: "#A78BFA",
            borderRadius: "0.4vw",
            padding: "0.3vh 0.8vw",
            fontSize: "1vw",
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          Search PO...
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.4fr 1.4fr 0.9fr 0.8fr 0.9fr 0.4fr",
          padding: "0.6vh 1.5vw",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
        }}
      >
        <ColHeader>Supplier</ColHeader>
        <ColHeader>Supplier PO</ColHeader>
        <ColHeader>Buyer PO</ColHeader>
        <ColHeader>Stage</ColHeader>
        <ColHeader>Spread</ColHeader>
        <ColHeader>Status</ColHeader>
        <ColHeader></ColHeader>
      </div>

      <div style={{ flex: 1, overflowY: "hidden" }}>
        {ROWS.map((row, i) => (
          <div key={i}>
            <div
              role={isAllSlides ? undefined : "button"}
              tabIndex={isAllSlides ? undefined : 0}
              onClick={isAllSlides ? undefined : (e) => { e.stopPropagation(); setExpandedRow(expandedRow === i ? null : i); }}
              onKeyDown={isAllSlides ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setExpandedRow(expandedRow === i ? null : i); } }}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.4fr 1.4fr 0.9fr 0.8fr 0.9fr 0.4fr",
                padding: "1vh 1.5vw",
                borderBottom: "1px solid rgba(124,58,237,0.08)",
                alignItems: "center",
                cursor: isAllSlides ? "default" : "pointer",
                background: expandedRow === i ? "rgba(124,58,237,0.06)" : "transparent",
                transition: "background 0.15s",
              }}
            >
              <div style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.05vw", fontWeight: 500 }}>
                {row.supplier}
              </div>
              <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", fontVariantNumeric: "tabular-nums" }}>
                {row.supplierPo}
              </div>
              <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", fontVariantNumeric: "tabular-nums" }}>
                {row.buyerPo}
              </div>
              <div>
                <StageBadge stage={row.stage} />
              </div>
              <div style={{ color: row.spreadOk ? "#22C55E" : "#F59E0B", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.05vw" }}>
                {row.spread}
              </div>
              <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>
                {row.status}
              </div>
              <div style={{ color: expandedRow === i ? "#A78BFA" : "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", textAlign: "right" }}>
                {expandedRow === i ? "▲" : "▼"}
              </div>
            </div>

            <AnimatePresence>
              {expandedRow === i && !isAllSlides && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                >
                  <MiniTimeline timeline={row.timeline} />
                </motion.div>
              )}
            </AnimatePresence>

            {isAllSlides && i === 0 && (
              <MiniTimeline timeline={row.timeline} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    Quote: "#F59E0B",
    Production: "#3B82F6",
    "Ex-Factory": "#22C55E",
  };
  const c = colors[stage] || "#A78BFA";
  return (
    <span style={{ background: `${c}22`, color: c, borderRadius: "999px", padding: "0.2vh 0.7vw", fontSize: "0.95vw", fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      {stage}
    </span>
  );
}

function MiniTimeline({ timeline }: { timeline: { label: string; done: boolean; active?: boolean }[] }) {
  return (
    <div
      style={{
        background: "#0d1220",
        borderBottom: "1px solid rgba(124,58,237,0.12)",
        padding: "1.2vh 1.5vw",
        display: "flex",
        alignItems: "center",
        gap: 0,
      }}
    >
      {timeline.map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4vh" }}>
            <div
              style={{
                width: "1.1vw",
                height: "1.1vw",
                borderRadius: "50%",
                background: step.done ? "#7C3AED" : step.active ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.1)",
                border: step.active ? "2px solid #A78BFA" : step.done ? "2px solid #7C3AED" : "2px solid rgba(124,58,237,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {step.done && (
                <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#F1F5F9" }} />
              )}
            </div>
            <span
              style={{
                color: step.done ? "#A78BFA" : step.active ? "#F1F5F9" : "#4B5563",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "0.8vw",
                whiteSpace: "nowrap",
                fontWeight: step.active ? 700 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
          {i < timeline.length - 1 && (
            <div
              style={{
                flex: 1,
                height: "1px",
                background: step.done ? "#7C3AED" : "rgba(124,58,237,0.2)",
                marginBottom: "2.2vh",
                marginLeft: "0.2vw",
                marginRight: "0.2vw",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ColHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </div>
  );
}
