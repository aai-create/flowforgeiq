import React from "react";
import { Inbox, MessageCircle, Package, DollarSign, ArrowRight, Rocket } from "lucide-react";

interface InboxEmptyStateProps {
  onGetStarted: () => void;
  onOpenPasteChat: () => void;
}

export function InboxEmptyState({ onGetStarted, onOpenPasteChat }: InboxEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8 py-12">
      {/* Icon */}
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}
        >
          <Inbox className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
          <Rocket className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      {/* Headline */}
      <div className="max-w-xs">
        <h2 className="text-lg font-bold text-[#212833] mb-2">Your workspace is ready</h2>
        <p className="text-sm text-[#5E687B] leading-relaxed">
          Set up your first supplier and buyer in 2 minutes — we'll seed your inbox with demo messages so you can see FlowForge in action.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-left">
        {[
          { icon: <MessageCircle className="w-3.5 h-3.5 text-blue-500" />, label: "Unified inbox", desc: "All channels in one place" },
          { icon: <Package className="w-3.5 h-3.5 text-violet-500" />, label: "Shipment tracking", desc: "Stage by stage" },
          { icon: <DollarSign className="w-3.5 h-3.5 text-emerald-500" />, label: "Spread tracking", desc: "Margin at a glance" },
        ].map(item => (
          <div key={item.label} className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl p-3">
            <div className="mb-1">{item.icon}</div>
            <p className="text-[11px] font-semibold text-[#212833] leading-tight">{item.label}</p>
            <p className="text-[10px] text-[#9E9FAE] leading-tight mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <button
          onClick={onGetStarted}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}
        >
          <Rocket className="w-4 h-4" />
          Get started
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
        <button
          onClick={onOpenPasteChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#5E687B] border border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors"
        >
          Quick import from chat
        </button>
      </div>
    </div>
  );
}
