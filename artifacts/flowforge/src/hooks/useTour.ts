import { useCallback, useMemo } from "react";
import { useUser } from "@clerk/react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = (userId: string) => `ff_tour_seen_${userId}`;

interface TourStep {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: string;
    align?: string;
  };
}

function resolveStep(step: TourStep): TourStep {
  if (!step.element) return step;
  const el = document.querySelector(step.element);
  if (!el) {
    const { element: _element, ...rest } = step;
    return rest;
  }
  return step;
}

export function useTour() {
  const { user, isLoaded } = useUser();

  const hasSeenTour = useMemo(() => {
    if (!isLoaded || !user?.id) return true;
    return localStorage.getItem(TOUR_KEY(user.id)) === "1";
  }, [isLoaded, user?.id]);

  const startTour = useCallback(() => {
    if (!user?.id) return;
    localStorage.setItem(TOUR_KEY(user.id), "1");

    const rawSteps: TourStep[] = [
      {
        element: "#nav-inbox",
        popover: {
          title: "📥 Inbox",
          description:
            "Your unified inbox for all supplier messages — email, WhatsApp, WeChat, iMessage, and SMS land here. Replies advance shipment stages automatically.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#copilot-input",
        popover: {
          title: "✨ AI Copilot",
          description:
            "Type a question or command and the Copilot will draft replies, summarise conversations, and suggest next actions across your shipments.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#message-list-area",
        popover: {
          title: "💬 Message Threads",
          description:
            "Filter by channel, supplier, or shipment. Click any thread to read the full conversation and reply in one step.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#nav-myOrders",
        popover: {
          title: "📦 Orders Grid",
          description:
            "All your shipments in one view. Each row shows buyer PO vs supplier PO side-by-side with a spread / margin badge and a task checklist.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#nav-rfqs",
        popover: {
          title: "📋 RFQs",
          description:
            "Request quotes from multiple factories, compare landed costs and spread against your target, then convert the winner directly into a PO.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#stage-tracker-pill",
        popover: {
          title: "🔄 Stage Tracker",
          description:
            "Each shipment moves through your custom pipeline stages. The visual tracker shows progress at a glance — click Advance Stage to log a milestone with an optional note.",
          side: "top",
          align: "start",
        },
      },
    ];

    const steps = rawSteps.map(resolveStep);

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.55)",
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: "ff-tour-popover",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      steps: steps as any,
    });

    driverObj.drive();
  }, [user?.id]);

  const replayTour = useCallback(() => {
    if (!user?.id) return;
    localStorage.removeItem(TOUR_KEY(user.id));
    startTour();
  }, [user?.id, startTour]);

  return { startTour, replayTour, hasSeenTour };
}
