import React from "react";
import { X, DollarSign, Mail, FileText, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface ChecklistItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  href: string;
}

interface GettingStartedChecklistProps {
  onDismiss: () => void;
}

export function GettingStartedChecklist({ onDismiss }: GettingStartedChecklistProps) {
  const [, navigate] = useLocation();

  const items: ChecklistItem[] = [
    {
      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
      title: "Add a payment milestone",
      description: "Record your deposit and balance terms so you can track what's been paid.",
      action: "Go to Orders",
      href: "/orders",
    },
    {
      icon: <Mail className="w-4 h-4 text-blue-600" />,
      title: "Connect a supplier email",
      description: "Forward supplier emails to your inbound address to keep all messages in one place.",
      action: "Open Settings",
      href: "/settings",
    },
    {
      icon: <FileText className="w-4 h-4 text-violet-600" />,
      title: "Upload a PO document",
      description: "Attach your purchase order or invoice so the whole team has it on hand.",
      action: "Go to Orders",
      href: "/orders",
    },
    {
      icon: <Users className="w-4 h-4 text-amber-600" />,
      title: "Invite a teammate",
      description: "Bring your sourcing team in so everyone works from the same shipment data.",
      action: "Manage Team",
      href: "/settings?tab=team",
    },
  ];

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-[#E3E8EF] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[#F0F2F5]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#212833]">Getting started</p>
            <p className="text-[11px] text-[#6B7280] leading-tight mt-0.5">
              Your first shipment is live — here's what to do next.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#9CA3AF] hover:text-[#4B5563] transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-[#F3F4F6]"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F0F2F5]">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => navigate(item.href)}
            className="group flex flex-col gap-2 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#F3F4F6] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                {item.icon}
              </div>
              <span className="text-[12px] font-semibold text-[#212833] leading-snug">{item.title}</span>
            </div>
            <p className="text-[11px] text-[#6B7280] leading-relaxed line-clamp-2">{item.description}</p>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#4B5563] group-hover:text-[#212833] mt-auto pt-1 transition-colors">
              {item.action}
              <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
