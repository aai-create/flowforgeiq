import React, { createContext, useContext, useRef, useState, useEffect } from "react";

interface CopilotContextValue {
  contextHint: string;
  setContextHint: (hint: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const CopilotContext = createContext<CopilotContextValue>({
  contextHint: "Ask FlowForge anything",
  setContextHint: () => {},
  inputRef: { current: null },
});

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [contextHint, setContextHint] = useState("Ask FlowForge anything");
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <CopilotContext.Provider value={{ contextHint, setContextHint, inputRef }}>
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
