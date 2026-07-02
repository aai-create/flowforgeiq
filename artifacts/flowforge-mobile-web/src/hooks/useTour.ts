import { useCallback, useMemo } from "react";
import { useUser } from "@clerk/react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = (userId: string) => `ff_tour_seen_mobile_${userId}`;

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
        element: "#bottom-nav-home",
        popover: {
          title: "🏠 Home",
          description:
            "Your live shipments dashboard. See every in-progress order, filter by status, and tap any card for full shipment details.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#shipment-list",
        popover: {
          title: "📦 Shipment Cards",
          description:
            "Tap any shipment to see its stage tracker, messages, documents, and tasks. Swipe to action shortcuts.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#bottom-nav-capture",
        popover: {
          title: "⚡ Capture",
          description:
            "Paste a WhatsApp, WeChat, or iMessage export here. AI extracts the supplier, shipment, and key data — then routes it to the right thread with one tap.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#bottom-nav-docs",
        popover: {
          title: "📄 Documents",
          description:
            "All your invoices, packing lists, and shipping docs in one place. New docs forwarded by email appear here automatically.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#bottom-nav-settings",
        popover: {
          title: "⚙️ Settings",
          description:
            "Sign-in, language, and account options. Install the app to your home screen for the fastest experience.",
          side: "top",
          align: "end",
        },
      },
    ];

    const steps = rawSteps.map(resolveStep);

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.65)",
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: "ff-mobile-tour-popover",
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
