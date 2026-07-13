import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import Hotspot from "@/components/Hotspot";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

export default function Slide02WhatIsIt() {
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
          top: "8vh",
          left: "7vw",
          right: "7vw",
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
              marginBottom: "0.6vh",
            }}
          >
            Chapter 01 — Welcome
          </div>
        </Anim>

        <Anim delay={0.08}>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "4vw",
              color: "#F1F5F9",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: "1.2vh",
            }}
          >
            What FlowForge handles
            <br />
            <span style={{ color: "#A78BFA" }}>vs. what you do</span>
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.35vw",
              marginBottom: "3.5vh",
            }}
          >
            Click the hotspots to explore what the platform owns and what you control.
          </div>
        </Anim>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2vw",
          }}
        >
          <Anim delay={0.25}>
            <div
              style={{
                background: "#131929",
                border: "1px solid rgba(124,58,237,0.35)",
                borderRadius: "1vw",
                padding: "2.5vh 2vw",
                position: "relative",
                minHeight: "44vh",
              }}
            >
              <div
                style={{
                  color: "#A78BFA",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: "1.2vw",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "1.8vh",
                }}
              >
                FlowForge handles automatically
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.3vh" }}>
                <AutoItem text="Route incoming supplier messages to the right shipment thread" />
                <AutoItem text="Extract supplier, PO, and stage from pasted chat exports" />
                <AutoItem text="Draft reply suggestions from message context" />
                <AutoItem text="Calculate spread and margin on every order" />
                <AutoItem text="Track stage progress and surface overdue tasks" />
              </div>

              <Hotspot
                top="28%"
                left="90%"
                label="AI routing"
                description="Incoming emails and chats are matched to shipments by supplier name, PO number, and message keywords — no manual sorting required."
              />
              <Hotspot
                top="62%"
                left="90%"
                label="Spread math"
                description="Spread = buyer revenue − supplier payments. Calculated automatically from your payment records and shown as a badge on every order."
              />
            </div>
          </Anim>

          <Anim delay={0.38}>
            <div
              style={{
                background: "#131929",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: "1vw",
                padding: "2.5vh 2vw",
                position: "relative",
                minHeight: "44vh",
              }}
            >
              <div
                style={{
                  color: "#86EFAC",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: "1.2vw",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "1.8vh",
                }}
              >
                You stay in control of
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.3vh" }}>
                <BuyerItem text="Reviewing and approving AI-drafted replies before sending" />
                <BuyerItem text="Confirming routing suggestions for ambiguous messages" />
                <BuyerItem text="Advancing shipment stages after milestones are verified" />
                <BuyerItem text="Picking the winning quote and converting to a PO" />
                <BuyerItem text="Approving Copilot action suggestions one click at a time" />
              </div>

              <Hotspot
                top="28%"
                left="90%"
                label="One-click approve"
                description="Every AI suggestion — draft reply, routing guess, or stage advance — waits for your explicit click. Nothing changes without your approval."
              />
              <Hotspot
                top="75%"
                left="90%"
                label="Copilot queue"
                description="AI-detected actions (stage advances, payment marks, task closes) queue up for your review. You approve or dismiss each one individually."
              />
            </div>
          </Anim>
        </div>
      </div>

      <ChapterNav />
    </div>
  );
}

function AutoItem({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: "0.9vw", alignItems: "flex-start" }}>
      <div
        style={{
          width: "1.2vw",
          height: "1.2vw",
          borderRadius: "0.25vw",
          background: "rgba(124,58,237,0.3)",
          border: "1px solid #7C3AED",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "0.25vh",
          color: "#A78BFA",
          fontSize: "0.75vw",
          fontWeight: 700,
        }}
      >
        ✦
      </div>
      <span
        style={{
          color: "#94A3B8",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "1.2vw",
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function BuyerItem({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: "0.9vw", alignItems: "flex-start" }}>
      <div
        style={{
          width: "1.2vw",
          height: "1.2vw",
          borderRadius: "50%",
          background: "rgba(34,197,94,0.15)",
          border: "1px solid rgba(34,197,94,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "0.25vh",
          color: "#86EFAC",
          fontSize: "0.75vw",
          fontWeight: 700,
        }}
      >
        ✓
      </div>
      <span
        style={{
          color: "#F1F5F9",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "1.2vw",
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>
    </div>
  );
}
