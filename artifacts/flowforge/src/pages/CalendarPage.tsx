import React from "react";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { CalendarView } from "./Home";

export function CalendarPage() {
  return (
    <div className="h-full flex flex-col bg-[#FAFBFC] overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <GlobalHeader breadcrumb="Calendar" />
      <div className="flex-1 flex overflow-hidden">
        <NavSidebar showBrand={false} />
        <div className="flex-1 flex overflow-hidden">
          <CalendarView />
        </div>
      </div>
    </div>
  );
}
