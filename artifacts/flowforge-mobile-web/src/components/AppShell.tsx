import React from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
