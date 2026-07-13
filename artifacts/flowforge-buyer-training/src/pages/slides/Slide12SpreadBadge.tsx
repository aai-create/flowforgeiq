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

const ORDERS = [
  { po: "GT-2026-0339", supplier: "Gold Top Garment", units: 4200, buyerUsd: 32970, paymentsBase: 24900, paymentsExtras: [3600, 870] },
  { po: "SA-2026-0201", supplier: "Sunrise Apparel", units: 6000, buyerUsd: 47400, paymentsBase: 38200, paymentsExtras: [4100, 1200] },
  { po: "PM-2026-0088", supplier: "Pacific Mills", units: 2800, buyerUsd: 18760, paymentsBase: 15600, paymentsExtras: [2100] },
];

export default function Slide12SpreadBadge() {
  const [activeOrder, setActiveOrder] = useState(0);
  const [paidExtras, setPaidExtras] = useState<boolean[]>([false, false]);
  const order = ORDERS[activeOrder];
  const totalPaid = order.paymentsBase + order.paymentsExtras.reduce((sum, v, i) => sum + (paidExtras[i] ? v : 0), 0);
  const spreadUsd = order.buyerUsd - totalPaid;
  const spreadPct = ((spreadUsd / order.buyerUsd) * 100).toFixed(1);
  const spreadColor = parseFloat(spreadPct) >= 10 ? "#22C55E" : parseFloat(spreadPct) >= 4 ? "#F59E0B" : "#EF4444";

  function toggleExtra(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    setPaidExtras((prev) => { const next = [...prev]; next[i] = !next[i]; return next; });
  }

  function selectOrder(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveOrder(i);
    setPaidExtras([false, false]);
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0B0F1A" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)", backgroundSize: "2.8vw 2.8vw" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 55% 55% at 100% 0%, rgba(34,197,94,0.07) 0%, transparent 60%)" }} />

      <div style={{ position: "absolute", top: "7vh", left: "7vw", right: "7vw" }}>
        <Anim delay={0}>
          <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: "1.1vw", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.8vh" }}>Chapter 03 — Orders</div>
        </Anim>
        <Anim delay={0.1}>
          <div style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "4vw", color: "#F1F5F9", lineHeight: 1.1, letterSpacing: "-0.025em", marginBottom: "0.6vh" }}>
            Spread and margin — <span style={{ color: "#22C55E" }}>live</span>
          </div>
        </Anim>
        <Anim delay={0.15}>
          <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.35vw", marginBottom: "2.5vh" }}>
            Click an order, then mark payments as received. Watch the spread calculate in real time.
          </div>
        </Anim>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "2.5vw", alignItems: "start" }}>
          <Anim delay={0.2}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              {ORDERS.map((o, i) => (
                <div
                  key={o.po}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => selectOrder(i, e)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectOrder(i, e as unknown as React.MouseEvent); }}
                  style={{
                    background: activeOrder === i ? "#131929" : "rgba(19,25,41,0.5)",
                    border: `1px solid ${activeOrder === i ? "#7C3AED" : "rgba(124,58,237,0.15)"}`,
                    borderRadius: "0.7vw", padding: "1.3vh 1.5vw", cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.1vw" }}>{o.po}</div>
                      <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw" }}>{o.supplier} · {o.units.toLocaleString()} units</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.8vw", textTransform: "uppercase" }}>Buyer total</div>
                      <div style={{ color: "#F1F5F9", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.1vw" }}>${o.buyerUsd.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Anim>

          <Anim delay={0.3}>
            <AnimatePresence mode="wait">
              <motion.div key={activeOrder} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div style={{ background: "#131929", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "1vw", padding: "2vh 2vw", display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                  <div style={{ color: "#94A3B8", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw", textTransform: "uppercase", letterSpacing: "0.06em" }}>Spread calculator — {order.po}</div>

                  <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.12)", borderRadius: "0.5vw", padding: "1vh 1.2vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>Buyer total (USD)</span>
                    <span style={{ color: "#A78BFA", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1.2vw" }}>${order.buyerUsd.toLocaleString()}</span>
                  </div>

                  <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.9vw", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payments recorded (click to toggle):</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6vh" }}>
                    <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.45vw", padding: "0.6vh 1vw", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#86EFAC", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>✓ Deposit (auto-included)</span>
                      <span style={{ color: "#22C55E", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>${order.paymentsBase.toLocaleString()}</span>
                    </div>
                    {order.paymentsExtras.map((amt, i) => (
                      <button
                        key={i}
                        role="button"
                        onClick={(e) => toggleExtra(i, e)}
                        style={{
                          background: paidExtras[i] ? "rgba(34,197,94,0.05)" : "rgba(124,58,237,0.05)",
                          border: `1px solid ${paidExtras[i] ? "rgba(34,197,94,0.2)" : "rgba(124,58,237,0.15)"}`,
                          borderRadius: "0.45vw", padding: "0.6vh 1vw", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        <span style={{ color: paidExtras[i] ? "#86EFAC" : "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.95vw" }}>
                          {paidExtras[i] ? "✓" : "○"} {i === 0 ? "Production payment" : "Final balance"}
                        </span>
                        <span style={{ color: paidExtras[i] ? "#22C55E" : "#4B5563", fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "1vw" }}>${amt.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(124,58,237,0.15)", paddingTop: "1vh" }}>
                    <div style={{ color: "#4B5563", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "0.85vw", marginBottom: "0.3vh" }}>
                      ${order.buyerUsd.toLocaleString()} − ${totalPaid.toLocaleString()} =
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={spreadUsd} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        style={{ display: "flex", alignItems: "baseline", gap: "1vw" }}>
                        <span style={{ color: spreadColor, fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700, fontSize: "2.8vw" }}>{parseFloat(spreadPct) >= 0 ? "+" : ""}{spreadPct}%</span>
                        <span style={{ color: spreadColor, fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1.2vw" }}>${spreadUsd.toLocaleString()} spread</span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </Anim>
        </div>
      </div>

      <ChapterNav />
    </div>
  );
}
