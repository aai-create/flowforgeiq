import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import QuizCard from "@/components/QuizCard";
import type { QuizQuestion } from "@/components/QuizCard";

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

const questions: QuizQuestion[] = [
  {
    question: "Which channels appear together in the FlowForge Inbox?",
    options: [
      "Email only",
      "Email and WhatsApp only",
      "Email, WhatsApp, WeChat, and SMS",
      "Any channel you configure via IMAP settings",
    ],
    correctIndex: 2,
    explanation:
      "All four channels — email, WhatsApp, WeChat, and SMS — are unified in the single Inbox view.",
  },
  {
    question: "When you reply to a message in the Inbox, what additional action happens?",
    options: [
      "Nothing extra — just a reply is sent",
      "The shipment stage automatically advances",
      "A new task is created in the task list",
      "A PDF summary is generated",
    ],
    correctIndex: 1,
    explanation:
      "Replying in the Inbox advances the linked shipment to the next stage in one action — no separate update needed.",
  },
  {
    question: "How do you filter Inbox messages to a specific supplier?",
    options: [
      "Search by email address in the global search bar",
      "Click the supplier pill in the Inbox filter bar",
      "Open the supplier profile and view messages there",
      "Sort alphabetically and scroll",
    ],
    correctIndex: 1,
    explanation:
      "The filter bar at the top of the Inbox has channel, supplier, and shipment pills for one-click filtering.",
  },
];

export default function SlideQ2Inbox() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.08) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 50% 60% at 0% 50%, rgba(124,58,237,0.12) 0%, transparent 65%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "26vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.05vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>Chapter 02 — Inbox</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "3.8vw", color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "1.5vh" }}>
            Knowledge<br />Check
          </div>
        </Anim>
        <Anim delay={0.2}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.3vw", lineHeight: 1.6 }}>
            3 quick questions before moving on. Select the best answer for each.
          </div>
        </Anim>
        <Anim delay={0.3}>
          <div style={{ marginTop: "2vh", display: "flex", gap: "0.5vw" }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  width: "2.2vw",
                  height: "2.2vw",
                  borderRadius: "50%",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#A78BFA",
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: "1.1vw",
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </Anim>
      </div>

      <Anim delay={0.25}>
        <div style={{ position: "absolute", right: "4vw", top: "50%", transform: "translateY(-50%)", width: "58vw" }}>
          <QuizCard chapterLabel="Ch 02" questions={questions} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
