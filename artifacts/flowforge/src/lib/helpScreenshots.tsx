import React from "react";

const C = {
  bg: "#FAFBFC",
  white: "#FFFFFF",
  border: "#E5EAF0",
  text: "#212833",
  muted: "#5E687B",
  faint: "#9E9FAE",
  purple: "#9000FF",
  purpleLight: "#9000FF14",
  green: "#059669",
  greenLight: "#D1FAE5",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  red: "#DC2626",
  redLight: "#FEE2E2",
  sky: "#0EA5E9",
  skyLight: "#E0F2FE",
  teal: "#0D9488",
  tealLight: "#CCFBF1",
  row: "#F7F9FA",
};

function Frame({ children, h = 216 }: { children: React.ReactNode; h?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: h,
        background: C.bg,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        color: C.text,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function Bar({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 28,
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 6,
        flexShrink: 0,
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: 3, background: C.red, opacity: 0.5 }} />
      <div style={{ width: 6, height: 6, borderRadius: 3, background: C.amber, opacity: 0.5 }} />
      <div style={{ width: 6, height: 6, borderRadius: 3, background: C.green, opacity: 0.5 }} />
      <div style={{ width: 1, background: C.border, height: 12, margin: "0 4px" }} />
      <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function Badge({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 9,
        fontWeight: 700,
        padding: "1px 5px",
        borderRadius: 4,
        display: "inline-block",
        letterSpacing: 0.2,
      }}
    >
      {label}
    </span>
  );
}

function Col({ w, children }: { w: number | string; children: React.ReactNode }) {
  return <div style={{ width: w, flexShrink: 0 }}>{children}</div>;
}

// ─── 1. Inbox ────────────────────────────────────────────────────────────────

export function InboxScreenshot() {
  const msgs = [
    { init: "YT", color: "#7C3AED", sender: "Yang Textiles", snippet: "ETA confirmed: Apr 22 ✓ QC done", ch: "WA", chColor: C.green, active: true },
    { init: "SF", color: "#0EA5E9", sender: "Sunrise Fabrics", snippet: "Production at 80%, slight delay...", ch: "WC", chColor: C.teal, active: false },
    { init: "HM", color: "#D97706", sender: "Hong Ming Co.", snippet: "Invoice attached — please confirm", ch: "EM", chColor: C.sky, active: false },
  ];
  return (
    <Frame>
      <Bar label="Inbox" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* message list */}
        <div style={{ width: 200, borderRight: `1px solid ${C.border}`, background: C.white, overflowY: "hidden" }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                padding: "8px 10px",
                borderBottom: `1px solid ${C.border}`,
                background: m.active ? C.purpleLight : "transparent",
                borderLeft: m.active ? `2px solid ${C.purple}` : "2px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>{m.init}</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 10.5, flex: 1 }}>{m.sender}</span>
                <span style={{ background: m.chColor, color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "1px 4px", borderRadius: 3 }}>{m.ch}</span>
              </div>
              <p style={{ color: C.muted, fontSize: 9.5, margin: 0, paddingLeft: 28, lineHeight: 1.3 }}>{m.snippet}</p>
            </div>
          ))}
        </div>
        {/* thread */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 0 0 0" }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
            <div style={{ fontWeight: 700, fontSize: 11 }}>Yang Textiles — PO-2024-0041</div>
            <div style={{ color: C.muted, fontSize: 9.5, marginTop: 2 }}>Stage: Production ◆ Ex-Factory Apr 22</div>
          </div>
          <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ background: C.row, borderRadius: 8, padding: "7px 9px", fontSize: 10, lineHeight: 1.4, color: C.muted }}>
              Hi, our QC inspection passed this morning. ETA for loading is confirmed Apr 22. Please advise on BL details.
            </div>
            <div style={{ background: C.purpleLight, borderRadius: 8, padding: "7px 9px", fontSize: 10, lineHeight: 1.4, border: `1px solid ${C.purple}22` }}>
              <div style={{ fontSize: 8.5, color: C.purple, fontWeight: 700, marginBottom: 3 }}>✦ AI DRAFT</div>
              Great news on QC! Please use the following BL consignee details: [Company], [Address]. Kindly confirm once booking is placed.
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ─── 2. Create PO ────────────────────────────────────────────────────────────

export function CreatePoScreenshot() {
  const field = (label: string, val: string, w: string = "100%") => (
    <div style={{ width: w }}>
      <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, color: val ? C.text : C.faint }}>
        {val || "—"}
      </div>
    </div>
  );
  return (
    <Frame>
      <Bar label="My Orders — New Purchase Order" />
      <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: C.purple }}>New Purchase Order</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
            {field("PO Number (Buyer)", "PO-2026-0089")}
            {field("Supplier PO", "SUP-FW26-089")}
            {field("Product Description", "Women's Linen Blazer (Navy)")}
            {field("Category", "Outerwear")}
            {field("Supplier", "Yang Textiles Co.")}
            {field("Buyer", "Forever 21")}
            {field("Ex-Factory Date", "Jul 8, 2026")}
            {field("Delivery Due", "Aug 2, 2026")}
            {field("Destination", "Los Angeles, CA")}
            {field("Unit Price (Buyer)", "$34.50")}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <div style={{ background: C.border, borderRadius: 6, padding: "5px 12px", fontSize: 10, color: C.muted, cursor: "pointer" }}>Cancel</div>
            <div style={{ background: C.purple, borderRadius: 6, padding: "5px 12px", fontSize: 10, color: "#fff", fontWeight: 600 }}>Create PO</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ─── 3. RFQ & Quote Comparison ───────────────────────────────────────────────

export function RfqQuotesScreenshot() {
  const quotes = [
    { factory: "Yang Textiles", unit: "$11.20", lead: "45 d", spread: "+$1.30", pct: "+11.6%", winner: true },
    { factory: "Sunrise Fabrics", unit: "$12.40", lead: "38 d", spread: "+$0.10", pct: "+0.8%", winner: false },
    { factory: "Hong Ming Co.", unit: "$13.80", lead: "30 d", spread: "–$1.30", pct: "–9.4%", winner: false },
  ];
  return (
    <Frame>
      <Bar label="RFQs — Quote Comparison" />
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>RFQ-2026-003 — Women's Linen Blazer</div>
            <div style={{ color: C.muted, fontSize: 9.5, marginTop: 1 }}>Target price: $12.50 · Qty: 2,400 units · Deadline: Jul 1</div>
          </div>
          <Badge label="3 QUOTES" bg={C.purpleLight} color={C.purple} />
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: C.row, padding: "5px 10px", borderBottom: `1px solid ${C.border}` }}>
            {["Factory", "Unit Price", "Lead Time", "Spread / unit", ""].map((h, i) => (
              <div key={i} style={{ flex: i === 0 ? 2 : 1, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {quotes.map((q, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 10px", background: q.winner ? "#F0FDF4" : "transparent", borderBottom: i < quotes.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ flex: 2, fontWeight: q.winner ? 700 : 400, fontSize: 10.5 }}>
                {q.factory}{q.winner && <span style={{ marginLeft: 5, background: C.green, color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "1px 4px", borderRadius: 3 }}>LOWEST</span>}
              </div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 10.5 }}>{q.unit}</div>
              <div style={{ flex: 1, fontSize: 10, color: C.muted }}>{q.lead}</div>
              <div style={{ flex: 1, fontSize: 10, color: q.spread.startsWith("–") ? C.red : C.green, fontWeight: 600 }}>{q.spread} ({q.pct})</div>
              <div style={{ flex: 1 }}>
                {q.winner && <span style={{ background: C.purple, color: "#fff", fontSize: 8.5, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }}>Use this quote</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─── 4. Spread & Margin ──────────────────────────────────────────────────────

export function SpreadMarginScreenshot() {
  const orders = [
    { po: "PO-2026-0041", supplier: "Yang Textiles", stage: "In Transit", spread: "+$14,820", pct: "28%", color: C.green, bg: C.greenLight },
    { po: "PO-2026-0038", supplier: "Sunrise Fabrics", stage: "Production", spread: "+$3,150", pct: "12%", color: C.amber, bg: C.amberLight },
    { po: "PO-2026-0031", supplier: "Pearl River Mfg", stage: "Delivered", spread: "–$980", pct: "–4%", color: C.red, bg: C.redLight },
  ];
  return (
    <Frame>
      <Bar label="My Orders — Spread Overview" />
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {orders.map((o, i) => (
          <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 10.5 }}>{o.po}</div>
              <div style={{ color: C.muted, fontSize: 9.5, marginTop: 1 }}>{o.supplier}</div>
            </div>
            <Badge label={o.stage} bg={C.row} color={C.muted} />
            <div style={{ textAlign: "right" }}>
              <div style={{ background: o.bg, color: o.color, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 6 }}>{o.spread}</div>
              <div style={{ fontSize: 9, color: o.color, marginTop: 2, textAlign: "center" }}>{o.pct} spread</div>
            </div>
          </div>
        ))}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", gap: 16 }}>
          {[{ label: "Total Orders", val: "3" }, { label: "Total Spread", val: "+$17,990" }, { label: "Avg Margin", val: "12.4%" }].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: i === 1 ? C.green : C.text }}>{s.val}</div>
              <div style={{ fontSize: 9, color: C.faint }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─── 5. Chat Ingest ──────────────────────────────────────────────────────────

export function ChatIngestScreenshot() {
  return (
    <Frame>
      <Bar label="Inbox — Chat Ingest" />
      <div style={{ flex: 1, display: "flex" }}>
        {/* left placeholder */}
        <div style={{ width: 180, borderRight: `1px solid ${C.border}`, background: C.white, padding: "8px 0" }}>
          {["Yang Textiles", "Sunrise Fabrics", "Hong Ming Co."].map((s, i) => (
            <div key={i} style={{ padding: "7px 10px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: i === 0 ? C.text : C.muted, fontWeight: i === 0 ? 600 : 400 }}>{s}</div>
          ))}
        </div>
        {/* paste panel */}
        <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Paste Chat</div>
          {/* channel selector */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "WhatsApp", color: "#25D366", active: true },
              { label: "WeChat", color: "#07C160", active: false },
              { label: "iMessage", color: "#34AADC", active: false },
              { label: "SMS", color: "#9E9FAE", active: false },
            ].map((ch, i) => (
              <div key={i} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 9.5, fontWeight: 600, background: ch.active ? ch.color : C.border, color: ch.active ? "#fff" : C.muted, border: `1px solid ${ch.active ? ch.color : C.border}` }}>{ch.label}</div>
            ))}
          </div>
          {/* text area */}
          <div style={{ flex: 1, background: C.white, border: `1.5px solid ${C.purple}`, borderRadius: 8, padding: "8px 10px", fontSize: 9.5, color: C.faint, lineHeight: 1.5 }}>
            [9:14 AM] Mei Lin: QC passed yesterday, loading starts Apr 20<br />
            [9:15 AM] Mei Lin: ETA port arrival May 3, docs coming today<br />
            <span style={{ color: C.faint }}>|</span>
          </div>
          {/* sender hint + button */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 10, color: C.muted }}>Yang Textiles</div>
            <div style={{ background: C.purple, color: "#fff", borderRadius: 6, padding: "5px 14px", fontSize: 10, fontWeight: 600 }}>Process →</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ─── 6. Track Shipment (Stage Tracker) ───────────────────────────────────────

export function TrackShipmentScreenshot() {
  const stages = ["Spec Sheet", "Sample", "Approved", "Deposit", "Cut & Sew", "QC", "Ex-Factory", "Loading", "In Transit", "Customs", "Delivered"];
  const currentIdx = 7;
  return (
    <Frame h={210}>
      <Bar label="My Orders — PO-2026-0041 Stage Tracker" />
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        {/* Progress bar */}
        <div style={{ position: "relative" }}>
          {/* connector line */}
          <div style={{ position: "absolute", top: 9, left: "4.5%", right: "4.5%", height: 2, background: C.border, zIndex: 0 }} />
          <div style={{ position: "absolute", top: 9, left: "4.5%", width: `${(currentIdx / (stages.length - 1)) * 91}%`, height: 2, background: C.purple, zIndex: 0 }} />
          {/* dots */}
          <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
            {stages.map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: i === currentIdx ? 20 : 14,
                  height: i === currentIdx ? 20 : 14,
                  borderRadius: "50%",
                  background: i < currentIdx ? C.purple : i === currentIdx ? C.purple : C.border,
                  border: i === currentIdx ? `3px solid ${C.white}` : "none",
                  boxShadow: i === currentIdx ? `0 0 0 2px ${C.purple}` : "none",
                  flexShrink: 0,
                }} />
              </div>
            ))}
          </div>
        </div>
        {/* stage labels */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {stages.map((s, i) => (
            <div key={i} style={{ fontSize: 7.5, color: i <= currentIdx ? (i === currentIdx ? C.purple : C.muted) : C.faint, textAlign: "center", width: `${100 / stages.length}%`, fontWeight: i === currentIdx ? 700 : 400, lineHeight: 1.2 }}>
              {s}
            </div>
          ))}
        </div>
        {/* current stage callout */}
        <div style={{ background: C.purpleLight, border: `1px solid ${C.purple}22`, borderRadius: 8, padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: C.purple, fontWeight: 700 }}>CURRENT STAGE</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>Loading</div>
          </div>
          <div style={{ background: C.purple, color: "#fff", fontSize: 9.5, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>Advance Stage →</div>
        </div>
      </div>
    </Frame>
  );
}

// ─── 7. Risk Radar ───────────────────────────────────────────────────────────

export function RiskRadarScreenshot() {
  const rows = [
    { po: "PO-2026-0038", supplier: "Sunrise Fabrics", stage: "Production", score: 87, signal: "Port congestion", scoreColor: C.red, scoreBg: C.redLight },
    { po: "PO-2026-0041", supplier: "Yang Textiles", stage: "In Transit", score: 61, signal: "Delay +3d likely", scoreColor: C.amber, scoreBg: C.amberLight },
    { po: "PO-2026-0044", supplier: "Pearl River Mfg", stage: "Ex-Factory", score: 34, signal: "On track", scoreColor: C.green, scoreBg: C.greenLight },
    { po: "PO-2026-0031", supplier: "Hong Ming Co.", stage: "Loading", score: 22, signal: "On track", scoreColor: C.green, scoreBg: C.greenLight },
  ];
  return (
    <Frame>
      <Bar label="Risk Radar" />
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>Active Shipment Risk — 4 in-flight</div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: C.row, padding: "5px 10px", borderBottom: `1px solid ${C.border}` }}>
            {["PO Number", "Supplier", "Stage", "Risk Score", "Top Signal"].map((h, i) => (
              <div key={i} style={{ flex: 1, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 10px", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 10 }}>{r.po}</div>
              <div style={{ flex: 1, fontSize: 10 }}>{r.supplier}</div>
              <div style={{ flex: 1 }}><Badge label={r.stage} bg={C.row} color={C.muted} /></div>
              <div style={{ flex: 1 }}>
                <span style={{ background: r.scoreBg, color: r.scoreColor, fontWeight: 700, fontSize: 10.5, padding: "2px 7px", borderRadius: 5 }}>{r.score}</span>
              </div>
              <div style={{ flex: 1, fontSize: 9.5, color: r.score > 70 ? r.scoreColor : C.muted }}>{r.signal}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─── 8. Payments ─────────────────────────────────────────────────────────────

export function PaymentsScreenshot() {
  return (
    <Frame h={210}>
      <Bar label="My Orders — PO-2026-0041 Payments" />
      <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>Payments · Yang Textiles</div>
        {/* Deposit chip */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Deposit · 30%</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>$9,450.00</div>
              <div style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>Due Mar 15, 2026</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: C.greenLight, color: C.green, fontSize: 9.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>✓ Paid Mar 12</div>
              <div style={{ fontSize: 8.5, color: C.faint, marginTop: 3 }}>Ref: WIRE-20260312</div>
            </div>
          </div>
        </div>
        {/* Balance chip */}
        <div style={{ background: C.white, border: `1.5px solid ${C.purple}44`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Balance · 70%</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>$22,050.00</div>
              <div style={{ fontSize: 9, color: C.amber, marginTop: 2, fontWeight: 600 }}>Due Jun 1, 2026</div>
            </div>
            <div style={{ background: C.purple, color: "#fff", fontSize: 10, fontWeight: 600, padding: "5px 12px", borderRadius: 7 }}>Mark Paid</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted }}>
          <span>Spread: <strong style={{ color: C.green }}>+$14,820 (28%)</strong></span>
          <span>Buyer Total: $46,320</span>
        </div>
      </div>
    </Frame>
  );
}

// ─── 9. Team Access ──────────────────────────────────────────────────────────

export function TeamAccessScreenshot() {
  const members = [
    { init: "A", name: "Abid Imam", email: "abid@company.com", role: "Admin", roleColor: C.purple, roleBg: C.purpleLight },
    { init: "S", name: "Sarah Chen", email: "sarah@company.com", role: "Member", roleColor: C.muted, roleBg: C.row },
    { init: "J", name: "James Park", email: "james@company.com", role: "Member", roleColor: C.muted, roleBg: C.row },
  ];
  return (
    <Frame>
      <Bar label="Settings — Team" />
      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Team Members</div>
          <Badge label="3 MEMBERS" bg={C.purpleLight} color={C.purple} />
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          {members.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "7px 10px", borderBottom: i < members.length - 1 ? `1px solid ${C.border}` : "none", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: C.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.purple }}>{m.init}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 10.5 }}>{m.name}</div>
                <div style={{ fontSize: 9, color: C.faint }}>{m.email}</div>
              </div>
              <span style={{ background: m.roleBg, color: m.roleColor, fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>{m.role}</span>
            </div>
          ))}
        </div>
        {/* invite row */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 9px", fontSize: 10, color: C.faint }}>colleague@company.com</div>
          <div style={{ background: C.purple, color: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 10, fontWeight: 600 }}>Invite</div>
        </div>
      </div>
    </Frame>
  );
}

// ─── 10. Suppliers ───────────────────────────────────────────────────────────

export function SuppliersScreenshot() {
  const rows = [
    { name: "Yang Textiles Co.", country: "🇨🇳 China", pos: 4, onTime: "94%", contact: "Mei Lin" },
    { name: "Sunrise Fabrics", country: "🇻🇳 Vietnam", pos: 2, onTime: "88%", contact: "Tuan Nguyen" },
    { name: "Pearl River Mfg", country: "🇨🇳 China", pos: 3, onTime: "76%", contact: "David Chen" },
    { name: "Hong Ming Co.", country: "🇧🇩 Bangladesh", pos: 1, onTime: "91%", contact: "Rahim Akter" },
  ];
  return (
    <Frame>
      <Bar label="Suppliers" />
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Supplier Directory</div>
          <div style={{ background: C.purple, color: "#fff", fontSize: 9.5, fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}>+ New Supplier</div>
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", flex: 1 }}>
          <div style={{ display: "flex", background: C.row, padding: "5px 10px", borderBottom: `1px solid ${C.border}` }}>
            {["Supplier", "Country", "Active POs", "On-Time", "Contact"].map((h) => (
              <div key={h} style={{ flex: 1, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 10px", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 10.5 }}>{r.name}</div>
              <div style={{ flex: 1, fontSize: 10 }}>{r.country}</div>
              <div style={{ flex: 1, fontSize: 10 }}>{r.pos}</div>
              <div style={{ flex: 1 }}>
                <span style={{ color: parseFloat(r.onTime) >= 90 ? C.green : C.amber, fontWeight: 700, fontSize: 10.5 }}>{r.onTime}</span>
              </div>
              <div style={{ flex: 1, fontSize: 10, color: C.muted }}>{r.contact}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─── 11. Intermediary Financing ──────────────────────────────────────────────

export function IntermediaryFinancingScreenshot() {
  const rows = [
    { supplier: "Yang Textiles", deposit: "$9,450", advance: "$22,050", recovered: "$9,450", outstanding: "$12,600" },
    { supplier: "Sunrise Fabrics", deposit: "$6,000", advance: "$14,000", recovered: "$14,000", outstanding: "—" },
    { supplier: "Hong Ming Co.", deposit: "$3,750", advance: "$8,750", recovered: "$0", outstanding: "$8,750" },
  ];
  return (
    <Frame>
      <Bar label="Reports — Intermediary Financing" />
      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* summary */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Total Advanced", val: "$44,800", color: C.text },
            { label: "Recovered", val: "$23,450", color: C.green },
            { label: "Outstanding", val: "$21,350", color: C.red },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 8.5, color: C.faint, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* table */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: C.row, padding: "5px 10px", borderBottom: `1px solid ${C.border}` }}>
            {["Supplier", "Deposit", "Intermediary Advance", "Recovered", "Outstanding"].map((h) => (
              <div key={h} style={{ flex: 1, fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "5px 10px", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 10 }}>
              <div style={{ flex: 1, fontWeight: 600 }}>{r.supplier}</div>
              <div style={{ flex: 1 }}>{r.deposit}</div>
              <div style={{ flex: 1, color: C.amber, fontWeight: 600 }}>{r.advance}</div>
              <div style={{ flex: 1, color: C.green }}>{r.recovered}</div>
              <div style={{ flex: 1, color: r.outstanding === "—" ? C.faint : C.red, fontWeight: r.outstanding === "—" ? 400 : 700 }}>{r.outstanding}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ─── Lookup map ──────────────────────────────────────────────────────────────

export const SCREENSHOT_COMPONENTS: Record<string, React.ComponentType> = {
  "create-po": CreatePoScreenshot,
  "rfq-quotes": RfqQuotesScreenshot,
  "spread-margin": SpreadMarginScreenshot,
  "chat-ingest": ChatIngestScreenshot,
  "track-shipment": TrackShipmentScreenshot,
  "inbox": InboxScreenshot,
  "handle-delays": RiskRadarScreenshot,
  "record-payments": PaymentsScreenshot,
  "team-access": TeamAccessScreenshot,
  "manage-suppliers": SuppliersScreenshot,
  "intermediary-financing": IntermediaryFinancingScreenshot,
};
