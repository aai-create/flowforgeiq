import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";

const MAX_HISTORY = 10;

export type ConversationTurn = { role: "user" | "assistant"; content: string };

interface CopilotContextValue {
  contextHint: string;
  setContextHint: (hint: string) => void;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  history: string[];
  addToHistory: (query: string) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  conversationHistory: ConversationTurn[];
  setConversationHistory: React.Dispatch<React.SetStateAction<ConversationTurn[]>>;
  showResult: boolean;
  setShowResult: (v: boolean) => void;
  pendingMessage: string;
  setPendingMessage: (v: string) => void;
  copilotLoading: boolean;
  setCopilotLoading: (v: boolean) => void;
  copilotError: string;
  setCopilotError: (v: string) => void;
  clearConversation: () => void;
}

const CopilotContext = createContext<CopilotContextValue>({
  contextHint: "Ask FlowForgeIQ anything",
  setContextHint: () => {},
  suggestions: [],
  setSuggestions: () => {},
  inputRef: { current: null },
  history: [],
  addToHistory: () => {},
  isOpen: false,
  setOpen: () => {},
  conversationHistory: [],
  setConversationHistory: () => {},
  showResult: false,
  setShowResult: () => {},
  pendingMessage: "",
  setPendingMessage: () => {},
  copilotLoading: false,
  setCopilotLoading: () => {},
  copilotError: "",
  setCopilotError: () => {},
  clearConversation: () => {},
});

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [contextHint, setContextHint] = useState("Ask FlowForgeIQ anything");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState("");

  const clearConversation = useCallback(() => {
    setShowResult(false);
    setCopilotError("");
    setCopilotLoading(false);
    setConversationHistory([]);
    setPendingMessage("");
  }, []);

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const deduped = prev.filter(q => q !== trimmed);
      return [trimmed, ...deduped].slice(0, MAX_HISTORY);
    });
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      inputRef.current?.blur();
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  return (
    <CopilotContext.Provider value={{
      contextHint, setContextHint,
      suggestions, setSuggestions,
      inputRef,
      history, addToHistory,
      isOpen, setOpen,
      conversationHistory, setConversationHistory,
      showResult, setShowResult,
      pendingMessage, setPendingMessage,
      copilotLoading, setCopilotLoading,
      copilotError, setCopilotError,
      clearConversation,
    }}>
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
