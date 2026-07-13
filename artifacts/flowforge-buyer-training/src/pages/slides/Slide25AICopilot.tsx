import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const QUEUE = [
  {
    id: 1,
    type: "Stage advance",
    supplier: "Sunrise Apparel",
    po: "SA-2026-4821",
    action: "Move to Ex-Factory",
    confidence: 92,
  },
  {
    id: 2,
    type: "Payment flag",
    supplier: "Pacific Mills",
    po: "PM-2026-1152",
    action: "Mark invoice paid ($20,160)",
    confidence: 88,
  },
  {
    id: 3,
    type: "Task complete",
    supplier: "ShiningTex",
    po: "ST-2026-0071",
    action: "Close QC inspection task",
    confidence: 95,
  },
];

export default function Slide25AICopilot() {
  const [approved, setApproved] = useState<number[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const pending = QUEUE.filter(
    (q) => !approved.includes(q.id) && !dismissed.includes(q.id)
  );

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
            "radial-gradient(ellipse 55% 55% at 0% 50%, rgba(124,58,237,0.1) 0%, transparent 60%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "7vw",
          transform: "translateY(-50%)",
          width: "32vw",
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
            Chapter 06 — AI
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
            Copilot queue
          </div>
        </Anim>

        <Anim delay={0.2}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.4vw",
              lineHeight: 1.6,
              marginBottom: "2.5vh",
            }}
          >
            AI reads incoming messages and proposes actions. You review each suggestion and confirm or dismiss with one click — nothing changes until you approve.
          </div>
        </Anim>

        <Anim delay={0.3}>
          <div style={{ display: "flex", gap: "1.2vw" }}>
            <div
              style={{
                background: "#131929",
                border: "1px solid rgba(124,58,237,0.22)",
                borderRadius: "0.7vw",
                padding: "1.2vh 1.4vw",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "2.2vw" }}>
                {approved.length}
              </div>
              <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>Approved</div>
            </div>
            <div
              style={{
                background: "#131929",
                border: "1px solid rgba(124,58,237,0.22)",
                borderRadius: "0.7vw",
                padding: "1.2vh 1.4vw",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "2.2vw" }}>
                {pending.length}
              </div>
              <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>Pending</div>
            </div>
          </div>
        </Anim>
      </div>

      <div
        style={{
          position: "absolute",
          right: "5vw",
          top: "50%",
          transform: "translateY(-50%)",
          width: "50vw",
          display: "flex",
          flexDirection: "column",
          gap: "1.5vh",
        }}
      >
        <Anim delay={0.25}>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: "1vw",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "0.5vh",
            }}
          >
            {isAllSlides ? "AI suggestions" : `${pending.length} suggestion${pending.length !== 1 ? "s" : ""} waiting`}
          </div>
        </Anim>

        {isAllSlides ? (
          <>
            {QUEUE.map((item) => (
              <CopilotCard
                key={item.id}
                item={item}
                onApprove={() => {}}
                onDismiss={() => {}}
                approved={false}
                dismissed={false}
              />
            ))}
          </>
        ) : (
          <AnimatePresence>
            {QUEUE.map((item) => {
              const isApproved = approved.includes(item.id);
              const isDismissed = dismissed.includes(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <CopilotCard
                    item={item}
                    onApprove={() => setApproved((a) => [...a, item.id])}
                    onDismiss={() => setDismissed((d) => [...d, item.id])}
                    approved={isApproved}
                    dismissed={isDismissed}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!isAllSlides && pending.length === 0 && QUEUE.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "0.8vw",
              padding: "2vh 1.8vw",
              textAlign: "center",
              color: "#86EFAC",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "1.4vw",
            }}
          >
            All caught up — queue is empty.
          </motion.div>
        )}
      </div>

      <ChapterNav />
    </div>
  );
}

function CopilotCard({
  item,
  onApprove,
  onDismiss,
  approved,
  dismissed,
}: {
  item: (typeof QUEUE)[0];
  onApprove: () => void;
  onDismiss: () => void;
  approved: boolean;
  dismissed: boolean;
}) {
  return (
    <div
      style={{
        background: approved
          ? "rgba(34,197,94,0.06)"
          : dismissed
          ? "rgba(239,68,68,0.04)"
          : "#131929",
        border: `1px solid ${approved ? "rgba(34,197,94,0.3)" : dismissed ? "rgba(239,68,68,0.2)" : "rgba(124,58,237,0.25)"}`,
        borderRadius: "0.8vw",
        padding: "1.5vh 1.6vw",
        opacity: approved || dismissed ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1vw" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "0.6vw", alignItems: "center", marginBottom: "0.5vh" }}>
            <span
              style={{
                background: "rgba(124,58,237,0.15)",
                color: "#A78BFA",
                borderRadius: "999px",
                padding: "0.1vh 0.7vw",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "0.9vw",
              }}
            >
              {item.type}
            </span>
            <span
              style={{
                color: "#22C55E",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "0.95vw",
              }}
            >
              {item.confidence}% confidence
            </span>
          </div>
          <div
            style={{
              color: "#F1F5F9",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "1.3vw",
              marginBottom: "0.3vh",
            }}
          >
            {item.action}
          </div>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.05vw",
            }}
          >
            {item.supplier} · {item.po}
          </div>
        </div>

        {!approved && !dismissed && (
          <div style={{ display: "flex", gap: "0.6vw", flexShrink: 0 }}>
            <button
              onClick={onDismiss}
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#F87171",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "0.4vw",
                padding: "0.5vh 1.1vw",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "1.05vw",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
            <button
              onClick={onApprove}
              style={{
                background: "#7C3AED",
                color: "#F1F5F9",
                border: "none",
                borderRadius: "0.4vw",
                padding: "0.5vh 1.3vw",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.05vw",
                cursor: "pointer",
              }}
            >
              Approve
            </button>
          </div>
        )}
        {approved && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3vh",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "2.2vw",
                height: "2.2vw",
                borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                border: "2px solid #22C55E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22C55E",
                fontSize: "1.1vw",
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <span style={{ color: "#22C55E", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "0.85vw" }}>
              Confirmed
            </span>
          </div>
        )}
        {dismissed && (
          <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.05vw", flexShrink: 0 }}>
            Dismissed
          </div>
        )}
      </div>
    </div>
  );
}
