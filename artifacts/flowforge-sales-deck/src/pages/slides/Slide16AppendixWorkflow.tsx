export default function Slide16AppendixWorkflow() {
  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ background: "#0B0F1A", fontFamily: "var(--font-display-family)" }}
    >
      {/* Dot-grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px)",
          backgroundSize: "3.5vw 3.5vw",
        }}
      />
      {/* Subtle purple left glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 70% at 0% 50%, rgba(124,58,237,0.07) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative z-10 flex flex-col h-full"
        style={{ padding: "3vh 5vw 2.5vh" }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: "1.6vh" }}>
          <div
            style={{
              fontSize: "1vw",
              color: "#7C3AED",
              fontFamily: "var(--font-body-family)",
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "0.5vh",
            }}
          >
            Appendix
          </div>
          <h2
            style={{
              fontSize: "2.6vw",
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
              fontSize: "1.15vw",
              color: "#475569",
              fontFamily: "var(--font-body-family)",
              marginTop: "0.45vh",
              marginBottom: 0,
            }}
          >
            End-to-end: how a raw supplier message becomes a tracked shipment
            action
          </p>
        </div>

        {/* ── Diagram ── */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1600 620"
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: "visible" }}
          >
            <defs>
              {/* Arrow marker */}
              <marker
                id="arr"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <path
                  d="M0,0 L0,7 L10,3.5 z"
                  fill="#7C3AED"
                  fillOpacity="0.75"
                />
              </marker>
              {/* Glow filter for hub box */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* ════════════════════════════════════════
                CONNECTING ARROWS  (drawn first, behind boxes)
            ════════════════════════════════════════ */}

            {/* Arrow 0→1  Channels → Ingest */}
            <line
              x1="286"
              y1="310"
              x2="336"
              y2="310"
              stroke="#7C3AED"
              strokeWidth="1.5"
              strokeOpacity="0.65"
              markerEnd="url(#arr)"
            />
            <text
              x="311"
              y="298"
              textAnchor="middle"
              fill="#475569"
              fontSize="14"
              fontFamily="var(--font-body-family)"
            >
              forwards
            </text>

            {/* Arrow 1→2  Ingest → AI Engine */}
            <line
              x1="586"
              y1="310"
              x2="636"
              y2="310"
              stroke="#7C3AED"
              strokeWidth="1.5"
              strokeOpacity="0.65"
              markerEnd="url(#arr)"
            />
            <text
              x="611"
              y="298"
              textAnchor="middle"
              fill="#475569"
              fontSize="14"
              fontFamily="var(--font-body-family)"
            >
              parses
            </text>

            {/* Arrow 2→3  AI Engine → FlowForge Hub */}
            <line
              x1="886"
              y1="310"
              x2="936"
              y2="310"
              stroke="#7C3AED"
              strokeWidth="1.5"
              strokeOpacity="0.65"
              markerEnd="url(#arr)"
            />
            <text
              x="911"
              y="298"
              textAnchor="middle"
              fill="#475569"
              fontSize="14"
              fontFamily="var(--font-body-family)"
            >
              routes
            </text>

            {/* Arrow 3→4  FlowForge Hub → Outcomes */}
            <line
              x1="1186"
              y1="310"
              x2="1236"
              y2="310"
              stroke="#7C3AED"
              strokeWidth="1.5"
              strokeOpacity="0.65"
              markerEnd="url(#arr)"
            />
            <text
              x="1211"
              y="298"
              textAnchor="middle"
              fill="#475569"
              fontSize="14"
              fontFamily="var(--font-body-family)"
            >
              records
            </text>

            {/* ════════════════════════════════════════
                CONNECTION DOTS at box edges
            ════════════════════════════════════════ */}
            <circle cx="286" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="340" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="586" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="640" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="886" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="940" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="1186" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="1240" cy="310" r="4" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />

            {/* ════════════════════════════════════════
                BOX 0 — CHANNELS  x:40–286, y:50–570
            ════════════════════════════════════════ */}
            <rect
              x="40" y="50" width="246" height="520" rx="8"
              fill="none"
              stroke="rgba(124,58,237,0.28)"
              strokeWidth="1.5"
            />
            {/* Header */}
            <text
              x="163" y="87"
              textAnchor="middle"
              fill="#A78BFA"
              fontSize="13"
              fontFamily="var(--font-body-family)"
              fontWeight="700"
              letterSpacing="0.13em"
            >
              CHANNELS
            </text>
            <line x1="40" y1="100" x2="286" y2="100" stroke="rgba(124,58,237,0.18)" strokeWidth="1" />
            {/* Items */}
            {(
              [
                ["📧", "Email", 148],
                ["💬", "WhatsApp", 223],
                ["💬", "WeChat", 298],
                ["📱", "iMessage / SMS", 373],
                ["📄", "Documents & PDFs", 448],
              ] as [string, string, number][]
            ).map(([, label, y]) => (
              <g key={label}>
                <circle
                  cx="65"
                  cy={y - 6}
                  r="4"
                  fill="none"
                  stroke="rgba(124,58,237,0.55)"
                  strokeWidth="1.5"
                />
                <text
                  x="82"
                  y={y}
                  fill="#CBD5E1"
                  fontSize="17"
                  fontFamily="var(--font-body-family)"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* ════════════════════════════════════════
                BOX 1 — INGEST  x:340–586
            ════════════════════════════════════════ */}
            <rect
              x="340" y="50" width="246" height="520" rx="8"
              fill="none"
              stroke="rgba(124,58,237,0.28)"
              strokeWidth="1.5"
            />
            <text
              x="463" y="87"
              textAnchor="middle"
              fill="#A78BFA"
              fontSize="13"
              fontFamily="var(--font-body-family)"
              fontWeight="700"
              letterSpacing="0.13em"
            >
              INGEST
            </text>
            <line x1="340" y1="100" x2="586" y2="100" stroke="rgba(124,58,237,0.18)" strokeWidth="1" />
            {(
              [
                ["Email forward", 162],
                ["Chat export paste", 256],
                ["Mobile companion", 350],
                ["File / PDF upload", 444],
              ] as [string, number][]
            ).map(([label, y]) => (
              <g key={label}>
                <circle
                  cx="365"
                  cy={y - 6}
                  r="4"
                  fill="none"
                  stroke="rgba(124,58,237,0.55)"
                  strokeWidth="1.5"
                />
                <text
                  x="382"
                  y={y}
                  fill="#CBD5E1"
                  fontSize="17"
                  fontFamily="var(--font-body-family)"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* ════════════════════════════════════════
                BOX 2 — AI ENGINE  x:640–886
            ════════════════════════════════════════ */}
            <rect
              x="640" y="50" width="246" height="520" rx="8"
              fill="none"
              stroke="rgba(124,58,237,0.28)"
              strokeWidth="1.5"
            />
            <text
              x="763" y="87"
              textAnchor="middle"
              fill="#A78BFA"
              fontSize="13"
              fontFamily="var(--font-body-family)"
              fontWeight="700"
              letterSpacing="0.13em"
            >
              AI ENGINE
            </text>
            <line x1="640" y1="100" x2="886" y2="100" stroke="rgba(124,58,237,0.18)" strokeWidth="1" />
            {(
              [
                ["Extract entities", 162],
                ["Route to PO / shipment", 256],
                ["Draft supplier reply", 350],
                ["Flag risk signals", 444],
              ] as [string, number][]
            ).map(([label, y]) => (
              <g key={label}>
                <circle
                  cx="665"
                  cy={y - 6}
                  r="4"
                  fill="none"
                  stroke="rgba(124,58,237,0.55)"
                  strokeWidth="1.5"
                />
                <text
                  x="682"
                  y={y}
                  fill="#CBD5E1"
                  fontSize="17"
                  fontFamily="var(--font-body-family)"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* ════════════════════════════════════════
                BOX 3 — FLOWFORGE HUB  x:940–1186  (highlighted)
            ════════════════════════════════════════ */}
            {/* Outer glow */}
            <rect
              x="940" y="50" width="246" height="520" rx="8"
              fill="rgba(124,58,237,0.07)"
              stroke="#7C3AED"
              strokeWidth="2"
              strokeOpacity="0.7"
            />
            {/* Inner glow ring */}
            <rect
              x="940" y="50" width="246" height="520" rx="8"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="10"
              strokeOpacity="0.06"
            />
            <text
              x="1063" y="87"
              textAnchor="middle"
              fill="#7C3AED"
              fontSize="13"
              fontFamily="var(--font-body-family)"
              fontWeight="700"
              letterSpacing="0.13em"
            >
              FLOWFORGE HUB
            </text>
            <line x1="940" y1="100" x2="1186" y2="100" stroke="rgba(124,58,237,0.35)" strokeWidth="1" />
            {/* Shipment stage mini-track */}
            <text
              x="963" y="128"
              fill="#6D28D9"
              fontSize="11"
              fontFamily="var(--font-body-family)"
              letterSpacing="0.06em"
            >
              QUOTE → PRODUCTION → EX-FACTORY → DELIVERY
            </text>
            {(
              [
                ["Unified Inbox", 165],
                ["Orders Grid", 255],
                ["RFQ Manager", 345],
                ["Task Tracker", 435],
              ] as [string, number][]
            ).map(([label, y]) => (
              <g key={label}>
                <circle
                  cx="965"
                  cy={y - 6}
                  r="4"
                  fill="#7C3AED"
                  fillOpacity="0.65"
                />
                <text
                  x="982"
                  y={y}
                  fill="#F1F5F9"
                  fontSize="17"
                  fontFamily="var(--font-body-family)"
                  fontWeight="500"
                >
                  {label}
                </text>
              </g>
            ))}

            {/* ════════════════════════════════════════
                BOX 4 — OUTCOMES  x:1240–1560
            ════════════════════════════════════════ */}
            <rect
              x="1240" y="50" width="320" height="520" rx="8"
              fill="none"
              stroke="rgba(124,58,237,0.28)"
              strokeWidth="1.5"
            />
            <text
              x="1400" y="87"
              textAnchor="middle"
              fill="#A78BFA"
              fontSize="13"
              fontFamily="var(--font-body-family)"
              fontWeight="700"
              letterSpacing="0.13em"
            >
              OUTCOMES
            </text>
            <line x1="1240" y1="100" x2="1560" y2="100" stroke="rgba(124,58,237,0.18)" strokeWidth="1" />
            {(
              [
                ["Stage progression", 148],
                ["Payment records", 223],
                ["Spread & margin tracking", 298],
                ["Task checklist", 373],
                ["Audit trail", 448],
              ] as [string, number][]
            ).map(([label, y]) => (
              <g key={label}>
                <circle
                  cx="1265"
                  cy={y - 6}
                  r="4"
                  fill="none"
                  stroke="rgba(124,58,237,0.55)"
                  strokeWidth="1.5"
                />
                <text
                  x="1282"
                  y={y}
                  fill="#CBD5E1"
                  fontSize="17"
                  fontFamily="var(--font-body-family)"
                >
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.8vh",
            borderTop: "1px solid rgba(124,58,237,0.12)",
          }}
        >
          <span
            style={{
              fontSize: "1.05vw",
              color: "#334155",
              fontFamily: "var(--font-body-family)",
            }}
          >
            Buyer-initiated at every step — no passive monitoring, no supplier
            behaviour change required.
          </span>
          <span
            style={{
              fontSize: "1.05vw",
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
