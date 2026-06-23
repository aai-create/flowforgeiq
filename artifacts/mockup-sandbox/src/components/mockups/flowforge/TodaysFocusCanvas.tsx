/**
 * Today's Focus — Canvas Board
 * Embeds the TodaysFocusSlideout mockup as an iframe with annotation.
 *
 * Access at: /__mockup/preview/flowforge/TodaysFocusCanvas
 */
import React from "react";
import { Zap, Sparkles, ArrowRight } from "lucide-react";

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

interface Callout {
  label: string;
  detail: string;
  color: string;
}

const CALLOUTS: Callout[] = [
  {
    label: "Today's Focus trigger",
    detail: "Zap icon + pending count badge in the top bar — replaces the sidebar section. Click to open/close the drawer.",
    color: "#9000FF",
  },
  {
    label: "Slide-out drawer (340 px)",
    detail: "Overlays content from the right edge — does not push the main layout. Shows human tasks + AI suggestions.",
    color: "#7C3AED",
  },
  {
    label: "AI Suggestions section",
    detail: "Separated by a divider with a Sparkles icon and purple 'AI' pill badge. Items use a dashed border + tinted background for visual distinction.",
    color: "#6D28D9",
  },
  {
    label: "Sidebar — filters only",
    detail: "Today's Focus block removed. Left nav now shows Status + Buyer filters exclusively.",
    color: "#5B21B6",
  },
  {
    label: "No right AI pane",
    detail: "FlowForgeIQ AI chat panel removed. Content fills the full remaining width.",
    color: "#4C1D95",
  },
];

export function TodaysFocusCanvas() {
  const basePath = getBasePath();
  const mockupSrc = `${basePath}/preview/flowforge/TodaysFocusSlideout`;

  return (
    <div
      className="min-h-screen bg-[#F0F2F5] flex flex-col"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E5EAF0] px-6 py-4 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#9000FF] rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-[#212833]">Today's Focus — Slideout Design</h1>
            <p className="text-[12px] text-[#5E687B] mt-0.5">
              Redesigned My Orders (Atelier) layout: Today's Focus moves from the left sidebar into a
              slide-out drawer, absorbing AI-generated suggestions. The standalone FlowForgeIQ AI right pane
              is removed and page content fills the full width.
            </p>
          </div>
          <span className="text-[11px] text-[#9E9FAE] bg-[#F4F6FA] border border-[#E5EAF0] px-2.5 py-1 rounded-full shrink-0 self-start">
            Canvas mockup · No code changes
          </span>
        </div>

        {/* Design decisions pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Left sidebar → Filters only (no Today's Focus)",
            "Right AI pane → removed",
            "Today's Focus → slide-out drawer from top bar",
            "AI Suggestions → dashed-border items inside drawer",
            "Drawer overlay → does not push content",
          ].map(point => (
            <span
              key={point}
              className="text-[10px] font-medium text-[#5E687B] bg-[#F4F6FA] border border-[#E5EAF0] px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9000FF] shrink-0" />
              {point}
            </span>
          ))}
        </div>
      </div>

      {/* ── Canvas area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-5 p-5 min-h-0" style={{ minHeight: "calc(100vh - 140px)" }}>

        {/* Mockup iframe */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#5E687B] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Live interactive preview — drawer opens by default
            </span>
            <a
              href={mockupSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-[#9000FF] hover:underline"
            >
              Open full screen <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-[#E5EAF0] shadow-md bg-white">
            <iframe
              src={mockupSrc}
              className="w-full h-full border-0"
              title="Today's Focus — Slideout Design Mockup"
              sandbox="allow-scripts allow-same-origin"
              style={{ minHeight: 680 }}
            />
          </div>
        </div>

        {/* Annotation sidebar */}
        <div className="w-[280px] shrink-0 flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E9FAE]">Design notes</p>

          {CALLOUTS.map((c, i) => (
            <div
              key={c.label}
              className="bg-white border border-[#E5EAF0] rounded-xl p-3.5 shadow-sm"
              style={{ borderLeft: `3px solid ${c.color}` }}
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: c.color }}
                >
                  {i + 1}
                </span>
                <p className="text-[12px] font-semibold text-[#212833] leading-snug">{c.label}</p>
              </div>
              <p className="text-[11px] text-[#5E687B] leading-relaxed pl-7">{c.detail}</p>
            </div>
          ))}

          {/* AI suggestions note */}
          <div className="bg-[#9000FF]/[0.04] border border-[#9000FF]/20 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9000FF]" />
              <span className="text-[11px] font-bold text-[#9000FF]">AI Suggestions treatment</span>
              <span className="text-[9px] font-bold bg-[#9000FF] text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
            </div>
            <ul className="space-y-1 text-[11px] text-[#5E687B] pl-5 list-disc">
              <li>Dashed border (not solid) to signal AI origin</li>
              <li>Tinted background at 3% purple opacity</li>
              <li>Sparkle icon placeholder instead of checkbox</li>
              <li>Inline "act" link (e.g. "Draft wire reminder →")</li>
              <li>Static sample data in mockup; real AI call wired later</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default TodaysFocusCanvas;
