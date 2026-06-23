import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { NotificationsBell } from "./NotificationsPanel";
import { AIDrawer, AISparklesButton } from "./TodaysFocusDrawer";
import { useListFocusItems } from "@workspace/api-client-react";

interface AppHeaderProps {
  pageLabel: string;
}

export function AppHeader({ pageLabel }: AppHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useListFocusItems();
  const pendingCount = data?.pendingCount ?? 0;

  return (
    <>
      <header className="h-12 border-b border-[#E5EAF0] bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 w-[260px]">
          <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
            <img src="/flowforge-logo.png" alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#9000FF]">FlowForgeIQ</span>
          <span className="text-[#E5EAF0] mx-1">/</span>
          <span className="text-[#5E687B] font-medium text-xs">{pageLabel}</span>
        </div>
        <div className="flex items-center gap-2 justify-end flex-1">
          <AISparklesButton onClick={() => setDrawerOpen(true)} pendingCount={pendingCount} />
          <Separator orientation="vertical" className="h-4" />
          <NotificationsBell />
          <Separator orientation="vertical" className="h-4" />
          <div className="w-7 h-7 rounded-md border border-[#E5EAF0] bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-[10px] font-bold cursor-pointer">
            AX
          </div>
        </div>
      </header>
      <AIDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
