import React from "react";
import { useListShipmentStageEvents } from "@workspace/api-client-react";
import { Clock, ChevronRight, User } from "lucide-react";

interface StageHistoryProps {
  shipmentId: number;
  stageLabels: Record<string, string>;
}

export function StageHistory({ shipmentId, stageLabels }: StageHistoryProps) {
  const { data: events, isLoading } = useListShipmentStageEvents(shipmentId);

  if (isLoading) {
    return (
      <div className="py-3 flex items-center justify-center">
        <span className="w-3 h-3 border-2 border-[#9000FF]/30 border-t-[#9000FF] rounded-full animate-spin" />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-4 text-center text-[#9E9FAE] text-[11px]">
        No stage changes recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const fromLabel = stageLabels[ev.fromStageId] ?? ev.fromStageId;
        const toLabel = stageLabels[ev.toStageId] ?? ev.toStageId;
        const date = new Date(ev.createdAt);
        const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          " · " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return (
          <div key={ev.id} className="bg-white border border-[#E5EAF0] rounded-lg p-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#5E687B] font-medium truncate">{fromLabel}</span>
              <ChevronRight className="w-3 h-3 text-[#C0C8D4] shrink-0" />
              <span className="text-[#9000FF] font-semibold truncate">{toLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-[#9E9FAE]">
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span>{formatted}</span>
              </span>
              {ev.createdBy && (
                <span className="flex items-center gap-1">
                  <User className="w-2.5 h-2.5 shrink-0" />
                  <span className="font-medium text-[#5E687B]">{ev.createdBy}</span>
                </span>
              )}
            </div>
            {ev.note && (
              <p className="text-[10px] text-[#5E687B] italic border-t border-[#F0F4F8] pt-1 mt-0.5 leading-relaxed">
                "{ev.note}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
