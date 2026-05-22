import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, AlertCircle, Clock, User } from "lucide-react";
import { useCopilot } from "@/lib/CopilotContext";

interface AICopilotBarProps {
  className?: string;
  leftNode?: React.ReactNode;
}

type ConversationTurn = { role: "user" | "assistant"; content: string };

const ACTION_CHIPS = ["Draft reply", "Flag payment", "Show all tasks"];

export function AICopilotBar({ className, leftNode }: AICopilotBarProps) {
  const { contextHint, inputRef, history, addToHistory } = useCopilot();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [focused, setFocused] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [pendingMessage, setPendingMessage] = useState("");
  const draftRef = useRef("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, pendingMessage, loading]);

  async function submit() {
    const text = query.trim();
    if (!text || loading) return;
    setHistoryIndex(-1);
    draftRef.current = "";
    addToHistory(text);
    setShowResult(true);
    setLoading(true);
    setError("");
    setPendingMessage(text);
    setQuery("");

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          contextHint: contextHint !== "Ask FlowForge anything" ? contextHint : undefined,
          history: conversationHistory,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { reply: string };
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: data.reply },
      ]);
      setPendingMessage("");
    } catch {
      setError("Couldn't connect to AI. Please try again.");
      setPendingMessage("");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setShowResult(false);
    setQuery("");
    setError("");
    setLoading(false);
    setConversationHistory([]);
    setPendingMessage("");
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
  const hasConversation = conversationHistory.length > 0;

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
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={
          showResult && hasConversation
            ? "Ask a follow-up…"
            : `${contextHint}  ⌘K`
        }
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#9000FF]/20 rounded-xl shadow-xl z-50 flex flex-col max-h-96">
          <button
            onClick={clear}
            className="absolute top-3 right-3 text-[#5E687B] hover:text-[#212833] transition-colors z-10"
          >
            <X size={13} />
          </button>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3 min-h-0"
          >
            {conversationHistory.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="flex items-start gap-2 justify-end">
                  <p className="text-xs text-[#212833] bg-[#F0F4F8] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] leading-relaxed">
                    {turn.content}
                  </p>
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center">
                    <User size={10} className="text-[#9000FF]" />
                  </span>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <Sparkles size={13} className="text-[#9000FF] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#212833] leading-relaxed max-w-[90%]">
                    {turn.content}
                  </p>
                </div>
              )
            )}

            {pendingMessage && (
              <div className="flex items-start gap-2 justify-end">
                <p className="text-xs text-[#212833] bg-[#F0F4F8] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] leading-relaxed">
                  {pendingMessage}
                </p>
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center">
                  <User size={10} className="text-[#9000FF]" />
                </span>
              </div>
            )}

            {loading && (
              <div className="flex items-start gap-2">
                <Sparkles size={13} className="text-[#9000FF] shrink-0 mt-0.5" />
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#9000FF]/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2">
                <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {!loading && !error && hasConversation && (
            <div className="px-4 py-2 border-t border-[#F0F4F8] flex flex-wrap gap-2">
              {ACTION_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => {
                    setQuery(chip);
                    inputRef.current?.focus();
                  }}
                  className="text-[10px] bg-[#9000FF]/[0.08] text-[#9000FF] border border-[#9000FF]/20 px-2.5 py-1 rounded-full hover:bg-[#9000FF]/[0.15] font-semibold transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
