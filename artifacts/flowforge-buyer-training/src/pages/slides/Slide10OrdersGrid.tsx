import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import OrdersGridMock from "@/components/OrdersGridMock";

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

export default function Slide10OrdersGrid() {
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
          top: "50%",
          left: "5vw",
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
            Chapter 03 — Orders
          </div>
        </Anim>

        <Anim delay={0.1}>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "3.6vw",
              color: "#F1F5F9",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              marginBottom: "2.5vh",
            }}
          >
            The orders grid
          </div>
        </Anim>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.8vh" }}>
          <Anim delay={0.2}>
            <GridFeature title="Dual PO columns" desc="Supplier PO and your buyer PO sit side by side — one search finds the order from either side." />
          </Anim>
          <Anim delay={0.3}>
            <GridFeature title="Spread badge" desc="Live margin between buyer total and sum of payments — green when healthy, amber when tight." />
          </Anim>
          <Anim delay={0.4}>
            <GridFeature title="Stage column" desc="Quote, Production, and Ex-Factory update the moment a reply is sent from the Inbox." />
          </Anim>
          <Anim delay={0.5}>
            <GridFeature title="Task checklist" desc="Each shipment has a task list — attach tasks from the grid without opening a full detail view." />
          </Anim>
        </div>
      </div>

      <Anim delay={0.15}>
        <div
          style={{
            position: "absolute",
            right: "4vw",
            top: "50%",
            transform: "translateY(-50%)",
            width: "54vw",
            height: "64vh",
          }}
        >
          <OrdersGridMock />
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function GridFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1vw",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "0.45vw",
          background: "#7C3AED",
          borderRadius: "999px",
          alignSelf: "stretch",
          minHeight: "3vh",
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            color: "#F1F5F9",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.35vw",
            marginBottom: "0.3vh",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#94A3B8",
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: "1.1vw",
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}
