export default function Slide16AppendixWorkflow() {
  const channels = [
    {
      cx: 215, cy: 62, r: 40,
      stroke: "rgba(37,211,102,0.55)", fill: "rgba(37,211,102,0.06)",
      label: "WhatsApp", labelFill: "rgba(37,211,102,0.85)",
      labelY: 113,
    },
    {
      cx: 215, cy: 175, r: 40,
      stroke: "rgba(7,193,96,0.55)", fill: "rgba(7,193,96,0.06)",
      label: "WeChat", labelFill: "rgba(7,193,96,0.85)",
      labelY: 226,
    },
    {
      cx: 215, cy: 290, r: 40,
      stroke: "rgba(96,165,250,0.55)", fill: "rgba(96,165,250,0.06)",
      label: "Email", labelFill: "rgba(96,165,250,0.85)",
      labelY: 341,
    },
    {
      cx: 215, cy: 405, r: 40,
      stroke: "rgba(52,120,246,0.55)", fill: "rgba(52,120,246,0.06)",
      label: "iMessage", labelFill: "rgba(52,120,246,0.85)",
      labelY: 456,
    },
    {
      cx: 215, cy: 505, r: 34,
      stroke: "rgba(148,163,184,0.4)", fill: "rgba(148,163,184,0.04)",
      label: "SMS", labelFill: "rgba(148,163,184,0.7)",
      labelY: 550,
    },
  ];

  const outcomes = [
    { label: "Stage Progression",  sub: "Quote → Production → Ex-Factory → Delivery", y: 35,  color: "#7C3AED", iconType: "stage"   },
    { label: "Payment Records",    sub: "Deposit · balance · spread & margin",          y: 135, color: "#6366F1", iconType: "payment" },
    { label: "Risk & Delay Alerts",sub: "AI-flagged before shipment deadlines slip",     y: 235, color: "#8B5CF6", iconType: "risk"    },
    { label: "Task Checklist",     sub: "Action items auto-generated per message",       y: 335, color: "#7C3AED", iconType: "tasks"   },
    { label: "Audit Trail",        sub: "Full history: messages, decisions, documents",  y: 435, color: "#6D28D9", iconType: "audit"   },
  ];

  const threads = [
    { name: "ABC Manufacturing",   po: "PO-2025-0041 · Delay: +3 days", active: true  },
    { name: "Global Textiles Ltd", po: "PO-2025-0038 · Ex-factory ✓",   active: false },
    { name: "Sunrise Apparel",     po: "PO-2025-0033 · Payment pending", active: false },
    { name: "Pacific Garments",    po: "PO-2025-0029 · Production 62%",  active: false },
  ];

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />
      {/* Subtle left-side purple glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 35% 65% at 0% 50%, rgba(124,58,237,0.09) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative z-10 flex flex-col h-full"
        style={{ padding: "2.5vh 4vw 2vh" }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: "1.2vh" }}>
          <div
            style={{
              fontSize: "0.9vw",
              color: "#7C3AED",
              fontFamily: "var(--font-body-family)",
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "0.3vh",
            }}
          >
            Appendix
          </div>
          <h2
            style={{
              fontSize: "2.3vw",
              fontWeight: 700,
              color: "#F1F5F9",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            FlowForgeIQ Platform Workflow
          </h2>
          <p
            style={{
              fontSize: "1vw",
              color: "#475569",
              fontFamily: "var(--font-body-family)",
              marginTop: "0.3vh",
              marginBottom: 0,
            }}
          >
            From a raw supplier chat to a tracked shipment record — end to end
          </p>
        </div>

        {/* ── Diagram ── */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1600 570"
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: "visible" }}
          >
            <defs>
              <marker id="ap" markerWidth="9" markerHeight="9" refX="8" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L9,3.5 z" fill="#7C3AED" fillOpacity="0.9" />
              </marker>
              <marker id="ad" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="rgba(124,58,237,0.5)" />
              </marker>
            </defs>

            {/* ════════════════════════════════════════
                BUYER / PERSON ICON  (x≈70)
            ════════════════════════════════════════ */}
            {/* Head */}
            <circle cx="75" cy="100" r="22" fill="rgba(124,58,237,0.08)" stroke="#A78BFA" strokeWidth="1.8" />
            {/* Shoulders + upper body silhouette */}
            <path
              d="M 44,148 Q 48,130 75,125 Q 102,130 106,148 L 110,205 Q 75,218 40,205 Z"
              fill="rgba(124,58,237,0.08)"
              stroke="#A78BFA"
              strokeWidth="1.8"
            />
            {/* Arms hint */}
            <path d="M 46,158 Q 32,170 28,190" fill="none" stroke="#A78BFA" strokeWidth="1.4" strokeOpacity="0.6" />
            <path d="M 104,158 Q 118,170 122,190" fill="none" stroke="#A78BFA" strokeWidth="1.4" strokeOpacity="0.6" />
            {/* Phone in right hand */}
            <rect x="108" y="185" width="28" height="46" rx="5" fill="rgba(124,58,237,0.05)" stroke="#6D28D9" strokeWidth="1.5" strokeOpacity="0.8" />
            {/* Phone screen */}
            <rect x="112" y="191" width="20" height="32" rx="2" fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.35)" strokeWidth="0.8" />
            {/* Chat bubble on phone screen */}
            <rect x="113" y="196" width="12" height="7" rx="2" fill="none" stroke="rgba(124,58,237,0.6)" strokeWidth="0.8" />
            <rect x="115" y="207" width="14" height="7" rx="2" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="0.8" />
            {/* BUYER label */}
            <text x="75" y="245" textAnchor="middle" fill="#A78BFA" fontSize="13" fontFamily="var(--font-body-family)" fontWeight="700" letterSpacing="0.1em">BUYER</text>
            {/* Small speech bubble from buyer */}
            <rect x="125" y="80" width="36" height="22" rx="8" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.5" />
            <path d="M 128,102 L 126,108 L 134,103" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.5" strokeLinejoin="round" />
            <circle cx="135" cy="91" r="2" fill="#A78BFA" fillOpacity="0.5" />
            <circle cx="143" cy="91" r="2" fill="#A78BFA" fillOpacity="0.5" />
            <circle cx="151" cy="91" r="2" fill="#A78BFA" fillOpacity="0.5" />
            {/* Dashed line from buyer to channel column */}
            <line x1="155" y1="285" x2="172" y2="285" stroke="rgba(124,58,237,0.2)" strokeWidth="1" strokeDasharray="4 3" />

            {/* ════════════════════════════════════════
                CHANNEL ICONS
            ════════════════════════════════════════ */}

            {/* ── WhatsApp ── */}
            <circle cx="215" cy="62" r="40" fill={channels[0].fill} stroke={channels[0].stroke} strokeWidth="1.8" />
            {/* WA: classic phone handset (S-curve) */}
            <path
              d="M 201,51 C 199,43 205,38 211,42 L 215,46 C 218,49 217,53 215,54 L 213,57 C 215,61 219,65 223,67 L 225,64 C 226,62 230,61 233,64 L 237,68 C 241,74 237,80 229,78 C 220,76 203,63 201,51 Z"
              fill="none" stroke="rgba(37,211,102,0.9)" strokeWidth="1.5"
            />
            <text x="215" y="113" textAnchor="middle" fill={channels[0].labelFill} fontSize="12" fontFamily="var(--font-body-family)" fontWeight="600">WhatsApp</text>

            {/* ── WeChat ── */}
            <circle cx="215" cy="175" r="40" fill={channels[1].fill} stroke={channels[1].stroke} strokeWidth="1.8" />
            {/* WeChat: two overlapping speech bubbles */}
            <ellipse cx="210" cy="168" rx="17" ry="11" fill="none" stroke="rgba(7,193,96,0.9)" strokeWidth="1.5" />
            <path d="M 202,177 L 198,183 L 208,179" fill="none" stroke="rgba(7,193,96,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
            <ellipse cx="222" cy="180" rx="13" ry="9" fill="rgba(11,15,26,0.85)" stroke="rgba(7,193,96,0.9)" strokeWidth="1.5" />
            <path d="M 229,188 L 233,193 L 225,190" fill="none" stroke="rgba(7,193,96,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
            <text x="215" y="226" textAnchor="middle" fill={channels[1].labelFill} fontSize="12" fontFamily="var(--font-body-family)" fontWeight="600">WeChat</text>

            {/* ── Email ── */}
            <circle cx="215" cy="290" r="40" fill={channels[2].fill} stroke={channels[2].stroke} strokeWidth="1.8" />
            {/* Envelope */}
            <rect x="194" y="278" width="42" height="27" rx="2" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="1.5" />
            <path d="M 194,278 L 215,295 L 236,278" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="1.5" />
            <text x="215" y="341" textAnchor="middle" fill={channels[2].labelFill} fontSize="12" fontFamily="var(--font-body-family)" fontWeight="600">Email</text>

            {/* ── iMessage ── */}
            <circle cx="215" cy="405" r="40" fill={channels[3].fill} stroke={channels[3].stroke} strokeWidth="1.8" />
            {/* iMessage: rounded bubble + tail + dots */}
            <rect x="194" y="393" width="40" height="24" rx="11" fill="none" stroke="rgba(52,120,246,0.9)" strokeWidth="1.5" />
            <path d="M 199,415 L 196,422 L 206,416" fill="none" stroke="rgba(52,120,246,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="207" cy="405" r="2.5" fill="rgba(52,120,246,0.9)" />
            <circle cx="214" cy="405" r="2.5" fill="rgba(52,120,246,0.9)" />
            <circle cx="221" cy="405" r="2.5" fill="rgba(52,120,246,0.9)" />
            <text x="215" y="456" textAnchor="middle" fill={channels[3].labelFill} fontSize="12" fontFamily="var(--font-body-family)" fontWeight="600">iMessage</text>

            {/* ── SMS ── */}
            <circle cx="215" cy="505" r="34" fill={channels[4].fill} stroke={channels[4].stroke} strokeWidth="1.8" />
            {/* SMS: simple chat bubble */}
            <rect x="196" y="494" width="38" height="23" rx="5" fill="none" stroke="rgba(148,163,184,0.7)" strokeWidth="1.5" />
            <path d="M 205,516 L 202,523 L 211,518" fill="none" stroke="rgba(148,163,184,0.7)" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="203" y1="502" x2="224" y2="502" stroke="rgba(148,163,184,0.7)" strokeWidth="1.2" />
            <line x1="203" y1="508" x2="220" y2="508" stroke="rgba(148,163,184,0.7)" strokeWidth="1.2" />
            <text x="215" y="550" textAnchor="middle" fill={channels[4].labelFill} fontSize="12" fontFamily="var(--font-body-family)" fontWeight="600">SMS</text>

            {/* ════════════════════════════════════════
                CURVED BEZIER PATHS  Channels → AI
                AI hexagon center: (490, 283)
                Left point of hex: (425, 283)
            ════════════════════════════════════════ */}
            <path d="M 255,62  C 340,62  395,200 423,280" fill="none" stroke="rgba(37,211,102,0.4)"   strokeWidth="1.5" markerEnd="url(#ad)" />
            <path d="M 255,175 C 340,175 395,235 423,281" fill="none" stroke="rgba(7,193,96,0.4)"    strokeWidth="1.5" markerEnd="url(#ad)" />
            <path d="M 255,290 L 423,285"                 fill="none" stroke="rgba(96,165,250,0.45)"  strokeWidth="1.5" markerEnd="url(#ad)" />
            <path d="M 255,405 C 340,405 395,340 423,288" fill="none" stroke="rgba(52,120,246,0.4)"   strokeWidth="1.5" markerEnd="url(#ad)" />
            <path d="M 249,505 C 340,505 395,400 423,292" fill="none" stroke="rgba(148,163,184,0.3)"  strokeWidth="1.5" markerEnd="url(#ad)" />

            {/* ════════════════════════════════════════
                AI ENGINE — FLAT-TOP HEXAGON
                Center (490,283), radius 66
                Flat-top points:
                  Right:       (556, 283)
                  Top-right:   (523, 226)
                  Top-left:    (457, 226)
                  Left:        (424, 283)
                  Bot-left:    (457, 340)
                  Bot-right:   (523, 340)
            ════════════════════════════════════════ */}
            {/* Outer hex */}
            <polygon
              points="556,283 523,226 457,226 424,283 457,340 523,340"
              fill="rgba(124,58,237,0.07)"
              stroke="#7C3AED"
              strokeWidth="2"
              strokeOpacity="0.85"
            />
            {/* Glow ring */}
            <polygon
              points="556,283 523,226 457,226 424,283 457,340 523,340"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="12"
              strokeOpacity="0.05"
            />
            {/* Inner circuit lines — from center (490,283) to each edge midpoint */}
            {/* Midpoints of each edge: */}
            {/* Right edge mid: ((556+523)/2, (283+226)/2) = (539.5, 254.5) */}
            {/* Top edge mid:  ((523+457)/2, 226) = (490, 226) */}
            {/* Top-left edge mid: ((457+424)/2, (226+283)/2) = (440.5, 254.5) */}
            {/* Left edge mid: (424, 283) — just the left vertex */}
            {/* Bot-left edge mid: ((424+457)/2, (283+340)/2) = (440.5, 311.5) */}
            {/* Bot edge mid: (490, 340) */}
            {/* Bot-right edge mid: (539.5, 311.5) */}
            <line x1="503" y1="276" x2="539" y2="255" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="490" y1="268" x2="490" y2="226" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="477" y1="276" x2="441" y2="255" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="475" y1="283" x2="424" y2="283" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="477" y1="290" x2="441" y2="311" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="490" y1="298" x2="490" y2="340" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="503" y1="290" x2="539" y2="311" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            {/* Node circles at midpoints */}
            <circle cx="540" cy="255" r="4" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.7" />
            <circle cx="490" cy="226" r="4" fill="#7C3AED" fillOpacity="0.6" />
            <circle cx="441" cy="255" r="4" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.7" />
            <circle cx="440" cy="311" r="4" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.7" />
            <circle cx="490" cy="340" r="4" fill="#7C3AED" fillOpacity="0.6" />
            <circle cx="540" cy="311" r="4" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.7" />
            {/* Center node */}
            <circle cx="490" cy="283" r="15" fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeOpacity="0.9" />
            <circle cx="490" cy="283" r="5" fill="#7C3AED" fillOpacity="0.7" />
            {/* AI ENGINE label */}
            <text x="490" y="370" textAnchor="middle" fill="#A78BFA" fontSize="13" fontFamily="var(--font-body-family)" fontWeight="700" letterSpacing="0.13em">AI ENGINE</text>
            <text x="490" y="386" textAnchor="middle" fill="#6D28D9" fontSize="11" fontFamily="var(--font-body-family)">extract · route · draft · flag</text>

            {/* ════════════════════════════════════════
                ARROW:  AI → FlowForge Hub
            ════════════════════════════════════════ */}
            <line x1="558" y1="283" x2="618" y2="283" stroke="#7C3AED" strokeWidth="2" strokeOpacity="0.9" markerEnd="url(#ap)" />
            {/* "routes" label on arrow */}
            <text x="588" y="273" textAnchor="middle" fill="#475569" fontSize="12" fontFamily="var(--font-body-family)">routes</text>

            {/* ════════════════════════════════════════
                FLOWFORGE HUB WIREFRAME
                Box: (630, 15) → (960, 545)  330×530
            ════════════════════════════════════════ */}
            {/* Outer glow ring */}
            <rect x="630" y="15" width="330" height="530" rx="10" fill="none" stroke="#7C3AED" strokeWidth="14" strokeOpacity="0.04" />
            {/* Main box */}
            <rect x="630" y="15" width="330" height="530" rx="10" fill="rgba(124,58,237,0.06)" stroke="#7C3AED" strokeWidth="2" strokeOpacity="0.85" />
            {/* Top bar */}
            <rect x="630" y="15" width="330" height="44" rx="10" fill="rgba(124,58,237,0.14)" />
            <rect x="630" y="39" width="330" height="20" fill="rgba(124,58,237,0.10)" />
            {/* Logo text */}
            <text x="657" y="45" fill="#A78BFA" fontSize="14" fontFamily="var(--font-body-family)" fontWeight="700" letterSpacing="0.04em">FlowForge</text>
            {/* Three dots top-right */}
            <circle cx="913" cy="37" r="4.5" fill="rgba(124,58,237,0.6)" />
            <circle cx="927" cy="37" r="4.5" fill="rgba(124,58,237,0.3)" />
            <circle cx="941" cy="37" r="4.5" fill="rgba(124,58,237,0.15)" />
            {/* Left nav sidebar */}
            <rect x="630" y="59" width="52" height="486" fill="rgba(124,58,237,0.05)" />
            <line x1="682" y1="59" x2="682" y2="545" stroke="rgba(124,58,237,0.2)" strokeWidth="1" />
            {/* Active indicator */}
            <rect x="630" y="68" width="3" height="36" rx="1.5" fill="#7C3AED" />
            {/* Sidebar nav icons */}
            {/* Inbox icon (envelope) at y=80 */}
            <rect x="645" y="76" width="22" height="15" rx="2" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.75" />
            <path d="M 645,76 L 656,84 L 667,76" fill="none" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.75" />
            {/* Orders icon (grid) at y=130 */}
            <rect x="645" y="126" width="9" height="9" rx="1" fill="none" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <rect x="657" y="126" width="9" height="9" rx="1" fill="none" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <rect x="645" y="137" width="9" height="9" rx="1" fill="none" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <rect x="657" y="137" width="9" height="9" rx="1" fill="none" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            {/* RFQ icon (document) at y=185 */}
            <rect x="647" y="181" width="17" height="21" rx="2" fill="none" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="651" y1="189" x2="660" y2="189" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="651" y1="194" x2="660" y2="194" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="651" y1="199" x2="657" y2="199" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            {/* Tasks icon (checkbox) at y=238 */}
            <rect x="646" y="234" width="13" height="13" rx="2" fill="none" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.5" />
            <path d="M 649,240 L 652,244 L 659,236" fill="none" stroke="#A78BFA" strokeWidth="1.4" strokeOpacity="0.5" />

            {/* Stage-track inside hub */}
            <rect x="691" y="67" width="262" height="28" rx="4" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.2)" strokeWidth="0.8" />
            <circle cx="716" cy="81" r="5" fill="#7C3AED" fillOpacity="0.9" />
            <line x1="721" y1="81" x2="766" y2="81" stroke="#7C3AED" strokeWidth="1.2" strokeOpacity="0.5" />
            <circle cx="771" cy="81" r="5" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.65" />
            <line x1="776" y1="81" x2="832" y2="81" stroke="#7C3AED" strokeWidth="1.2" strokeOpacity="0.3" strokeDasharray="3 3" />
            <circle cx="837" cy="81" r="5" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="842" y1="81" x2="897" y2="81" stroke="#7C3AED" strokeWidth="1.2" strokeOpacity="0.2" strokeDasharray="3 3" />
            <circle cx="902" cy="81" r="5" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.3" />
            <text x="716" y="103" textAnchor="middle" fill="#6D28D9" fontSize="9" fontFamily="var(--font-body-family)">Quote</text>
            <text x="771" y="103" textAnchor="middle" fill="#6D28D9" fontSize="9" fontFamily="var(--font-body-family)">Prod.</text>
            <text x="837" y="103" textAnchor="middle" fill="#6D28D9" fontSize="9" fontFamily="var(--font-body-family)">Ex-Fac</text>
            <text x="902" y="103" textAnchor="middle" fill="#6D28D9" fontSize="9" fontFamily="var(--font-body-family)">Deliv.</text>

            {/* Thread rows */}
            {threads.map(({ name, po, active }, i) => {
              const ry = 112 + i * 104;
              return (
                <g key={name}>
                  {active ? (
                    <rect x="682" y={ry} width="271" height="96" rx="4" fill="rgba(124,58,237,0.12)" />
                  ) : (
                    <line x1="682" y1={ry} x2="953" y2={ry} stroke="rgba(124,58,237,0.1)" strokeWidth="0.8" />
                  )}
                  {/* Avatar */}
                  <circle cx="706" cy={ry + 28} r="13" fill="none" stroke={active ? "#A78BFA" : "rgba(124,58,237,0.35)"} strokeWidth="1.3" />
                  {/* Avatar person hint */}
                  <circle cx="706" cy={ry + 23} r="5" fill="none" stroke={active ? "#A78BFA" : "rgba(124,58,237,0.35)"} strokeWidth="1" />
                  <path
                    d={`M ${706 - 8},${ry + 38} Q ${706},${ry + 31} ${706 + 8},${ry + 38}`}
                    fill="none"
                    stroke={active ? "#A78BFA" : "rgba(124,58,237,0.35)"}
                    strokeWidth="1"
                  />
                  {/* Supplier name */}
                  <text x="727" y={ry + 23} fill={active ? "#F1F5F9" : "#94A3B8"} fontSize="12.5" fontFamily="var(--font-body-family)" fontWeight={active ? "600" : "400"}>{name}</text>
                  {/* PO sub */}
                  <text x="727" y={ry + 39} fill="#475569" fontSize="10.5" fontFamily="var(--font-body-family)">{po}</text>
                  {/* Stage badge */}
                  <circle cx="933" cy={ry + 28} r="5.5" fill="none" stroke={active ? "#7C3AED" : "rgba(124,58,237,0.25)"} strokeWidth="1.5" />
                  {active && <circle cx="933" cy={ry + 28} r="2.5" fill="#7C3AED" fillOpacity="0.8" />}
                </g>
              );
            })}

            {/* FLOWFORGE HUB label below box */}
            <text x="795" y="560" textAnchor="middle" fill="#7C3AED" fontSize="13" fontFamily="var(--font-body-family)" fontWeight="700" letterSpacing="0.13em">FLOWFORGE HUB</text>

            {/* ════════════════════════════════════════
                ARROW: Hub → Outcomes branch
            ════════════════════════════════════════ */}
            <line x1="962" y1="283" x2="1002" y2="283" stroke="#7C3AED" strokeWidth="2" strokeOpacity="0.8" />
            {/* Vertical spine */}
            <line x1="1002" y1="75" x2="1002" y2="475" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5" />
            {/* Branch lines to outcomes */}
            <path d="M 1002,75  L 1042,75"  fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="1.3" markerEnd="url(#ad)" />
            <path d="M 1002,175 L 1042,175" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="1.3" markerEnd="url(#ad)" />
            <path d="M 1002,283 L 1042,283" fill="none" stroke="rgba(124,58,237,0.55)" strokeWidth="1.3" markerEnd="url(#ad)" />
            <path d="M 1002,375 L 1042,375" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="1.3" markerEnd="url(#ad)" />
            <path d="M 1002,475 L 1042,475" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="1.3" markerEnd="url(#ad)" />

            {/* ════════════════════════════════════════
                OUTCOME CARDS  x:1045–1575
            ════════════════════════════════════════ */}
            {outcomes.map(({ label, sub, y, color, iconType }) => {
              const icy = y + 40;
              return (
                <g key={label}>
                  <rect x="1045" y={y} width="530" height="80" rx="6" fill="rgba(124,58,237,0.04)" stroke="rgba(124,58,237,0.22)" strokeWidth="1.2" />
                  {/* Left accent bar */}
                  <rect x="1045" y={y} width="3" height="80" rx="1.5" fill={color} fillOpacity="0.75" />
                  {/* Icon circle */}
                  <circle cx="1082" cy={icy} r="20" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
                  {/* Icons per type */}
                  {iconType === "stage" && (
                    <>
                      <circle cx="1073" cy={icy} r="3.5" fill={color} fillOpacity="0.7" />
                      <line x1="1076" y1={icy} x2="1085" y2={icy} stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
                      <circle cx="1088" cy={icy} r="3.5" fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
                    </>
                  )}
                  {iconType === "payment" && (
                    <>
                      <line x1="1082" y1={icy - 10} x2="1082" y2={icy + 10} stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
                      <path d={`M ${1075},${icy - 5} Q ${1082},${icy - 9} ${1089},${icy - 5} Q ${1089},${icy} ${1082},${icy}`} fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
                      <path d={`M ${1075},${icy} Q ${1082},${icy + 4} ${1089},${icy} Q ${1089},${icy + 7} ${1082},${icy + 7}`} fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
                    </>
                  )}
                  {iconType === "risk" && (
                    <>
                      <path d={`M ${1082},${icy - 10} L ${1092},${icy + 8} L ${1072},${icy + 8} Z`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" strokeLinejoin="round" />
                      <line x1="1082" y1={icy - 5} x2="1082" y2={icy + 2} stroke={color} strokeWidth="1.3" strokeOpacity="0.8" />
                      <circle cx="1082" cy={icy + 5} r="1.5" fill={color} fillOpacity="0.8" />
                    </>
                  )}
                  {iconType === "tasks" && (
                    <>
                      <rect x="1073" y={icy - 9} width="12" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
                      <path d={`M ${1076},${icy - 3} L ${1079},${icy + 1} L ${1086},${icy - 7}`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.8" />
                      <line x1="1073" y1={icy + 8} x2="1091" y2={icy + 8} stroke={color} strokeWidth="1.2" strokeOpacity="0.5" />
                    </>
                  )}
                  {iconType === "audit" && (
                    <>
                      <rect x="1074" y={icy - 11} width="16" height="22" rx="2" fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
                      <line x1="1078" y1={icy - 6} x2="1086" y2={icy - 6} stroke={color} strokeWidth="1.1" strokeOpacity="0.6" />
                      <line x1="1078" y1={icy - 1} x2="1086" y2={icy - 1} stroke={color} strokeWidth="1.1" strokeOpacity="0.6" />
                      <line x1="1078" y1={icy + 4} x2="1083" y2={icy + 4} stroke={color} strokeWidth="1.1" strokeOpacity="0.6" />
                    </>
                  )}
                  {/* Label */}
                  <text x="1112" y={y + 30} fill="#F1F5F9" fontSize="15" fontFamily="var(--font-body-family)" fontWeight="600">{label}</text>
                  {/* Sub */}
                  <text x="1112" y={y + 52} fill="#475569" fontSize="12" fontFamily="var(--font-body-family)">{sub}</text>
                </g>
              );
            })}

          </svg>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.7vh",
            borderTop: "1px solid rgba(124,58,237,0.12)",
          }}
        >
          <span
            style={{
              fontSize: "1vw",
              color: "#334155",
              fontFamily: "var(--font-body-family)",
            }}
          >
            Buyer-initiated at every step — no passive monitoring, no supplier
            behaviour change required.
          </span>
          <span
            style={{
              fontSize: "1vw",
              color: "#334155",
              fontFamily: "var(--font-body-family)",
            }}
          >
            flowforge.com
          </span>
        </div>
      </div>
    </div>
  );
}
