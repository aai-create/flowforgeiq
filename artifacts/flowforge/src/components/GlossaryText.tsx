import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GLOSSARY } from "@/lib/helpGlossary";

interface Segment {
  text: string;
  termKey?: string;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORTED_TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let best: { index: number; termKey: string; match: string } | null = null;

    for (const term of SORTED_TERMS) {
      const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
      const m = re.exec(remaining);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, termKey: term, match: m[0] };
      }
    }

    if (!best) {
      segments.push({ text: remaining });
      break;
    }

    if (best.index > 0) {
      segments.push({ text: remaining.slice(0, best.index) });
    }

    segments.push({ text: best.match, termKey: best.termKey });
    remaining = remaining.slice(best.index + best.match.length);
  }

  return segments;
}

function applyHighlight(text: string, lower: string): React.ReactNode {
  if (!lower) return text;
  const idx = text.toLowerCase().indexOf(lower);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + lower.length)}</mark>
      {applyHighlight(text.slice(idx + lower.length), lower)}
    </>
  );
}

interface GlossaryTextProps {
  text: string;
  query?: string;
}

export function GlossaryText({ text, query = "" }: GlossaryTextProps) {
  const lower = query.toLowerCase().trim();
  const segments = tokenize(text);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.termKey) {
          const definition = GLOSSARY[seg.termKey];
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span
                  className="border-b border-dashed border-current/40 cursor-help"
                  style={{ borderBottomColor: "rgba(94,104,123,0.45)" }}
                >
                  {applyHighlight(seg.text, lower)}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[260px] text-[11px] leading-snug whitespace-normal"
              >
                <span className="font-semibold">{seg.text}</span>
                {" — "}
                {definition}
              </TooltipContent>
            </Tooltip>
          );
        }
        return <React.Fragment key={i}>{applyHighlight(seg.text, lower)}</React.Fragment>;
      })}
    </>
  );
}
