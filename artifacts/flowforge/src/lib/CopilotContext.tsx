import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";

const MAX_HISTORY = 10;

interface CopilotContextValue {
  contextHint: string;
  setContextHint: (hint: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  history: string[];
  addToHistory: (query: string) => void;
}

const CopilotContext = createContext<CopilotContextValue>({
  contextHint: "Ask FlowForge anything",
  setContextHint: () => {},
  inputRef: { current: null },
  history: [],
  addToHistory: () => {},
});

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [contextHint, setContextHint] = useState("Ask FlowForge anything");
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

  return (
    <CopilotContext.Provider value={{ contextHint, setContextHint, inputRef, history, addToHistory }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  return useContext(CopilotContext);
}

export function useCopilotHint(hint: string) {
  const { setContextHint } = useCopilot();
  useEffect(() => {
    setContextHint(hint);
  }, [hint, setContextHint]);
}
