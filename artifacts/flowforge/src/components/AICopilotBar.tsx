import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, AlertCircle, Clock } from "lucide-react";
import { useCopilot } from "@/lib/CopilotContext";

interface AICopilotBarProps {
  className?: string;
  leftNode?: React.ReactNode;
}

const ACTION_CHIPS = ["Draft reply", "Flag payment", "Show all tasks"];

export function AICopilotBar({ className, leftNode }: AICopilotBarProps) {
  const { contextHint, inputRef, history, addToHistory } = useCopilot();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [focused, setFocused] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const draftRef = useRef("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current !== e.target
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [inputRef]);


  async function submit() {
    const text = query.trim();
    if (!text || loading) return;
    setHistoryIndex(-1);
    draftRef.current = "";
    addToHistory(text);
    setShowResult(true);
    setLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, contextHint: contextHint !== "Ask FlowForge anything" ? contextHint : undefined }),
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
    setHistoryIndex(-1);
    draftRef.current = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      void submit();
      return;
    }
    if (e.key === "Escape") {
      clear();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) return;
      if (historyIndex === -1) {
        draftRef.current = query;
      }
      setHistoryIndex(nextIndex);
      setQuery(history[nextIndex]);
      if (showResult) setShowResult(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= -1) return;
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setQuery(nextIndex === -1 ? draftRef.current : history[nextIndex]);
      return;
    }
  }

  const showRecentDropdown =
    focused && !showResult && query === "" && history.length > 0;

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
          setHistoryIndex(-1);
          draftRef.current = "";
          if (showResult) setShowResult(false);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={`${contextHint}  ⌘K`}
        className={`w-full h-8 bg-[#F0F4F8] hover:bg-[#E5EAF0] focus:bg-white border border-transparent focus:border-[#9000FF]/30 focus:ring-1 focus:ring-[#9000FF]/10 rounded-full ${hasLeftNode ? "pl-14" : "pl-9"} pr-4 text-xs outline-none transition-all placeholder:text-[#9E9FAE]`}
      />

      {showRecentDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#9000FF]/15 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden"
        >
          <p className="text-[10px] font-semibold text-[#9E9FAE] uppercase tracking-wide px-3 pt-1 pb-1.5">
            Recent
          </p>
          {history.map((item, i) => (
            <button
              key={i}
              onMouseDown={e => {
                e.preventDefault();
                setQuery(item);
                setHistoryIndex(-1);
                draftRef.current = "";
                setFocused(false);
                inputRef.current?.focus();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#212833] hover:bg-[#F0F4F8] transition-colors text-left"
            >
              <Clock size={11} className="text-[#9E9FAE] shrink-0" />
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      )}

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
