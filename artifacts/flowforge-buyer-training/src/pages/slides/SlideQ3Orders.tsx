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
    question: "What are the three shipment stages FlowForge tracks?",
    options: [
      "Quote, Ship, Deliver",
      "Factory Quote, Production, Ex-Factory",
      "RFQ, Purchase Order, Invoice",
      "Order, Pack, Dispatch",
    ],
    correctIndex: 1,
    explanation:
      "FlowForge uses three stages: Factory Quote (pricing), Production (manufacturing), and Ex-Factory (goods leaving the factory).",
  },
  {
    question: "What does the spread badge on an order show?",
    options: [
      "How many shipments are in production",
      "The number of open tasks",
      "The difference between buyer total and supplier payment amounts",
      "Message volume from the supplier",
    ],
    correctIndex: 2,
    explanation:
      "Spread = buyer total − sum of supplier payments. A green badge means you're ahead of cost; red means payments exceeded total.",
  },
  {
    question: "Where can you see Buyer PO and Supplier PO side by side?",
    options: [
      "In the Inbox message thread",
      "On the Shipment Detail panel",
      "In the Orders grid",
      "On the Reports page",
    ],
    correctIndex: 2,
    explanation:
      "The Orders grid has dual PO columns so you can instantly match your buyer PO to the factory's reference number.",
  },
];

export default function SlideQ3Orders() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.08) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 50% 60% at 0% 50%, rgba(124,58,237,0.12) 0%, transparent 65%)" }} />

      <div style={{ position: "absolute", top: "50%", left: "7vw", transform: "translateY(-50%)", width: "26vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.05vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>Chapter 03 — Orders</div>
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
          <QuizCard chapterLabel="Ch 03" questions={questions} />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}
