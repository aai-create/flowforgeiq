import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
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

export default function Slide18MobileHome() {
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
          top: "50%",
          left: "7vw",
          transform: "translateY(-50%)",
          width: "36vw",
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
            Shipments at
            <br />
            a glance
          </div>
        </Anim>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
          <Anim delay={0.22}>
            <MobileFeature title="Active shipments list" desc="Home screen shows all in-progress orders with stage and progress bar — no login required on return visits." />
          </Anim>
          <Anim delay={0.32}>
            <MobileFeature title="Stage progress bar" desc="Visual indicator from Quote to Ex-Factory so you can see where every order stands in one glance." />
          </Anim>
          <Anim delay={0.42}>
            <MobileFeature title="Tap for full detail" desc="Tap any shipment to see spread, ex-factory date, PO numbers, and linked messages — all on one screen." />
          </Anim>
          <Anim delay={0.52}>
            <MobileFeature title="Bottom nav bar" desc="Four tabs: Home, Capture, Orders, and Settings — always one tap away." />
          </Anim>
        </div>
      </div>

      <Anim delay={0.18}>
        <div
          style={{
            position: "absolute",
            right: "14vw",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <MobileMock screen="home" />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function MobileFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1vw",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "0.45vw",
          background: "#7C3AED",
          borderRadius: "999px",
          alignSelf: "stretch",
          minHeight: "3vh",
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            color: "#F1F5F9",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.3vw",
            marginBottom: "0.3vh",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#94A3B8",
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: "1.1vw",
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}
