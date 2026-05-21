import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { HELP_SECTIONS } from "@/lib/helpContent";
import { Search, BookOpen, ChevronRight, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  return (
    <div
      className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex"
      style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}
    >
      <NavSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#212833]">Help & Documentation</h1>
              <p className="text-[11px] text-[#5E687B]">Step-by-step guides for every core workflow in FlowForge</p>
            </div>
          </div>
        </div>

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
            <div className="px-8 py-6 space-y-12 max-w-3xl">
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

              {visible.map(section => (
                <section key={section.id} id={`help-${section.id}`} className="scroll-mt-4">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1 h-6 bg-[#9000FF] rounded-full shrink-0" />
                    <h2 className="text-lg font-bold text-[#212833]">{highlight(section.title)}</h2>
                  </div>

                  {/* Summary */}
                  <p className="text-[13px] text-[#5E687B] leading-relaxed mb-5">
                    {highlight(section.summary)}
                  </p>

                  {/* Steps */}
                  <div className="space-y-2 mb-6">
                    {section.steps.map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#9000FF]/10 text-[#9000FF] text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-[12px] text-[#212833] leading-relaxed">
                          {highlight(step.text)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Screenshot */}
                  <div className="rounded-xl overflow-hidden border border-[#E5EAF0] bg-[#F7F9FA]">
                    <img
                      src={`/docs/${section.screenshot}`}
                      alt={`Screenshot: ${section.title}`}
                      className="w-full block"
                      onError={e => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        const placeholder = img.nextElementSibling as HTMLElement | null;
                        if (placeholder) placeholder.style.display = "flex";
                      }}
                    />
                    <div
                      className="hidden items-center justify-center h-[180px] text-[#9E9FAE] text-xs gap-2"
                      style={{ display: "none" }}
                    >
                      <BookOpen className="w-4 h-4 opacity-40" />
                      <span>
                        Screenshot not yet generated — run{" "}
                        <code className="bg-[#E5EAF0] px-1 rounded font-mono">
                          pnpm --filter @workspace/scripts run capture-docs
                        </code>{" "}
                        to create it.
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[#E5EAF0]" />
                </section>
              ))}

              <div className="h-8" />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
