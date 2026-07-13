import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import StepFlow from "@/components/StepFlow";
import MobileMock from "@/components/MobileMock";

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

const CAPTURE_STEPS = [
  {
    title: "Export the chat",
    body: 'In WhatsApp or WeChat, open the conversation → tap More → "Export Chat". Copy the exported text.',
    renderPanel: () => (
      <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.5vw", padding: "0.8vh 1vw", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.05vw", color: "#4B5563", lineHeight: 1.5 }}>
        [10:24 AM] Chen Wei: hi, samples ready, sending photos this afternoon. pls confirm order qty...
      </div>
    ),
  },
  {
    title: "Paste into FlowForge",
    body: 'Open the FlowForge mobile app, tap the Capture tab, and paste the raw chat text into the text area.',
    renderPanel: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MobileMock screen="capture" />
      </div>
    ),
  },
  {
    title: "AI extraction",
    body: 'Tap "Extract with AI". FlowForge identifies supplier, PO number, stage, and any action items within seconds.',
    renderPanel: () => (
      <div style={{ display: "flex", gap: "1vw" }}>
        <ExtractionResult label="Supplier" value="Gold Top Garment" color="#A78BFA" />
        <ExtractionResult label="PO" value="GT-2026-0339" color="#A78BFA" />
        <ExtractionResult label="Stage" value="Quote" color="#F59E0B" />
        <ExtractionResult label="Confidence" value="94%" color="#22C55E" />
      </div>
    ),
  },
  {
    title: "Confirm routing",
    body: "Review the suggested shipment thread. Tap Confirm to save the message to the right thread — or edit if the AI got it wrong.",
    renderPanel: () => (
      <div style={{ display: "flex", gap: "0.8vw" }}>
        <button style={{ flex: 1, background: "rgba(239,68,68,0.1)", color: "#F87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.4vw", padding: "0.6vh", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw", cursor: "default" }}>
          Edit
        </button>
        <button style={{ flex: 2, background: "#7C3AED", color: "#F1F5F9", border: "none", borderRadius: "0.4vw", padding: "0.6vh", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw", cursor: "default" }}>
          Confirm → GT-2026-0339
        </button>
      </div>
    ),
  },
];

export default function Slide19MobileCapture() {
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
            Chapter 05 — Mobile
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
              marginBottom: "2.5vh",
            }}
          >
            Capture chat
            <br />
            on the go
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.35vw",
              lineHeight: 1.6,
            }}
          >
            Turn raw WhatsApp or WeChat exports into tracked shipment messages in four steps.
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
            width: "57vw",
          }}
        >
          <StepFlow steps={CAPTURE_STEPS} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function ExtractionResult({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.5vw", padding: "0.5vh 0.8vw", flex: 1 }}>
      <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw", marginBottom: "0.2vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ color, fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>{value}</div>
    </div>
  );
}
