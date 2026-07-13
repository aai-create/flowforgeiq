import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import InboxMock from "@/components/InboxMock";

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

export default function Slide06InboxOverview() {
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
          left: "5vw",
          transform: "translateY(-50%)",
          width: "35vw",
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
            Chapter 02 — Inbox
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
            All channels,
            <br />
            one view
          </div>
        </Anim>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
          <Anim delay={0.25}>
            <ChannelRow color="#3B82F6" label="Email" desc="Gmail integration — full thread history synced automatically." />
          </Anim>
          <Anim delay={0.35}>
            <ChannelRow color="#22C55E" label="WhatsApp" desc="Paste exported chats — AI extracts supplier, PO, and stage." />
          </Anim>
          <Anim delay={0.45}>
            <ChannelRow color="#F59E0B" label="WeChat" desc="Same paste-to-process flow for WeChat export files." />
          </Anim>
          <Anim delay={0.55}>
            <ChannelRow color="#6B7280" label="SMS / iMessage" desc="Forward texts or paste transcripts — routed to the right thread." />
          </Anim>
        </div>
      </div>

      <Anim delay={0.2}>
        <div
          style={{
            position: "absolute",
            right: "5vw",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48vw",
            height: "70vh",
          }}
        >
          <InboxMock />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function ChannelRow({
  color,
  label,
  desc,
}: {
  color: string;
  label: string;
  desc: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "1vw",
      }}
    >
      <div
        style={{
          width: "0.5vw",
          background: color,
          borderRadius: "999px",
          alignSelf: "stretch",
          minHeight: "4vh",
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            color: "#F1F5F9",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.4vw",
            marginBottom: "0.3vh",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: "#94A3B8",
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: "1.15vw",
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}
