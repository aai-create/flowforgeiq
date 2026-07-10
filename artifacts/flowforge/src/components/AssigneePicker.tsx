import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useGetTeam } from "@workspace/api-client-react";
import { User, ChevronDown, Check } from "lucide-react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface AssigneePickerProps {
  assigneeId: string | null;
  assigneeName?: string | null;
  onChange: (assigneeId: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function AssigneePicker({ assigneeId, assigneeName, onChange, disabled, size = "sm" }: AssigneePickerProps) {
  const { data } = useGetTeam();
  const members = data?.members ?? [];
  const [open, setOpen] = React.useState(false);

  const resolvedName = assigneeName ?? members.find(m => m.clerkUserId === assigneeId)?.name ?? null;

  const pillCls = size === "sm"
    ? "h-6 px-2 text-[10px] gap-1"
    : "h-7 px-2.5 text-xs gap-1.5";

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`inline-flex items-center rounded-full border transition-colors shrink-0 ${pillCls} ${
            resolvedName
              ? "border-[#9000FF]/20 bg-[#9000FF]/8 text-[#9000FF] font-semibold hover:bg-[#9000FF]/12"
              : "border-[#E5EAF0] bg-white text-[#9E9FAE] hover:bg-[#F0F4F8]"
          } ${disabled ? "opacity-60 cursor-default" : "cursor-pointer"}`}
        >
          {resolvedName ? (
            <span className="w-3.5 h-3.5 rounded-full bg-[#9000FF] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
              {initials(resolvedName)}
            </span>
          ) : (
            <User className="w-3 h-3 shrink-0" />
          )}
          <span className="truncate max-w-[100px]">{resolvedName ?? "Unassigned"}</span>
          {!disabled && <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />}
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-56 p-1" align="start">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-[#F0F4F8] text-[#5E687B] transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-[#F0F2F5] flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-[#9E9FAE]" />
            </span>
            <span className="flex-1 text-left">Unassigned</span>
            {!assigneeId && <Check className="w-3 h-3 text-[#9000FF]" />}
          </button>
          <div className="h-px bg-[#E5EAF0] my-1" />
          {members.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-[#9E9FAE]">No team members yet</div>
          ) : (
            members.map(m => (
              <button
                key={m.clerkUserId}
                type="button"
                onClick={() => { onChange(m.clerkUserId); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-[#F0F4F8] text-[#212833] transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-[#9000FF]">{initials(m.name)}</span>
                </span>
                <span className="flex-1 text-left truncate">{m.name}</span>
                {assigneeId === m.clerkUserId && <Check className="w-3 h-3 text-[#9000FF]" />}
              </button>
            ))
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}

export function AssigneeBadge({ assigneeName }: { assigneeName: string | null | undefined }) {
  if (!assigneeName) return null;
  return (
    <span className="inline-flex items-center gap-1 shrink-0 rounded-full border border-[#9000FF]/20 bg-[#9000FF]/8 px-1.5 py-0.5 text-[9px] font-bold text-[#9000FF]">
      <span className="w-3 h-3 rounded-full bg-[#9000FF] text-white flex items-center justify-center text-[7px] font-bold shrink-0">
        {initials(assigneeName)}
      </span>
      <span className="truncate max-w-[80px]">{assigneeName}</span>
    </span>
  );
}
