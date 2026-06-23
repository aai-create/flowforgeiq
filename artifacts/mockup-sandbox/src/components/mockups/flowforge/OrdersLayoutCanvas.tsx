/**
 * Orders Layout Canvas
 * Renders all three Orders tab layout variants side-by-side in iframes
 * so the team can compare them at a glance before choosing a direction.
 *
 * Access at: /__mockup/preview/flowforge/OrdersLayoutCanvas
 */
import React, { useState } from "react";

interface Variant {
  letter: string;
  name: string;
  tagline: string;
  tradeoff: string;
  path: string;
  color: string;
}

const VARIANTS: Variant[] = [
  {
    letter: "A",
    name: "Right-Rail Focus",
    tagline: "Cards left · Tasks always visible on the right",
    tradeoff: "Keeps Today's Focus permanently in view — trades card width for constant task awareness.",
    path: "flowforge/OrdersLayoutA",
    color: "#7C3AED",
  },
  {
    letter: "B",
    name: "Full-Width Cards + Drawer",
    tagline: "Max card width · Focus collapses to badge in toolbar",
    tradeoff: "Cards have the most breathing room. Today's Focus is one click away via the badge counter.",
    path: "flowforge/OrdersLayoutB",
    color: "#0891B2",
  },
  {
    letter: "C",
    name: "Split Header",
    tagline: "PO pair in card header · Focus panel toggleable",
    tradeoff: "Buyer PO + Supplier PO are the first thing you see on every card. Focus panel is toggled from toolbar.",
    path: "flowforge/OrdersLayoutC",
    color: "#059669",
  },
];

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export function OrdersLayoutCanvas() {
  const [selected, setSelected] = useState<string | null>(null);
  const basePath = getBasePath();

  return (
    <div
      className="min-h-screen bg-[#F0F2F5] flex flex-col overflow-hidden"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div className="bg-white border-b border-[#E5EAF0] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#9000FF] rounded-lg flex items-center justify-center text-white font-bold text-[11px]">f</div>
          <div>
            <h1 className="text-[15px] font-bold text-[#212833]">Orders Tab — Layout Exploration</h1>
            <p className="text-[12px] text-[#5E687B] mt-0.5">
              3 variants addressing density, PO labelling, milestone clarity and AI panel placement. Click any
              label to highlight that variant.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-[#9E9FAE] bg-[#F4F6FA] border border-[#E5EAF0] px-2.5 py-1 rounded-full">
              Design exploration · No code changes
            </span>
          </div>
        </div>

        {/* Problem summary */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Today's Focus → rightmost column",
            "AI Panel → slide-out drawer",
            "Milestone bar → friendly labels, no overlap",
            "Buyer PO → dedicated row",
            "Supplier → explicit label",
            "Secondary metadata → collapsed",
          ].map(issue => (
            <span key={issue}
              className="text-[10px] font-medium text-[#5E687B] bg-[#F4F6FA] border border-[#E5EAF0] px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0" />
              {issue}
            </span>
          ))}
        </div>
      </div>

      {/* Three-column canvas */}
      <div className="flex-1 grid grid-cols-3 gap-0 min-h-0" style={{ height: "calc(100vh - 120px)" }}>
        {VARIANTS.map(v => (
          <div
            key={v.letter}
            className={`flex flex-col border-r border-[#E5EAF0] last:border-r-0 transition-all ${
              selected && selected !== v.letter ? "opacity-60" : ""
            }`}
          >
            {/* Variant label bar */}
            <div
              className="px-4 py-2.5 border-b border-[#E5EAF0] bg-white flex items-center gap-3 shrink-0 cursor-pointer hover:bg-[#FAFBFC] transition-colors"
              style={{ borderTop: `3px solid ${v.color}` }}
              onClick={() => setSelected(selected === v.letter ? null : v.letter)}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[12px] shrink-0"
                style={{ backgroundColor: v.color }}
              >
                {v.letter}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#212833] leading-tight">{v.name}</p>
                <p className="text-[10px] text-[#9E9FAE] mt-0.5 truncate">{v.tagline}</p>
              </div>
              {selected === v.letter && (
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: v.color }}>
                  Selected
                </span>
              )}
            </div>

            {/* Tradeoff summary */}
            <div className="px-4 py-2 bg-[#FAFBFC] border-b border-[#E5EAF0] shrink-0">
              <p className="text-[10px] text-[#5E687B] leading-relaxed">{v.tradeoff}</p>
            </div>

            {/* iframe */}
            <div className="flex-1 relative bg-white overflow-hidden">
              <iframe
                src={`${basePath}/preview/${v.path}`}
                className="absolute inset-0 w-full h-full border-0"
                title={`Variant ${v.letter} — ${v.name}`}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
