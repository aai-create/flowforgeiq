import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import StepFlow from "@/components/StepFlow";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

function ConvertButtonPanel() {
  const [clicked, setClicked] = useState(false);
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr 0.8fr", padding: "0.5vh 1vw", background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        {["Supplier", "Unit Price", "Total", "Lead", "Spread", "Action"].map((h) => (
          <div key={h} style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr 0.8fr", padding: "0.8vh 1vw", alignItems: "center", background: "rgba(34,197,94,0.04)", borderBottom: "1px solid rgba(34,197,94,0.1)" }}>
        <div style={{ display: "flex", gap: "0.4vw", alignItems: "center" }}>
          <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw", fontWeight: 700 }}>Gold Top Garment</span>
          <span style={{ background: "rgba(34,197,94,0.12)", color: "#86EFAC", borderRadius: "999px", padding: "0.1vh 0.4vw", fontSize: "0.75vw", fontFamily: '"DM Sans", system-ui, sans-serif' }}>Winner</span>
        </div>
        <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>$7.85</span>
        <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>$32,970</span>
        <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>32 days</span>
        <span style={{ color: "#22C55E", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw" }}>+7.6%</span>
        <button
          role="button"
          onClick={(e) => { e.stopPropagation(); setClicked(true); }}
          style={{ background: clicked ? "#22C55E" : "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.35vw", padding: "0.35vh 0.6vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.8vw", cursor: "pointer", transition: "background 0.2s", whiteSpace: "nowrap" }}
        >{clicked ? "✓ Done" : "Convert to PO"}</button>
      </div>
      {[
        { name: "Sunrise Apparel", price: "$8.10", total: "$34,020", lead: "28 days", spread: "+4.9%" },
        { name: "Pacific Mills", price: "$9.20", total: "$38,640", lead: "35 days", spread: "−8.2%" },
      ].map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr 0.8fr", padding: "0.7vh 1vw", borderBottom: "1px solid rgba(124,58,237,0.06)", alignItems: "center" }}>
          <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{r.name}</span>
          <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{r.price}</span>
          <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{r.total}</span>
          <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{r.lead}</span>
          <span style={{ color: i === 1 ? "#EF4444" : "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw" }}>{r.spread}</span>
          <span />
        </div>
      ))}
    </div>
  );
}

function ShipmentCreatedPanel() {
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "0.6vw", padding: "1.2vh 1.5vw" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8vh" }}>
        <div>
          <div style={{ display: "flex", gap: "0.5vw", alignItems: "center", marginBottom: "0.3vh" }}>
            <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.05vw" }}>New Shipment Created</div>
            <div style={{ background: "rgba(34,197,94,0.12)", color: "#86EFAC", borderRadius: "999px", padding: "0.1vh 0.5vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.75vw" }}>Just now</div>
          </div>
          <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>Gold Top Garment · GT-2026-0339</div>
        </div>
        <div style={{ background: "rgba(245,158,11,0.12)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "999px", padding: "0.2vh 0.8vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>Quote stage</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6vw" }}>
        {[{ l: "Units", v: "4,200" }, { l: "FOB Price", v: "$7.85" }, { l: "Ex-Factory", v: "May 28" }, { l: "Buyer PO", v: "F21-2026-441" }, { l: "Spread", v: "+7.6%" }, { l: "Stage", v: "Quote →" }].map(({ l, v }) => (
          <div key={l} style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.1)", borderRadius: "0.3vw", padding: "0.4vh 0.7vw" }}>
            <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.75vw", textTransform: "uppercase" }}>{l}</div>
            <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.95vw" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProformaPDFPanel() {
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", overflow: "hidden" }}>
      <div style={{ background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.1)", padding: "0.5vh 1.2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5vw", alignItems: "center" }}>
          <span style={{ color: "#EF4444", fontSize: "1vw" }}>⬜</span>
          <span style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.95vw" }}>Proforma Invoice</span>
        </div>
        <div style={{ display: "flex", gap: "0.5vw" }}>
          <div style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA", borderRadius: "0.3vw", padding: "0.2vh 0.6vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>Download PDF</div>
          <div style={{ background: "#7C3AED", color: "#F1F5F9", borderRadius: "0.3vw", padding: "0.2vh 0.6vw", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.8vw" }}>Send to supplier</div>
        </div>
      </div>
      <div style={{ padding: "1.2vh 1.5vw" }}>
        <div style={{ borderBottom: "1px solid rgba(124,58,237,0.1)", paddingBottom: "0.8vh", marginBottom: "0.8vh", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>PROFORMA INVOICE</div>
            <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>PI-2026-GT-0339 · Generated Jul 13, 2026</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>FlowForge</div>
            <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>For: Gold Top Garment</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "0.2vh" }}>
          {[["Description", "Qty", "Unit Price", "Total"], ["Knit Tops — Style F21-K22", "4,200", "$7.85", "$32,970"], ["Ex-Factory: May 28, 2026", "", "", ""], ["", "", "Grand Total", "$32,970"]].map((row, ri) => (
            <div key={ri} style={{ display: "contents" }}>
              {row.map((cell, ci) => (
                <div key={ci} style={{ color: ri === 0 ? "#4B5563" : ci === 3 && ri === 3 ? "#22C55E" : "#94A3B8", fontFamily: ri === 0 ? '"DM Sans", system-ui, sans-serif' : '"Space Grotesk", system-ui, sans-serif', fontWeight: (ri === 0 || ci === 3) ? 700 : 400, fontSize: "0.85vw" }}>{cell}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvancePipelinePanel() {
  const [stage, setStage] = useState<"quote"|"production"|"exfactory">("quote");
  const stages: Array<{ key: "quote"|"production"|"exfactory"; label: string }> = [
    { key: "quote", label: "Quote" },
    { key: "production", label: "Production" },
    { key: "exfactory", label: "Ex-Factory" },
  ];
  const idx = stages.findIndex((s) => s.key === stage);
  return (
    <div style={{ background: "#0d1220", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", padding: "1.2vh 1.5vw" }}>
      <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw", marginBottom: "0.8vh" }}>Advance stage — click to progress the shipment:</div>
      <div style={{ display: "flex", gap: "0.6vw", alignItems: "center", marginBottom: "1vh" }}>
        {stages.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "0.6vw" }}>
            <button
              role="button"
              onClick={(e) => { e.stopPropagation(); setStage(s.key); }}
              style={{ background: i <= idx ? (s.key === stage ? "#7C3AED" : "rgba(124,58,237,0.25)") : "rgba(124,58,237,0.04)", border: `1px solid ${i <= idx ? "#7C3AED55" : "rgba(124,58,237,0.12)"}`, borderRadius: "0.4vw", padding: "0.4vh 0.9vw", color: i <= idx ? "#A78BFA" : "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", fontWeight: s.key === stage ? 700 : 400, cursor: "pointer", transition: "all 0.2s" }}
            >{i < idx ? "✓ " : ""}{s.label}</button>
            {i < stages.length - 1 && <span style={{ color: "#4B5563", fontSize: "0.9vw" }}>→</span>}
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "0.4vw", padding: "0.6vh 1vw" }}>
          <div style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw" }}>
            {stage === "quote" && "💬 Quote stage — awaiting supplier confirmation"}
            {stage === "production" && "🏭 Production — goods being manufactured"}
            {stage === "exfactory" && "✈️ Ex-Factory — goods ready to ship"}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const convertSteps = [
  { title: "Click Convert to PO", body: "The winning quote row shows a Convert to PO action. Click it to open the confirmation and create the shipment record.", renderPanel: () => <ConvertButtonPanel /> },
  { title: "Shipment record created", body: "FlowForge creates a shipment in the Quote stage, pre-filled with supplier, units, FOB price, and ex-factory date.", renderPanel: () => <ShipmentCreatedPanel /> },
  { title: "Proforma PDF generated", body: "A proforma invoice is generated from the quote data and linked to the shipment. Download or send directly to the supplier.", renderPanel: () => <ProformaPDFPanel /> },
  { title: "Advance to Production", body: "Reply to the supplier in the Inbox to confirm the order. Click the stage buttons below to see how each advance works.", renderPanel: () => <AdvancePipelinePanel /> },
];

export default function Slide16ConvertToPO() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 55% 55% at 100% 50%, rgba(124,58,237,0.11) 0%, transparent 60%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "28vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>Chapter 04 — Quotes</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "4vw", color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "2vh" }}>
            Convert to PO<br /><span style={{ color: "#A78BFA" }}>and proforma</span>
          </div>
        </Anim>
        <Anim delay={0.2}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.35vw", lineHeight: 1.6 }}>
            Selecting the winner creates the shipment and generates a proforma invoice in one click. Click through each step.
          </div>
        </Anim>
      </div>

      <Anim delay={0.3}>
        <div style={{ position: "absolute", right: "4vw", top: "50%", transform: "translateY(-50%)", width: "57vw" }}>
          <StepFlow steps={convertSteps} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
