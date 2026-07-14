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
    question: "What does FlowForge automatically handle for you?",
    options: [
      "Supplier negotiations and pricing decisions",
      "Inbox routing, stage tracking, and AI-drafted replies",
      "Setting your margin targets and budget",
      "Booking freight and customs clearance",
    ],
    correctIndex: 1,
    explanation:
      "FlowForge handles the operational layer — routing, tracking, and drafts — while buyers control approvals and decisions.",
  },
  {
    question: "How do you connect your supplier emails to FlowForge?",
    options: [
      "Forward each email manually to a FlowForge address",
      "Import a CSV of email threads",
      "Connect Gmail via the OAuth flow in Settings",
      "Ask your supplier to CC FlowForge support",
    ],
    correctIndex: 2,
    explanation:
      "Settings → Gmail integration lets you authorize FlowForge to read and send via your supplier-facing inbox in about 30 seconds.",
  },
  {
    question: "Where does FlowForge show supplier messages from all channels?",
    options: [
      "Separate tabs for each channel (Email, WeChat, WhatsApp)",
      "The unified Inbox — one view for all channels",
      "A reports dashboard you generate weekly",
      "Only in the mobile app",
    ],
    correctIndex: 1,
    explanation:
      "The Inbox is the default home screen — email, WhatsApp, WeChat, and SMS threads all appear together.",
  },
];

export default function SlideQ1Welcome() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.08) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 50% 60% at 0% 50%, rgba(124,58,237,0.12) 0%, transparent 65%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "26vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.05vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>Chapter 01 — Welcome</div>
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
          <QuizCard chapterLabel="Ch 01" questions={questions} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
