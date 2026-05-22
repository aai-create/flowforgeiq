import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";

const MAX_HISTORY = 10;

interface CopilotContextValue {
  contextHint: string;
  setContextHint: (hint: string) => void;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  history: string[];
  addToHistory: (query: string) => void;
}

const CopilotContext = createContext<CopilotContextValue>({
  contextHint: "Ask FlowForge anything",
  setContextHint: () => {},
  suggestions: [],
  setSuggestions: () => {},
  inputRef: { current: null },
  history: [],
  addToHistory: () => {},
});

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [contextHint, setContextHint] = useState("Ask FlowForge anything");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const deduped = prev.filter(q => q !== trimmed);
      return [trimmed, ...deduped].slice(0, MAX_HISTORY);
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CopilotContext.Provider value={{ contextHint, setContextHint, suggestions, setSuggestions, inputRef, history, addToHistory }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  return useContext(CopilotContext);
}

export function useCopilotHint(hint: string, pageSuggestions?: string[]) {
  const { setContextHint, setSuggestions } = useCopilot();
  useEffect(() => {
    setContextHint(hint);
    setSuggestions(pageSuggestions ?? []);
  }, [hint, setContextHint, setSuggestions]);
}
