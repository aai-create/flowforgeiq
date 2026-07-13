import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import InboxMock from "@/components/InboxMock";
import Hotspot from "@/components/Hotspot";

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

export default function Slide07InboxHotspot() {
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

      <Anim delay={0}>
        <div
          style={{
            position: "absolute",
            top: "8vh",
            left: "7vw",
          }}
        >
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
            Chapter 02 — Inbox
          </div>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "3.5vw",
              color: "#F1F5F9",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Inbox at a glance
          </div>
        </div>
      </Anim>

      <Anim delay={0.15}>
        <div
          style={{
            position: "absolute",
            left: "7vw",
            right: "7vw",
            top: "22vh",
            bottom: "12vh",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <InboxMock />

            <Hotspot
              top="18%"
              left="8%"
              label="Unread badge"
              description="The purple number shows how many unread messages are waiting across all channels."
            />
            <Hotspot
              top="38%"
              left="4%"
              label="Channel badge"
              description="Coloured badge (Email, WA, WC, SMS) lets you see the source before opening the message."
            />
            <Hotspot
              top="55%"
              left="75%"
              label="Stage tag"
              description="Stage tags like 'Production' or 'Ex-Factory' show where each shipment is right now."
            />
            <Hotspot
              top="25%"
              left="90%"
              label="Filter bar"
              description="Filter by channel, supplier, shipment, or PO number to narrow the list instantly."
            />
          </div>
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
