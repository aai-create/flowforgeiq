import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { useUserPref } from "@/hooks/useUserPref";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function AndroidInstallPrompt() {
  const [dismissed, setDismissed] = useUserPref<"yes" | "no">(
    "android-install-prompt-dismissed",
    "no",
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (dismissed === "yes" || isInStandaloneMode()) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [dismissed]);

  if (!deferredPrompt || dismissed === "yes" || isInStandaloneMode()) {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDismissed("yes");
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed("yes");
    setDeferredPrompt(null);
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="pointer-events-auto mx-3 mb-3 w-full max-w-lg rounded-2xl border shadow-2xl px-4 pt-4 pb-3"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
              alt="FlowForgeIQ"
              className="w-9 h-9 rounded-xl object-contain shrink-0"
            />
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">
                Add to Home Screen
              </p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                Install FlowForgeIQ for the best experience
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-lg active:opacity-60 transition-opacity"
            style={{ color: "hsl(var(--muted-foreground))" }}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <button
          onClick={handleInstall}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white active:opacity-80 transition-opacity"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Download size={15} />
          Install App
        </button>
      </div>
    </div>
  );
}
