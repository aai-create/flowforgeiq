import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizCardProps {
  chapterLabel: string;
  questions: QuizQuestion[];
}

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

function StaticQuizCard({ questions, chapterLabel }: QuizCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
      {questions.map((q, qi) => (
        <div
          key={qi}
          style={{
            background: "#131929",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: "0.8vw",
            padding: "1.4vh 1.8vw",
          }}
        >
          <div
            style={{
              color: "#A78BFA",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "1vw",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: "0.5vh",
            }}
          >
            {chapterLabel} · Q{qi + 1}
          </div>
          <div
            style={{
              color: "#F1F5F9",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "1.35vw",
              marginBottom: "0.8vh",
            }}
          >
            {q.question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4vh" }}>
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7vw",
                  background:
                    oi === q.correctIndex
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(255,255,255,0.02)",
                  border: `1px solid ${oi === q.correctIndex ? "rgba(34,197,94,0.35)" : "rgba(124,58,237,0.12)"}`,
                  borderRadius: "0.5vw",
                  padding: "0.45vh 1vw",
                }}
              >
                <div
                  style={{
                    width: "1.4vw",
                    height: "1.4vw",
                    borderRadius: "50%",
                    background:
                      oi === q.correctIndex ? "#22C55E" : "rgba(124,58,237,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "0.75vw",
                    fontWeight: 700,
                    color: oi === q.correctIndex ? "#fff" : "#4B5563",
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  }}
                >
                  {oi === q.correctIndex ? "✓" : String.fromCharCode(65 + oi)}
                </div>
                <span
                  style={{
                    color: oi === q.correctIndex ? "#86EFAC" : "#94A3B8",
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    fontSize: "1.05vw",
                  }}
                >
                  {opt}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "0.6vh",
              color: "#4B5563",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "0.9vw",
              fontStyle: "italic",
            }}
          >
            {q.explanation}
          </div>
        </div>
      ))}
    </div>
  );
}

type AnswerState = "unanswered" | "correct" | "wrong";

function InteractiveQuestion({
  q,
  qi,
  chapterLabel,
  onCorrect,
}: {
  q: QuizQuestion;
  qi: number;
  chapterLabel: string;
  onCorrect: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const state: AnswerState =
    selected === null
      ? "unanswered"
      : selected === q.correctIndex
        ? "correct"
        : "wrong";

  function pick(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correctIndex) onCorrect();
  }

  return (
    <div
      style={{
        background: "#131929",
        border: `1px solid ${state === "correct" ? "rgba(34,197,94,0.4)" : state === "wrong" ? "rgba(239,68,68,0.35)" : "rgba(124,58,237,0.35)"}`,
        borderRadius: "0.8vw",
        padding: "1.6vh 2vw",
        transition: "border-color 0.3s",
      }}
    >
      <div
        style={{
          color: "#A78BFA",
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: "1vw",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: "0.6vh",
        }}
      >
        {chapterLabel} · Question {qi + 1}
      </div>
      <div
        style={{
          color: "#F1F5F9",
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: "1.55vw",
          marginBottom: "1.2vh",
          lineHeight: 1.3,
        }}
      >
        {q.question}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55vh" }}>
        {q.options.map((opt, oi) => {
          const isCorrect = oi === q.correctIndex;
          const isSelected = oi === selected;
          let bg = "rgba(255,255,255,0.03)";
          let border = "rgba(124,58,237,0.18)";
          let color = "#94A3B8";
          let dotBg = "rgba(124,58,237,0.15)";
          let dotColor = "#4B5563";

          if (selected !== null) {
            if (isCorrect) {
              bg = "rgba(34,197,94,0.08)";
              border = "rgba(34,197,94,0.4)";
              color = "#86EFAC";
              dotBg = "#22C55E";
              dotColor = "#fff";
            } else if (isSelected) {
              bg = "rgba(239,68,68,0.07)";
              border = "rgba(239,68,68,0.35)";
              color = "#FCA5A5";
              dotBg = "#EF4444";
              dotColor = "#fff";
            }
          }

          return (
            <button
              key={oi}
              onClick={() => pick(oi)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8vw",
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: "0.5vw",
                padding: "0.6vh 1.2vw",
                cursor: selected !== null ? "default" : "pointer",
                textAlign: "left",
                transition: "all 0.25s",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "1.6vw",
                  height: "1.6vw",
                  borderRadius: "50%",
                  background: dotBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "0.85vw",
                  fontWeight: 700,
                  color: dotColor,
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  transition: "all 0.25s",
                }}
              >
                {selected !== null && isCorrect
                  ? "✓"
                  : selected !== null && isSelected
                    ? "✕"
                    : String.fromCharCode(65 + oi)}
              </div>
              <span
                style={{
                  color,
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: "1.15vw",
                  transition: "color 0.25s",
                }}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {state !== "unanswered" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              marginTop: "0.9vh",
              color: state === "correct" ? "#86EFAC" : "#FCA5A5",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.05vw",
              fontStyle: "italic",
            }}
          >
            {state === "correct" ? "✓ Correct — " : "✕ Not quite — "}
            {q.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuizCard({ chapterLabel, questions }: QuizCardProps) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (isAllSlides) {
    return <StaticQuizCard chapterLabel={chapterLabel} questions={questions} />;
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const allCorrect = score === questions.length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "#131929",
          border: `1px solid ${allCorrect ? "rgba(34,197,94,0.4)" : "rgba(124,58,237,0.35)"}`,
          borderRadius: "0.8vw",
          padding: "3vh 2.5vw",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "3.5vw",
            marginBottom: "1vh",
          }}
        >
          {allCorrect ? "🎉" : "👍"}
        </div>
        <div
          style={{
            color: allCorrect ? "#86EFAC" : "#A78BFA",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "2.4vw",
            marginBottom: "0.5vh",
          }}
        >
          {score}/{questions.length} correct
        </div>
        <div
          style={{
            color: "#94A3B8",
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: "1.3vw",
            marginBottom: "2vh",
          }}
        >
          {pct === 100
            ? "Perfect score — you're ready for the next chapter."
            : pct >= 67
              ? "Good work — review the missed question before moving on."
              : "Revisit this chapter before continuing."}
        </div>
        <button
          onClick={() => {
            setCurrent(0);
            setScore(0);
            setDone(false);
          }}
          style={{
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.35)",
            borderRadius: "0.5vw",
            padding: "0.7vh 1.8vw",
            color: "#A78BFA",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.1vw",
            cursor: "pointer",
          }}
        >
          Retake quiz
        </button>
      </motion.div>
    );
  }

  const q = questions[current];
  const isLast = current === questions.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
      <div style={{ display: "flex", gap: "0.4vw", marginBottom: "0.2vh" }}>
        {questions.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "0.4vh",
              borderRadius: "999px",
              background:
                i < current
                  ? "#7C3AED"
                  : i === current
                    ? "rgba(124,58,237,0.5)"
                    : "rgba(124,58,237,0.15)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <InteractiveQuestion
            q={q}
            qi={current}
            chapterLabel={chapterLabel}
            onCorrect={() => setScore((s) => s + 1)}
          />
        </motion.div>
      </AnimatePresence>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <NextButton
          label={isLast ? "See results" : "Next question →"}
          onClick={() => {
            if (isLast) {
              setDone(true);
            } else {
              setCurrent((c) => c + 1);
            }
          }}
        />
      </div>
    </div>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#7C3AED",
        border: "none",
        borderRadius: "0.5vw",
        padding: "0.7vh 2vw",
        color: "#F1F5F9",
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: "1.15vw",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
