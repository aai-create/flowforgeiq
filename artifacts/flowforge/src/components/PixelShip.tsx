import React from "react";

const keyframes = `
@keyframes ship-bob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
@keyframes ship-wave-1 {
  0%, 100% { d: path("M0 8 Q10 4 20 8 Q30 12 40 8 Q50 4 60 8 Q70 12 80 8"); }
  50% { d: path("M0 8 Q10 12 20 8 Q30 4 40 8 Q50 12 60 8 Q70 4 80 8"); }
}
@keyframes ship-smoke-rise {
  0%   { transform: translateY(0)   scale(1);   opacity: 0.5; }
  100% { transform: translateY(-18px) scale(1.5); opacity: 0; }
}
`;

export function PixelShip() {
  return (
    <>
      <style>{keyframes}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Bob wrapper */}
        <div style={{ animation: "ship-bob 2.4s ease-in-out infinite" }}>
          <svg
            width="140"
            height="100"
            viewBox="0 0 140 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            {/* ── Smoke puffs ── */}
            <circle
              cx="38" cy="18"
              r="4"
              stroke="#C8D0DC" strokeWidth="1.5"
              style={{ animation: "ship-smoke-rise 2s ease-out infinite" }}
            />
            <circle
              cx="34" cy="13"
              r="3"
              stroke="#C8D0DC" strokeWidth="1.5"
              style={{ animation: "ship-smoke-rise 2s ease-out 0.65s infinite" }}
            />
            <circle
              cx="40" cy="9"
              r="2"
              stroke="#C8D0DC" strokeWidth="1.5"
              style={{ animation: "ship-smoke-rise 2s ease-out 1.3s infinite" }}
            />

            {/* ── Funnel / chimney ── */}
            <rect x="33" y="22" width="8" height="18" rx="1"
              stroke="#2A3344" strokeWidth="1.8" strokeLinejoin="round" />
            {/* funnel top ring */}
            <rect x="31" y="20" width="12" height="5" rx="1"
              stroke="#2A3344" strokeWidth="1.8" strokeLinejoin="round" />
            {/* funnel accent stripe */}
            <line x1="33" y1="30" x2="41" y2="30" stroke="#9000FF" strokeWidth="2" />

            {/* ── Mast ── */}
            <line x1="90" y1="42" x2="90" y2="18" stroke="#2A3344" strokeWidth="1.5" strokeLinecap="round" />
            {/* crossyard */}
            <line x1="82" y1="24" x2="98" y2="24" stroke="#2A3344" strokeWidth="1.2" strokeLinecap="round" />
            {/* small flag */}
            <path d="M90 18 L98 21 L90 24" stroke="#9000FF" strokeWidth="1.2" strokeLinejoin="round" />

            {/* ── Bridge / superstructure ── */}
            <rect x="44" y="38" width="36" height="20" rx="2"
              stroke="#3B4A60" strokeWidth="1.8" strokeLinejoin="round" />
            {/* bridge roof ── */}
            <rect x="48" y="32" width="28" height="9" rx="2"
              stroke="#3B4A60" strokeWidth="1.8" strokeLinejoin="round" />
            {/* bridge windows */}
            <rect x="49" y="41" width="7" height="7" rx="1"
              stroke="#9000FF" strokeWidth="1.4" />
            <rect x="60" y="41" width="7" height="7" rx="1"
              stroke="#9000FF" strokeWidth="1.4" />
            <rect x="71" y="41" width="6" height="7" rx="1"
              stroke="#9000FF" strokeWidth="1.4" />

            {/* ── Hull ── */}
            {/* Main deck line */}
            <line x1="14" y1="58" x2="126" y2="58" stroke="#2A3344" strokeWidth="1.4" />
            {/* Hull body */}
            <path
              d="M14 58 L10 72 Q70 80 130 72 L126 58 Z"
              stroke="#2A3344" strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* waterline accent */}
            <path
              d="M12 70 Q70 78 128 70"
              stroke="#9000FF" strokeWidth="1" opacity="0.5"
            />
            {/* Bow curve highlight */}
            <path
              d="M10 72 Q8 74 10 76"
              stroke="#5E687B" strokeWidth="1.2" strokeLinecap="round"
            />
            {/* Stern curve highlight */}
            <path
              d="M130 72 Q132 74 130 76"
              stroke="#5E687B" strokeWidth="1.2" strokeLinecap="round"
            />

            {/* ── Cargo containers on deck ── */}
            {/* Container 1 */}
            <rect x="14" y="44" width="16" height="15" rx="1.5"
              stroke="#E05A2B" strokeWidth="1.6" strokeLinejoin="round" />
            <line x1="22" y1="44" x2="22" y2="59" stroke="#E05A2B" strokeWidth="0.9" />

            {/* Container 2 */}
            <rect x="96" y="44" width="16" height="15" rx="1.5"
              stroke="#2B8CE0" strokeWidth="1.6" strokeLinejoin="round" />
            <line x1="104" y1="44" x2="104" y2="59" stroke="#2B8CE0" strokeWidth="0.9" />

            {/* Container 3 (behind bridge, peeking) */}
            <rect x="112" y="46" width="12" height="13" rx="1.5"
              stroke="#20A060" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="118" y1="46" x2="118" y2="59" stroke="#20A060" strokeWidth="0.8" />

            {/* ── Anchor ── */}
            <circle cx="20" cy="72" r="2.5" stroke="#5E687B" strokeWidth="1.2" />
            <line x1="20" y1="74.5" x2="20" y2="79" stroke="#5E687B" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="17" y1="77" x2="23" y2="77" stroke="#5E687B" strokeWidth="1.2" strokeLinecap="round" />

            {/* ── Water waves ── */}
            <path
              d="M0 84 Q17.5 79 35 84 Q52.5 89 70 84 Q87.5 79 105 84 Q122.5 89 140 84"
              stroke="#2196D0" strokeWidth="1.8" strokeLinecap="round" fill="none"
            />
            <path
              d="M0 91 Q17.5 86 35 91 Q52.5 96 70 91 Q87.5 86 105 91 Q122.5 96 140 91"
              stroke="#2196D0" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.55"
            />
          </svg>
        </div>
      </div>
    </>
  );
}
