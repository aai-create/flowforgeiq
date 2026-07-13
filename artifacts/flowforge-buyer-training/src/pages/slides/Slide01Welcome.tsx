import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

export default function Slide01Welcome() {
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
            "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(124,58,237,0.18) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.12) 1px, transparent 0)",
          backgroundSize: "2.8vw 2.8vw",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "7vw",
          top: "50%",
          transform: "translateY(-50%)",
          maxWidth: "54vw",
        }}
      >
        <Anim delay={0}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.7vw",
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "999px",
              padding: "0.6vh 1.4vw",
              marginBottom: "3vh",
            }}
          >
            <div
              style={{
                width: "0.6vw",
                height: "0.6vw",
                borderRadius: "50%",
                background: "#7C3AED",
              }}
            />
            <span
              style={{
                color: "#A78BFA",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 500,
                fontSize: "1.2vw",
                letterSpacing: "0.04em",
              }}
            >
              Buyer Training
            </span>
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "6.5vw",
              color: "#F1F5F9",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: "2.5vh",
              textWrap: "balance",
            }}
          >
            Welcome to
            <br />
            <span style={{ color: "#A78BFA" }}>FlowForge</span>
          </div>
        </Anim>

        <Anim delay={0.3}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "2vw",
              lineHeight: 1.5,
              maxWidth: "40vw",
            }}
          >
            Your guide to unified supply-chain communication — inbox, orders, quotes, and AI, all in one place.
          </div>
        </Anim>

        <Anim delay={0.45}>
          <div
            style={{
              marginTop: "4vh",
              display: "flex",
              gap: "1.5vw",
            }}
          >
            <div
              style={{
                background: "#7C3AED",
                color: "#F1F5F9",
                borderRadius: "0.6vw",
                padding: "1.2vh 2.2vw",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.4vw",
              }}
            >
              6 chapters
            </div>
            <div
              style={{
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#A78BFA",
                borderRadius: "0.6vw",
                padding: "1.2vh 2.2vw",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.4vw",
              }}
            >
              25 slides
            </div>
          </div>
        </Anim>
      </div>

      <div
        style={{
          position: "absolute",
          right: "6vw",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.2vh",
        }}
      >
        {[
          { num: "01", label: "Welcome" },
          { num: "02", label: "Inbox" },
          { num: "03", label: "Orders" },
          { num: "04", label: "Quotes" },
          { num: "05", label: "Mobile" },
          { num: "06", label: "AI" },
        ].map((ch, i) => (
          <Anim key={ch.num} delay={0.5 + i * 0.07}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1vw",
                background: i === 0 ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.06)",
                border: `1px solid ${i === 0 ? "rgba(124,58,237,0.5)" : "rgba(124,58,237,0.15)"}`,
                borderRadius: "0.6vw",
                padding: "1vh 1.4vw",
                width: "18vw",
              }}
            >
              <span
                style={{
                  color: i === 0 ? "#A78BFA" : "#4B5563",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: "1.1vw",
                }}
              >
                {ch.num}
              </span>
              <span
                style={{
                  color: i === 0 ? "#F1F5F9" : "#64748B",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: "1.2vw",
                }}
              >
                {ch.label}
              </span>
            </div>
          </Anim>
        ))}
      </div>

      <ChapterNav />
    </div>
  );
}
