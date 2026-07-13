import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import InboxMock from "@/components/InboxMock";
import MobileMock from "@/components/MobileMock";
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

export default function Slide03HowItHelps() {
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
          top: "7vh",
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
              marginBottom: "0.8vh",
            }}
          >
            One product,{" "}
            <span style={{ color: "#A78BFA" }}>web and mobile</span>
          </div>
        </Anim>

        <Anim delay={0.15}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.35vw",
              marginBottom: "2.5vh",
            }}
          >
            The same data, inbox, and orders — at your desk or on the factory floor.
          </div>
        </Anim>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "3vw",
            alignItems: "start",
          }}
        >
          <Anim delay={0.2}>
            <div
              style={{
                position: "relative",
                height: "55vh",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <InboxMock />
              </div>

              <Hotspot
                top="12%"
                left="18%"
                label="Unified header"
                description="One inbox for all five channels. The unread badge shows messages waiting across Email, WhatsApp, WeChat, iMessage, and SMS combined."
              />
              <Hotspot
                top="35%"
                left="95%"
                label="Channel chips"
                description="Filter the inbox to a single channel with one click. Useful when a supplier only communicates via WeChat or WhatsApp."
              />
              <Hotspot
                top="65%"
                left="60%"
                label="Draft with AI"
                description="Every message row has a 'Draft with AI' button that generates a context-aware reply. Review and send in seconds."
              />
            </div>
          </Anim>

          <Anim delay={0.3}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.5vh",
              }}
            >
              <div
                style={{
                  color: "#94A3B8",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: "1vw",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.5vh",
                }}
              >
                Mobile PWA
              </div>
              <div style={{ position: "relative" }}>
                <MobileMock screen="home" enableStepThrough />
                <div
                  style={{
                    position: "absolute",
                    top: "20%",
                    left: "calc(100% + 0.8vw)",
                    width: "10vw",
                  }}
                >
                  <CalloutLine text="Same inbox data, optimized for touch" />
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "60%",
                    left: "calc(100% + 0.8vw)",
                    width: "10vw",
                  }}
                >
                  <CalloutLine text="Shipment progress at a glance" />
                </div>
              </div>
              <div
                style={{
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  borderRadius: "0.5vw",
                  padding: "0.6vh 1.2vw",
                  color: "#A78BFA",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: "0.95vw",
                  textAlign: "center",
                }}
              >
                Install via Add to Home Screen
              </div>
            </div>
          </Anim>
        </div>
      </div>

      <ChapterNav />
    </div>
  );
}

function CalloutLine({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5vw",
      }}
    >
      <div
        style={{
          width: "1.5vw",
          height: "1px",
          background: "rgba(124,58,237,0.4)",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: "#94A3B8",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "0.95vw",
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
    </div>
  );
}
