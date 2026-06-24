import React, { useMemo } from "react";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { CalendarView } from "./Home";
import { useListStages, useListShipments } from "@workspace/api-client-react";
import { adaptStages, adaptShipments } from "@/lib/adapters";

export function CalendarPage() {
  const { data: apiStages }    = useListStages();
  const { data: apiShipments } = useListShipments();

  const uiShipments = useMemo(() => {
    if (!apiStages || !apiShipments) return [];
    const stages = adaptStages(apiStages);
    return adaptShipments(apiShipments, stages);
  }, [apiStages, apiShipments]);

  return (
    <div className="h-full flex flex-col bg-[#FAFBFC] overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <GlobalHeader breadcrumb="Calendar" />
      <div className="flex-1 flex overflow-hidden">
        <NavSidebar showBrand={false} />
        <div className="flex-1 flex overflow-hidden">
          <CalendarView shipments={uiShipments} />
        </div>
      </div>
    </div>
  );
}
