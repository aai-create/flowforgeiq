import { motion } from "framer-motion";
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

const rfqSteps = [
  {
    title: "Create RFQ",
    body: 'Navigate to "RFQs" and click "New RFQ". Fill in product details — category, units, target FOB price, and required ex-factory date.',
    renderPanel: () => (
      <div
        style={{
          background: "#0d1220",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: "0.6vw",
          padding: "0.8vh 1.2vw",
          display: "flex",
          gap: "1.5vw",
        }}
      >
        <RFQField label="Category" value="Knit Tops" />
        <RFQField label="Units" value="4,200" />
        <RFQField label="Target FOB" value="$8.50" />
        <RFQField label="Ex-Factory" value="May 28" />
      </div>
    ),
  },
  {
    title: "Add suppliers",
    body: "Select one or more suppliers from your roster. FlowForge sends the RFQ by email automatically and tracks which suppliers have responded.",
    renderPanel: () => (
      <div style={{ display: "flex", gap: "0.8vw", flexWrap: "wrap" }}>
        <SupplierTag name="Sunrise Apparel" sent />
        <SupplierTag name="Gold Top Garment" sent />
        <SupplierTag name="Pacific Mills" sent={false} />
      </div>
    ),
  },
  {
    title: "Receive quotes",
    body: "Each supplier's quote appears as a row. You see unit price, total cost, and spread vs. your target — in one comparison table.",
    renderPanel: () => (
      <div
        style={{
          background: "#0d1220",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: "0.6vw",
          overflow: "hidden",
        }}
      >
        <QuoteRow supplier="Sunrise Apparel" unitPrice="$8.10" spread="+4.9%" ok />
        <QuoteRow supplier="Gold Top Garment" unitPrice="$7.85" spread="+7.6%" ok />
        <QuoteRow supplier="Pacific Mills" unitPrice="$9.20" spread="−8.2%" ok={false} />
      </div>
    ),
  },
  {
    title: "Pick the winner",
    body: 'Click "Mark as Winner" on the best quote. FlowForge highlights the row and generates a proforma invoice PDF linked to this RFQ.',
    renderPanel: () => (
      <div
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: "0.6vw",
          padding: "0.8vh 1.2vw",
          display: "flex",
          alignItems: "center",
          gap: "1vw",
        }}
      >
        <div style={{ color: "#86EFAC", fontSize: "1.2vw" }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.1vw" }}>Gold Top Garment — winner</div>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>Proforma invoice generated · Spread +7.6%</div>
        </div>
      </div>
    ),
  },
  {
    title: "Convert to PO",
    body: 'Click "Convert to PO" to create the shipment record. Stage advances to Production and the order appears in your Orders grid.',
    renderPanel: () => (
      <div style={{ display: "flex", gap: "0.8vw", alignItems: "center" }}>
        <PipelineStep label="RFQ" done />
        <Arrow />
        <PipelineStep label="Quote" done />
        <Arrow />
        <PipelineStep label="Winner" done />
        <Arrow />
        <PipelineStep label="PO Created" active />
        <Arrow />
        <PipelineStep label="Production" />
      </div>
    ),
  },
];

export default function Slide14RFQProcess() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0B0F1A" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)",
          backgroundSize: "2.8vw 2.8vw",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 55% 55% at 0% 100%, rgba(124,58,237,0.1) 0%, transparent 60%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "7vw",
          transform: "translateY(-50%)",
          width: "28vw",
        }}
      >
        <Anim delay={0}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: "1.1vw",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "1.5vh",
            }}
          >
            Chapter 04 — Quotes
          </div>
        </Anim>

        <Anim delay={0.1}>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "3.8vw",
              color: "#F1F5F9",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              marginBottom: "2vh",
            }}
          >
            RFQ walkthrough
            <br />
            <span style={{ color: "#C4B5FD" }}>5 steps in place</span>
          </div>
        </Anim>

        <Anim delay={0.2}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.35vw",
              lineHeight: 1.6,
            }}
          >
            From blank RFQ to production PO — step through every action without leaving this slide.
          </div>
        </Anim>
      </div>

      <Anim delay={0.3}>
        <div
          style={{
            position: "absolute",
            right: "5vw",
            top: "50%",
            transform: "translateY(-50%)",
            width: "55vw",
          }}
        >
          <StepFlow steps={rfqSteps} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function RFQField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2vh" }}>{label}</div>
      <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.1vw" }}>{value}</div>
    </div>
  );
}

function SupplierTag({ name, sent }: { name: string; sent: boolean }) {
  return (
    <div
      style={{
        background: sent ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.04)",
        border: `1px solid ${sent ? "#7C3AED55" : "rgba(124,58,237,0.15)"}`,
        borderRadius: "999px",
        padding: "0.3vh 0.9vw",
        color: sent ? "#A78BFA" : "#4B5563",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: "0.95vw",
      }}
    >
      {sent ? "✓ " : ""}{name}
    </div>
  );
}

function QuoteRow({ supplier, unitPrice, spread, ok }: { supplier: string; unitPrice: string; spread: string; ok: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.5fr 1fr 1fr",
        padding: "0.6vh 1vw",
        borderBottom: "1px solid rgba(124,58,237,0.08)",
        alignItems: "center",
      }}
    >
      <div style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>{supplier}</div>
      <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "0.95vw" }}>{unitPrice}</div>
      <div style={{ color: ok ? "#22C55E" : "#EF4444", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.95vw" }}>{spread}</div>
    </div>
  );
}

function PipelineStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div
      style={{
        background: done ? "rgba(124,58,237,0.25)" : active ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.04)",
        border: `1px solid ${done || active ? "#7C3AED55" : "rgba(124,58,237,0.15)"}`,
        borderRadius: "0.4vw",
        padding: "0.3vh 0.7vw",
        color: done ? "#A78BFA" : active ? "#C4B5FD" : "#4B5563",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: "0.9vw",
        fontWeight: active ? 700 : 400,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {done && "✓ "}{label}
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ color: "rgba(124,58,237,0.35)", fontSize: "0.9vw", flexShrink: 0 }}>→</div>
  );
}
