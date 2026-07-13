import React, { useMemo } from "react";
import { X, MessageCircle, DollarSign, Users, ArrowRight } from "lucide-react";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import type { UiMessage, UiShipment } from "@/lib/adapters";
import { useLocation } from "wouter";

interface NudgeDefinition {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

interface NextActionNudgeProps {
  messages: UiMessage[];
  shipments: UiShipment[];
  onReplyToMessage: (messageId: string) => void;
}

export function NextActionNudge({ messages, shipments, onReplyToMessage }: NextActionNudgeProps) {
  const { state, dismissNudge } = useOnboardingState();
  const [, navigate] = useLocation();

  const nudge = useMemo((): NudgeDefinition | null => {
    const firstUnread = messages.find(m => m.unread);

    // 1. Unread message waiting for a reply — most urgent
    if (firstUnread && !state.dismissedNudges.includes("reply-first-message")) {
      return {
        key: "reply-first-message",
        icon: <MessageCircle className="w-4 h-4 text-[#9000FF]" />,
        title: "Reply to your first message",
        description: `${firstUnread.sender} is waiting for a response.`,
        actionLabel: "Open thread",
        onAction: () => onReplyToMessage(firstUnread.id),
      };
    }

    // 2. No real recorded payments (paymentId === 0 means adapter placeholder, not a real DB row)
    const hasRealPayment = shipments.some(s => s.payments.some(p => p.paymentId > 0));
    if (!hasRealPayment && shipments.length > 0 && !state.dismissedNudges.includes("add-payment")) {
      return {
        key: "add-payment",
        icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
        title: "Set a payment milestone",
        description: "Record deposit and balance terms so you can track what's owed.",
        actionLabel: "Go to Orders",
        onAction: () => navigate("/orders"),
      };
    }

    // 3. Invite a teammate — always a meaningful action
    if (!state.dismissedNudges.includes("invite-teammate")) {
      return {
        key: "invite-teammate",
        icon: <Users className="w-4 h-4 text-amber-600" />,
        title: "Invite a teammate",
        description: "Bring your sourcing team in so everyone works from the same shipment data.",
        actionLabel: "Manage team",
        onAction: () => navigate("/settings?tab=team"),
      };
    }

    return null;
  }, [messages, shipments, state.dismissedNudges, navigate, onReplyToMessage]);

  if (!nudge) return null;

  return (
    <div className="mx-3 mt-2 mb-0 rounded-xl border border-[#E5EAF0] bg-gradient-to-r from-[#FAFBFC] to-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-white border border-[#E5EAF0] flex items-center justify-center shrink-0 shadow-sm">
          {nudge.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[#212833] leading-tight">{nudge.title}</p>
          <p className="text-[11px] text-[#5E687B] mt-0.5 leading-tight truncate">{nudge.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={nudge.onAction}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#9000FF] hover:text-[#7A00D9] transition-colors"
          >
            {nudge.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => dismissNudge(nudge.key)}
            className="text-[#9E9FAE] hover:text-[#5E687B] transition-colors p-0.5 rounded"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
