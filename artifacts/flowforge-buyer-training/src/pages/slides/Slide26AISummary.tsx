import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

const checklist = [
  { section: "Inbox", items: ["Sign in and accept your team invite", "Connect Gmail to sync supplier emails", "Paste a WhatsApp or WeChat export to process your first chat message", "Send a reply and advance a shipment stage"] },
  { section: "Orders", items: ["Find a shipment by buyer PO number in the grid", "Check the spread badge on at least one order", "Open a shipment and review its task checklist"] },
  { section: "Quotes", items: ["Create an RFQ and add two suppliers", "Compare quotes by spread column", "Convert the winning quote to a PO"] },
  { section: "Mobile", items: ["Install the PWA using Add to Home Screen", "Capture a chat message from your phone", "View a shipment detail including spread and documents"] },
];

export default function Slide26AISummary() {
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
            "radial-gradient(ellipse 60% 60% at 100% 100%, rgba(124,58,237,0.12) 0%, transparent 60%)",
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
              marginBottom: "0.8vh",
            }}
          >
            Training complete
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
              marginBottom: "1vh",
            }}
          >
            Your day-one checklist
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.4vw",
              marginBottom: "3vh",
            }}
          >
            Complete these tasks in your first week to build the muscle memory for every FlowForge workflow.
          </div>
        </Anim>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5vw",
          }}
        >
          <Anim delay={0.25}>
            <CheckSection section={checklist[0].section} items={checklist[0].items} />
          </Anim>
          <Anim delay={0.33}>
            <CheckSection section={checklist[1].section} items={checklist[1].items} />
          </Anim>
          <Anim delay={0.41}>
            <CheckSection section={checklist[2].section} items={checklist[2].items} />
          </Anim>
          <Anim delay={0.49}>
            <CheckSection section={checklist[3].section} items={checklist[3].items} />
          </Anim>
        </div>
      </div>

      <ChapterNav />
    </div>
  );
}

function CheckSection({ section, items }: { section: string; items: string[] }) {
  return (
    <div
      style={{
        background: "#131929",
        border: "1px solid rgba(124,58,237,0.22)",
        borderRadius: "0.8vw",
        padding: "1.8vh 1.6vw",
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
          marginBottom: "1.2vh",
        }}
      >
        {section}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.9vh" }}>
        <CheckItem text={items[0]} />
        <CheckItem text={items[1]} />
        <CheckItem text={items[2]} />
        {items[3] && <CheckItem text={items[3]} />}
      </div>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.8vw",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "1.2vw",
          height: "1.2vw",
          borderRadius: "0.25vw",
          border: "1.5px solid rgba(124,58,237,0.5)",
          background: "rgba(124,58,237,0.08)",
          flexShrink: 0,
          marginTop: "0.25vh",
        }}
      />
      <span
        style={{
          color: "#94A3B8",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "1.1vw",
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>
    </div>
  );
}
