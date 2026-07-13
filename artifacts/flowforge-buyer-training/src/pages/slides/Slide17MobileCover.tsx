import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

export default function Slide17MobileCover() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0B0F1A" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, #0B0F1A 0%, #0E1120 50%, #0B0F1A 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 65% 65% at 50% 50%, rgba(124,58,237,0.2) 0%, transparent 65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.09) 1px, transparent 0)",
          backgroundSize: "3vw 3vw",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Anim delay={0}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.7vw",
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: "999px",
              padding: "0.7vh 1.6vw",
              marginBottom: "3vh",
            }}
          >
            <span
              style={{
                color: "#A78BFA",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 500,
                fontSize: "1.2vw",
                letterSpacing: "0.06em",
              }}
            >
              Chapter 05
            </span>
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "7vw",
              color: "#F1F5F9",
              lineHeight: 1.0,
              letterSpacing: "-0.035em",
              marginBottom: "2.5vh",
            }}
          >
            On Your
            <br />
            <span style={{ color: "#A78BFA" }}>Phone</span>
          </div>
        </Anim>

        <Anim delay={0.3}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.8vw",
              maxWidth: "46vw",
              lineHeight: 1.5,
            }}
          >
            The FlowForge mobile PWA brings shipment tracking and chat capture to your pocket — installable from any browser.
          </div>
        </Anim>

        <Anim delay={0.45}>
          <div
            style={{
              marginTop: "4vh",
              display: "flex",
              gap: "1.4vw",
            }}
          >
            <PWAPill label="Home — active shipments" />
            <PWAPill label="Capture — paste chat" />
            <PWAPill label="Detail — spread + docs" />
          </div>
        </Anim>
      </div>

      <ChapterNav />
    </div>
  );
}

function PWAPill({ label }: { label: string }) {
  return (
    <div
      style={{
        background: "rgba(124,58,237,0.12)",
        border: "1px solid rgba(124,58,237,0.3)",
        color: "#A78BFA",
        borderRadius: "999px",
        padding: "0.5vh 1.4vw",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: "1.15vw",
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}
