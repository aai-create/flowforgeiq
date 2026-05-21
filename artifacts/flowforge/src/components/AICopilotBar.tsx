import React, { useState, useEffect } from "react";
import { Sparkles, X, AlertCircle } from "lucide-react";
import { useCopilot } from "@/lib/CopilotContext";

interface AICopilotBarProps {
  className?: string;
  leftNode?: React.ReactNode;
}

const ACTION_CHIPS = ["Draft reply", "Flag payment", "Show all tasks"];

export function AICopilotBar({ className, leftNode }: AICopilotBarProps) {
  const { contextHint, inputRef } = useCopilot();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inputRef]);

  async function submit() {
    const text = query.trim();
    if (!text || loading) return;
    setShowResult(true);
    setLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { reply: string };
      setResult(data.reply);
    } catch {
      setError("Couldn't connect to AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setShowResult(false);
    setQuery("");
    setResult("");
    setError("");
  }

  const hasLeftNode = !!leftNode;

  return (
    <div className={`relative w-full${className ? ` ${className}` : ""}`}>
      {hasLeftNode ? (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center">
          {leftNode}
        </div>
      ) : (
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9000FF] pointer-events-none z-10" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          if (showResult) setShowResult(false);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") clear();
        }}
        placeholder={`${contextHint}  ⌘K`}
        className={`w-full h-8 bg-[#F0F4F8] hover:bg-[#E5EAF0] focus:bg-white border border-transparent focus:border-[#9000FF]/30 focus:ring-1 focus:ring-[#9000FF]/10 rounded-full ${hasLeftNode ? "pl-14" : "pl-9"} pr-4 text-xs outline-none transition-all placeholder:text-[#9E9FAE]`}
      />
      {showResult && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#9000FF]/20 rounded-xl shadow-xl z-50 p-4">
          <div className="flex items-start gap-2 mb-3">
            {error ? (
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
            ) : (
              <Sparkles size={13} className="text-[#9000FF] shrink-0 mt-0.5" />
            )}
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : error ? (
              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            ) : (
              <p className="text-xs text-[#212833] leading-relaxed">{result}</p>
            )}
          </div>
          {!loading && !error && (
            <div className="flex flex-wrap gap-2">
              {ACTION_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={clear}
                  className="text-[10px] bg-[#9000FF]/[0.08] text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/[0.15] font-semibold transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={clear}
            className="absolute top-3 right-3 text-[#5E687B] hover:text-[#212833] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
