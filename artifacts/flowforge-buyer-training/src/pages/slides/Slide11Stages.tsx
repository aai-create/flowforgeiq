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

const STAGES = [
  {
    title: "Stage 1 — Factory Quote",
    body: "RFQ sent to supplier. Factory returns a quote. Spread vs. target price is checked. Proforma invoice issued on acceptance.",
    renderPanel: () => (
      <div style={{ display: "flex", gap: "0.8vw" }}>
        <StageTag color="#F59E0B" label="RFQ Sent" done />
        <StageArrow />
        <StageTag color="#F59E0B" label="Quote Received" done />
        <StageArrow />
        <StageTag color="#F59E0B" label="Spread Checked" active />
        <StageArrow />
        <StageTag color="#F59E0B" label="Proforma Issued" />
      </div>
    ),
  },
  {
    title: "Stage 2 — Production",
    body: "PO confirmed. Fabric and materials sourced. Samples reviewed and approved. Active production tracking with milestone updates.",
    renderPanel: () => (
      <div style={{ display: "flex", gap: "0.8vw" }}>
        <StageTag color="#3B82F6" label="PO Confirmed" done />
        <StageArrow />
        <StageTag color="#3B82F6" label="Fabric Sourced" done />
        <StageArrow />
        <StageTag color="#3B82F6" label="Samples OK" active />
        <StageArrow />
        <StageTag color="#3B82F6" label="Production Active" />
      </div>
    ),
  },
  {
    title: "Stage 3 — Ex-Factory",
    body: "QC inspection completed. Freight booking confirmed. Bill of lading issued by the carrier. Balance payment released on B/L receipt.",
    renderPanel: () => (
      <div style={{ display: "flex", gap: "0.8vw" }}>
        <StageTag color="#22C55E" label="QC Passed" done />
        <StageArrow />
        <StageTag color="#22C55E" label="Booking" done />
        <StageArrow />
        <StageTag color="#22C55E" label="B/L Issued" active />
        <StageArrow />
        <StageTag color="#22C55E" label="Payment Out" />
      </div>
    ),
  },
];

export default function Slide11Stages() {
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
            "radial-gradient(ellipse 50% 50% at 50% 100%, rgba(124,58,237,0.1) 0%, transparent 60%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "7vw",
          transform: "translateY(-50%)",
          width: "30vw",
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
              marginBottom: "1vh",
            }}
          >
            Chapter 03 — Orders
          </div>
        </Anim>

        <Anim delay={0.1}>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "4vw",
              color: "#F1F5F9",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: "1.5vh",
            }}
          >
            Stage-by-stage tracking
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.4vw",
              lineHeight: 1.6,
            }}
          >
            Every shipment moves through three defined stages — each with its own tasks and milestones. Step through them below.
          </div>
        </Anim>
      </div>

      <Anim delay={0.2}>
        <div
          style={{
            position: "absolute",
            right: "5vw",
            top: "50%",
            transform: "translateY(-50%)",
            width: "55vw",
          }}
        >
          <StepFlow steps={STAGES} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function StageTag({ color, label, done, active }: { color: string; label: string; done?: boolean; active?: boolean }) {
  return (
    <div
      style={{
        background: done ? `${color}30` : active ? `${color}18` : "rgba(124,58,237,0.06)",
        border: `1px solid ${done || active ? color + "60" : "rgba(124,58,237,0.2)"}`,
        borderRadius: "0.4vw",
        padding: "0.4vh 0.8vw",
        color: done ? color : active ? color : "#4B5563",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: "0.95vw",
        fontWeight: active ? 700 : 400,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {done && <span style={{ marginRight: "0.3vw" }}>✓</span>}
      {label}
    </div>
  );
}

function StageArrow() {
  return (
    <div
      style={{
        color: "rgba(124,58,237,0.4)",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: "1vw",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      →
    </div>
  );
}
