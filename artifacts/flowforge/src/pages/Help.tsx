import React, { useState, useEffect, useRef } from "react";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useCopilotHint } from "@/lib/CopilotContext";
import { HELP_SECTIONS } from "@/lib/helpContent";
import { SCREENSHOT_COMPONENTS } from "@/lib/helpScreenshots";
import { GlossaryText } from "@/components/GlossaryText";
import {
  Search, ChevronRight, X, ArrowRight,
  MessageCircle, ClipboardList, Inbox, Wand2, CheckCircle2,
  FileQuestion, Package, BarChart3, FilePlus, TrendingUp,
  ShieldAlert, AlertTriangle, BellRing, DollarSign, Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Overview diagram ────────────────────────────────────────────────────────

function DiagramNode({
  icon: Icon,
  text,
  accent,
}: {
  icon: React.ElementType;
  text: string;
  accent: string;
}) {
  const lines = text.split("\n");
  return (
    <div
      className="flex flex-col items-center justify-center bg-white rounded-xl border shadow-sm px-3 py-2.5 text-center shrink-0"
      style={{ borderColor: accent + "55", width: 118 }}
    >
      <Icon className="w-4 h-4 mb-1.5 shrink-0" style={{ color: accent }} />
      <div className="text-[10.5px] text-[#212833] leading-snug">
        {lines.map((l, i) => (
          <span key={i}>
            {l}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

const DIAGRAM_LANES = [
  {
    label: "COMMUNICATE",
    sublabel: "supplier messages",
    accent: "#059669",
    bg: "#F0FDF4",
    nodes: [
      { icon: MessageCircle, text: "Supplier chats\nor emails" },
      { icon: ClipboardList, text: "Paste or\nauto-forward" },
      { icon: Inbox, text: "Inbox routes\nto shipment" },
      { icon: Wand2, text: "AI drafts\nyour reply" },
      { icon: CheckCircle2, text: "Send & advance\nstage" },
    ],
  },
  {
    label: "SOURCE",
    sublabel: "factory quotes & POs",
    accent: "#0EA5E9",
    bg: "#F0F9FF",
    nodes: [
      { icon: FileQuestion, text: "Create RFQ\nwith target price" },
      { icon: Package, text: "Factories\nsubmit quotes" },
      { icon: BarChart3, text: "Compare spread\nvs target" },
      { icon: FilePlus, text: "Convert winner\nto PO" },
      { icon: TrendingUp, text: "Shipment &\nmargin tracked" },
    ],
  },
  {
    label: "MONITOR",
    sublabel: "risk, payments & reports",
    accent: "#D97706",
    bg: "#FFFBEB",
    nodes: [
      { icon: ShieldAlert, text: "Risk Radar\nscores every PO" },
      { icon: AlertTriangle, text: "Flags delays &\nexposure" },
      { icon: BellRing, text: "Inbox alerted\ninstantly" },
      { icon: DollarSign, text: "Record deposit\n& balance" },
      { icon: BarChart3, text: "Reports &\nmargin review" },
    ],
  },
  {
    label: "TEAM",
    sublabel: "access & attribution",
    accent: "#7C3AED",
    bg: "#FAF5FF",
    nodes: [
      { icon: Users, text: "Invite colleagues\n& supplier staff" },
      { icon: MessageCircle, text: "Shared inbox\n& shipments" },
      { icon: CheckCircle2, text: "Stage changes\nattributed by name" },
      { icon: Wand2, text: "Same AI drafts\nfor everyone" },
      { icon: ShieldAlert, text: "Admin controls\nwho can edit" },
    ],
  },
] as const;

const LEGEND = [
  { color: "#9000FF", label: "Inbox", desc: "unified message hub" },
  { color: "#059669", label: "Chat Ingest", desc: "WhatsApp · WeChat · iMessage" },
  { color: "#0EA5E9", label: "RFQs", desc: "quote & PO management" },
  { color: "#D97706", label: "Risk Radar", desc: "delay & exposure monitoring" },
  { color: "#7C3AED", label: "Team Access", desc: "multi-user via Clerk" },
];

function OverviewDiagram() {
  return (
    <div className="bg-white border border-[#E5EAF0] rounded-2xl p-6 mb-10">
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-6">
        <div className="w-1 h-6 bg-[#9000FF] rounded-full mt-0.5 shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-[#212833]">How FlowForgeIQ works</h2>
          <p className="text-[12px] text-[#5E687B] mt-0.5 leading-relaxed">
            Four core workflows — everything you need to run global sourcing operations from a single hub.
          </p>
        </div>
      </div>

      {/* Swimlanes */}
      <div className="space-y-2.5">
        {DIAGRAM_LANES.map(lane => (
          <div
            key={lane.label}
            className="rounded-xl flex items-center gap-3"
            style={{ background: lane.bg, padding: "10px 14px" }}
          >
            {/* Lane label */}
            <div
              className="w-[86px] shrink-0 pr-3 border-r"
              style={{ borderColor: lane.accent + "35" }}
            >
              <div className="text-[10.5px] font-bold tracking-wide" style={{ color: lane.accent }}>
                {lane.label}
              </div>
              <div className="text-[9.5px] text-[#9E9FAE] leading-tight mt-0.5">{lane.sublabel}</div>
            </div>

            {/* Nodes + arrows (scrollable on narrow viewports) */}
            <div className="flex items-center gap-1 overflow-x-auto flex-1 pb-0.5">
              {lane.nodes.map((node, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <ArrowRight
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: lane.accent, opacity: 0.35 }}
                    />
                  )}
                  <DiagramNode icon={node.icon} text={node.text} accent={lane.accent} />
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-[#E5EAF0] flex flex-wrap gap-x-5 gap-y-2">
        {LEGEND.map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="font-semibold text-[#212833]">{item.label}</span>
            <span className="text-[#9E9FAE]">— {item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Help page ───────────────────────────────────────────────────────────

export function Help() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  const lower = query.toLowerCase().trim();
  const visible = lower
    ? HELP_SECTIONS.filter(
        s =>
          s.title.toLowerCase().includes(lower) ||
          s.summary.toLowerCase().includes(lower) ||
          s.steps.some(st => st.text.toLowerCase().includes(lower)) ||
          s.keywords.some(k => k.includes(lower)),
      )
    : HELP_SECTIONS;

  function scrollTo(id: string) {
    const el = document.getElementById(`help-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const sections = HELP_SECTIONS.map(s => document.getElementById(`help-${s.id}`));
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("help-", "");
            setActiveId(id);
          }
        }
      },
      { root: container, threshold: 0.3 },
    );
    sections.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function highlight(text: string) {
    if (!lower) return text;
    const idx = text.toLowerCase().indexOf(lower);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + lower.length)}</mark>
        {text.slice(idx + lower.length)}
      </>
    );
  }

  useCopilotHint("Find help on any FlowForgeIQ workflow or feature", [
    "How do I advance a shipment to the next stage?",
    "What does the risk score mean?",
    "How do I ingest a WhatsApp chat?",
    "How do I compare factory quotes in an RFQ?",
  ]);

  return (
    <div
      className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex flex-col"
      style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}
    >
      <GlobalHeader breadcrumb="Help" />

      <div className="flex-1 flex overflow-hidden">
        <NavSidebar showBrand={false} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-6 py-2.5">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9FAE]" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search guides and steps…"
                className="w-full h-8 bg-[#F0F4F8] border border-transparent rounded-lg pl-9 pr-8 text-[12px] focus:outline-none focus:border-[#9000FF]/30 focus:bg-white transition-colors placeholder:text-[#9E9FAE]"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9FAE] hover:text-[#5E687B]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {lower && (
              <p className="mt-1.5 text-[11px] text-[#5E687B]">
                {visible.length === 0
                  ? "No guides match your search."
                  : `${visible.length} guide${visible.length === 1 ? "" : "s"} match "${query}"`}
              </p>
            )}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left sticky nav */}
            <div className="w-[220px] shrink-0 border-r border-[#E5EAF0] bg-white flex flex-col py-4 px-3 gap-1">
              <p className="text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-2 px-2">Guides</p>
              {HELP_SECTIONS.map(s => {
                const isVisible = visible.includes(s);
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    disabled={!isVisible}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] flex items-center gap-1.5 transition-colors ${
                      !isVisible
                        ? "text-[#C0C8D4] cursor-default"
                        : activeId === s.id
                          ? "bg-[#9000FF]/8 text-[#9000FF] font-semibold"
                          : "text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8]"
                    }`}
                  >
                    <ChevronRight
                      className={`w-3 h-3 shrink-0 transition-transform ${activeId === s.id && isVisible ? "text-[#9000FF]" : "text-[#C0C8D4]"}`}
                    />
                    <span className="leading-snug">{s.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Main content */}
            <ScrollArea className="flex-1" ref={contentRef}>
              <div className="px-8 py-6 max-w-3xl">

                {/* Overview diagram — always shown when not searching */}
                {!lower && <OverviewDiagram />}

                {visible.length === 0 && (
                  <div className="text-center py-20 text-[#9E9FAE]">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No guides found for "{query}"</p>
                    <button
                      onClick={() => setQuery("")}
                      className="mt-2 text-[#9000FF] text-xs hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}

                <div className="space-y-12">
                  {visible.map(section => (
                    <section key={section.id} id={`help-${section.id}`} className="scroll-mt-4">
                      {/* Section header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-1 h-6 bg-[#9000FF] rounded-full shrink-0" />
                        <h2 className="text-lg font-bold text-[#212833]">{highlight(section.title)}</h2>
                      </div>

                      {/* Summary */}
                      <p className="text-[13px] text-[#5E687B] leading-relaxed mb-5">
                        <GlossaryText text={section.summary} query={query} />
                      </p>

                      {/* Steps */}
                      <div className="space-y-2 mb-6">
                        {section.steps.map((step, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-[#9000FF]/10 text-[#9000FF] text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-[12px] text-[#212833] leading-relaxed">
                              <GlossaryText text={step.text} query={query} />
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Inline UI illustration */}
                      {SCREENSHOT_COMPONENTS[section.id] && (
                        <div className="rounded-xl overflow-hidden border border-[#E5EAF0]">
                          {React.createElement(SCREENSHOT_COMPONENTS[section.id])}
                        </div>
                      )}

                      <div className="mt-6 border-t border-[#E5EAF0]" />
                    </section>
                  ))}
                </div>

                <div className="h-8" />
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
