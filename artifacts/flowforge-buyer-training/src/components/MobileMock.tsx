import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileMockProps {
  screen?: "home" | "capture" | "detail";
  enableStepThrough?: boolean;
}

const SCREENS: Array<"home" | "capture" | "detail"> = ["home", "capture", "detail"];
const SCREEN_LABELS: Record<string, string> = {
  home: "Home",
  capture: "Capture",
  detail: "Detail",
};

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

export default function MobileMock({ screen: initialScreen = "home", enableStepThrough = false }: MobileMockProps) {
  const startIdx = SCREENS.indexOf(initialScreen);
  const [idx, setIdx] = useState(startIdx >= 0 ? startIdx : 0);

  const screen = enableStepThrough ? SCREENS[idx] : initialScreen;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1vh" }}>
      <div
        style={{
          background: "#131929",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: "2.5vw",
          overflow: "hidden",
          width: "18vw",
          height: "36vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 0 0.3vw rgba(11,15,26,0.8)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#0B0F1A",
            padding: "0.8vh 1.2vw",
            borderBottom: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.1vw" }}>
            FlowForge
          </div>
          <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#7C3AED" }} />
        </div>

        <div style={{ flex: 1, overflowY: "hidden", padding: "1vh 1vw", position: "relative" }}>
          {isAllSlides ? (
            <>
              {screen === "home" && <MobileHome />}
              {screen === "capture" && <MobileCapture />}
              {screen === "detail" && <MobileDetail />}
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{ position: "absolute", inset: "1vh 1vw" }}
              >
                {screen === "home" && <MobileHome />}
                {screen === "capture" && <MobileCapture />}
                {screen === "detail" && <MobileDetail />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div
          style={{
            background: "#0B0F1A",
            padding: "0.8vh 0",
            borderTop: "1px solid rgba(124,58,237,0.2)",
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          <NavIcon label="Home" active={screen === "home"} onClick={enableStepThrough && !isAllSlides ? () => setIdx(0) : undefined} />
          <NavIcon label="Capture" active={screen === "capture"} onClick={enableStepThrough && !isAllSlides ? () => setIdx(1) : undefined} />
          <NavIcon label="Orders" active={screen === "detail"} onClick={enableStepThrough && !isAllSlides ? () => setIdx(2) : undefined} />
          <NavIcon label="Settings" active={false} />
        </div>
      </div>

      {enableStepThrough && !isAllSlides && (
        <div style={{ display: "flex", gap: "0.8vw", alignItems: "center" }}>
          <button
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
            disabled={idx === 0}
            style={{
              background: idx === 0 ? "rgba(124,58,237,0.1)" : "#7C3AED",
              color: idx === 0 ? "#4B5563" : "#F1F5F9",
              border: "none",
              borderRadius: "0.4vw",
              padding: "0.4vh 1.1vw",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "1vw",
              cursor: idx === 0 ? "default" : "pointer",
            }}
          >
            Prev
          </button>
          <div style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>
            {SCREEN_LABELS[screen]}
          </div>
          <button
            onClick={() => setIdx((v) => Math.min(SCREENS.length - 1, v + 1))}
            disabled={idx === SCREENS.length - 1}
            style={{
              background: idx === SCREENS.length - 1 ? "rgba(124,58,237,0.1)" : "#7C3AED",
              color: idx === SCREENS.length - 1 ? "#4B5563" : "#F1F5F9",
              border: "none",
              borderRadius: "0.4vw",
              padding: "0.4vh 1.1vw",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "1vw",
              cursor: idx === SCREENS.length - 1 ? "default" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function NavIcon({ label, active, onClick }: { label: string; active: boolean; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onClick(); } } : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2vh", cursor: onClick ? "pointer" : "default" }}
    >
      <div style={{ width: "1.2vw", height: "1.2vw", borderRadius: "0.25vw", background: active ? "#7C3AED" : "rgba(124,58,237,0.2)" }} />
      <span style={{ color: active ? "#A78BFA" : "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.75vw" }}>
        {label}
      </span>
    </div>
  );
}

function MobileHome() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
      <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw", marginBottom: "0.5vh" }}>Active shipments</div>
      <MobileShipmentCard name="Sunrise Apparel" stage="Production" pct={65} />
      <MobileShipmentCard name="Gold Top" stage="Ex-Factory" pct={90} />
      <MobileShipmentCard name="Pacific Mills" stage="Quote" pct={20} />
    </div>
  );
}

function MobileShipmentCard({ name, stage, pct }: { name: string; stage: string; pct: number }) {
  return (
    <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "0.6vw", padding: "0.8vh 0.8vw" }}>
      <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.9vw", marginBottom: "0.3vh" }}>{name}</div>
      <div style={{ color: "#A78BFA", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", marginBottom: "0.5vh" }}>{stage}</div>
      <div style={{ background: "rgba(124,58,237,0.15)", borderRadius: "999px", height: "0.4vh", overflow: "hidden" }}>
        <div style={{ background: "#7C3AED", width: `${pct}%`, height: "100%", borderRadius: "999px" }} />
      </div>
    </div>
  );
}

function MobileCapture() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1vh" }}>
      <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw" }}>Paste chat export</div>
      <div
        style={{
          background: "rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: "0.5vw",
          padding: "0.8vh 0.8vw",
          minHeight: "8vh",
          color: "#4B5563",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "0.8vw",
          lineHeight: 1.4,
        }}
      >
        [10:24 AM] Chen Wei: samples ready sending photos...
      </div>
      <div
        style={{
          background: "#7C3AED",
          borderRadius: "0.5vw",
          padding: "0.7vh",
          textAlign: "center",
          color: "#F1F5F9",
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: "0.9vw",
        }}
      >
        Extract with AI
      </div>
      <div
        style={{
          background: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: "0.5vw",
          padding: "0.6vh 0.8vw",
        }}
      >
        <div style={{ color: "#86EFAC", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.8vw", marginBottom: "0.2vh" }}>Extracted</div>
        <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.75vw" }}>Supplier: Gold Top · PO: GT-339</div>
      </div>
    </div>
  );
}

function MobileDetail() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8vh" }}>
      <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.95vw" }}>Sunrise Apparel</div>
      <div style={{ color: "#A78BFA", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>PO #4821 · Production</div>
      <div style={{ borderTop: "1px solid rgba(124,58,237,0.15)", paddingTop: "0.5vh" }}>
        <MobileDetailRow label="Units" value="4,200" />
        <MobileDetailRow label="Ex-Factory" value="May 28" />
        <MobileDetailRow label="Spread" value="+12.4%" />
      </div>
    </div>
  );
}

function MobileDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.4vh" }}>
      <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw" }}>{label}</span>
      <span style={{ color: "#F1F5F9", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
