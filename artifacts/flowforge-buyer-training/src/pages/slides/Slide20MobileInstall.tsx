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
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

export default function Slide20MobileInstall() {
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
            "radial-gradient(ellipse 55% 55% at 100% 0%, rgba(124,58,237,0.11) 0%, transparent 60%)",
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
              marginBottom: "2vh",
            }}
          >
            Installing the
            <br />
            mobile app
          </div>
        </Anim>

        <Anim delay={0.2}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.4vw",
              lineHeight: 1.6,
              marginBottom: "3.5vh",
            }}
          >
            FlowForge Mobile is a Progressive Web App — no App Store or Play Store required. Install it directly from your browser in under 30 seconds.
          </div>
        </Anim>

        <Anim delay={0.3}>
          <div
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "0.8vw",
              padding: "1.5vh 1.8vw",
            }}
          >
            <div
              style={{
                color: "#A78BFA",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.15vw",
                marginBottom: "1vh",
              }}
            >
              URL to share with your team
            </div>
            <div
              style={{
                color: "#F1F5F9",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.4vw",
                letterSpacing: "-0.01em",
              }}
            >
              flowforgeiq.com/mobile/
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
          width: "42vw",
          display: "flex",
          flexDirection: "column",
          gap: "1.5vh",
        }}
      >
        <Anim delay={0.3}>
          <InstallStep platform="iPhone (Safari)" steps="Open the URL → tap Share → Add to Home Screen → tap Add." />
        </Anim>
        <Anim delay={0.4}>
          <InstallStep platform="Android (Chrome)" steps="Open the URL → tap the 3-dot menu → Add to Home Screen → tap Add." />
        </Anim>
        <Anim delay={0.5}>
          <InstallStep platform="Desktop (Chrome)" steps="Open the URL → click the install icon in the address bar → click Install." />
        </Anim>

        <Anim delay={0.6}>
          <div
            style={{
              background: "#131929",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "0.8vw",
              padding: "1.4vh 1.8vw",
              display: "flex",
              gap: "1vw",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "0.5vw",
                height: "0.5vw",
                borderRadius: "50%",
                background: "#22C55E",
                flexShrink: 0,
                marginTop: "0.8vh",
              }}
            />
            <span
              style={{
                color: "#94A3B8",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "1.2vw",
                lineHeight: 1.5,
              }}
            >
              The PWA works offline for viewing cached shipment data — perfect when traveling between factories without reliable connectivity.
            </span>
          </div>
        </Anim>
      </div>

      <ChapterNav />
    </div>
  );
}

function InstallStep({ platform, steps }: { platform: string; steps: string }) {
  return (
    <div
      style={{
        background: "#131929",
        border: "1px solid rgba(124,58,237,0.22)",
        borderRadius: "0.8vw",
        padding: "1.5vh 1.8vw",
      }}
    >
      <div
        style={{
          color: "#F1F5F9",
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: "1.3vw",
          marginBottom: "0.4vh",
        }}
      >
        {platform}
      </div>
      <div
        style={{
          color: "#94A3B8",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "1.15vw",
          lineHeight: 1.4,
        }}
      >
        {steps}
      </div>
    </div>
  );
}
