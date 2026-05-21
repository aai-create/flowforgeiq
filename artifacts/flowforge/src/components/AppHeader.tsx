import React from "react";
import { Bell } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AICopilotBar } from "./AICopilotBar";

interface AppHeaderProps {
  pageLabel: string;
}

export function AppHeader({ pageLabel }: AppHeaderProps) {
  return (
    <header className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 w-[260px]">
        <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
          <img src="/flowforge-logo.png" alt="FlowForge" className="w-full h-full object-contain" />
        </div>
        <span className="font-bold text-sm tracking-tight text-[#9000FF]">flowforge</span>
        <span className="text-[#E5EAF0] mx-1">/</span>
        <span className="text-[#5E687B] font-medium text-xs">{pageLabel}</span>
      </div>
      <div className="flex-1 flex justify-center max-w-lg">
        <AICopilotBar className="w-full" />
      </div>
      <div className="flex items-center gap-2 w-[260px] justify-end">
        <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8] transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
        </button>
        <Separator orientation="vertical" className="h-4" />
        <div className="w-7 h-7 rounded-md border border-[#E5EAF0] bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">
          AX
        </div>
      </div>
    </header>
  );
}
