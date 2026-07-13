import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  title: string;
  body: string;
  renderPanel?: () => React.ReactNode;
}

interface StepFlowProps {
  steps: Step[];
}

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

export default function StepFlow({ steps }: StepFlowProps) {
  const [current, setCurrent] = useState(0);

  if (isAllSlides) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              background: "#131929",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "0.8vw",
              padding: "1.2vh 1.6vw",
              display: "flex",
              gap: "1.2vw",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "2.4vw",
                height: "2.4vw",
                borderRadius: "50%",
                background: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F1F5F9",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.2vw",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#F1F5F9",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: "1.4vw",
                  marginBottom: "0.3vh",
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  color: "#94A3B8",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: "1.2vw",
                  lineHeight: 1.5,
                }}
              >
                {step.body}
              </div>
              {step.renderPanel && (
                <div style={{ marginTop: "1vh" }}>{step.renderPanel()}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const step = steps[current];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
      <div style={{ position: "relative", overflow: "hidden", minHeight: "18vh" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "#131929",
              border: "1px solid rgba(124,58,237,0.45)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2vw",
            }}
          >
            <div
              style={{
                color: "#A78BFA",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.1vw",
                marginBottom: "0.8vh",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Step {current + 1} of {steps.length}
            </div>
            <div
              style={{
                color: "#F1F5F9",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "2vw",
                marginBottom: "0.8vh",
              }}
            >
              {step.title}
            </div>
            <div
              style={{
                color: "#94A3B8",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "1.35vw",
                lineHeight: 1.6,
              }}
            >
              {step.body}
            </div>
            {step.renderPanel && (
              <div style={{ marginTop: "1.5vh" }}>{step.renderPanel()}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", gap: "1vw", alignItems: "center" }}>
        <button
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          style={{
            background: current === 0 ? "rgba(124,58,237,0.1)" : "#7C3AED",
            color: current === 0 ? "#4B5563" : "#F1F5F9",
            border: "none",
            borderRadius: "0.5vw",
            padding: "0.7vh 1.5vw",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.2vw",
            cursor: current === 0 ? "default" : "pointer",
          }}
        >
          Prev
        </button>

        <div style={{ display: "flex", gap: "0.5vw", flex: 1, justifyContent: "center" }}>
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? "2vw" : "0.6vw",
                height: "0.6vh",
                borderRadius: "999px",
                background: i === current ? "#7C3AED" : "rgba(124,58,237,0.3)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrent(Math.min(steps.length - 1, current + 1))}
          disabled={current === steps.length - 1}
          style={{
            background: current === steps.length - 1 ? "rgba(124,58,237,0.1)" : "#7C3AED",
            color: current === steps.length - 1 ? "#4B5563" : "#F1F5F9",
            border: "none",
            borderRadius: "0.5vw",
            padding: "0.7vh 1.5vw",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.2vw",
            cursor: current === steps.length - 1 ? "default" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
