import { X, Share, Plus } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { useUserPref } from "@/hooks/useUserPref";

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    "standalone" in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function IOSInstallPrompt() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useUserPref<"yes" | "no">("ios-install-prompt-dismissed", "no");

  if (!isIOS() || isInStandaloneMode() || dismissed === "yes") {
    return null;
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
              <p className="text-sm font-bold text-foreground leading-tight">{t("install.addToHomeScreen")}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {t("install.installDesc")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed("yes")}
            className="shrink-0 p-1 rounded-lg active:opacity-60 transition-opacity"
            style={{ color: "hsl(var(--muted-foreground))" }}
            aria-label={t("common.dismiss")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Step
            number={1}
            icon={<Share size={14} />}
            text={<Trans i18nKey="install.iosStep1" components={{ bold: <strong /> }} />}
          />
          <Step
            number={2}
            icon={<Plus size={14} />}
            text={<Trans i18nKey="install.iosStep2" components={{ bold: <strong /> }} />}
          />
          <Step
            number={3}
            icon={
              <span className="text-[11px] font-bold" style={{ color: "hsl(var(--primary))" }}>
                ✓
              </span>
            }
            text={<Trans i18nKey="install.iosStep3" components={{ bold: <strong /> }} />}
          />
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
        style={{ background: "hsl(var(--primary))" }}
      >
        {number}
      </div>
      <div
        className="flex items-center gap-1.5 flex-1 rounded-xl px-3 py-2.5 text-xs text-foreground leading-snug"
        style={{ background: "hsl(var(--accent))" }}
      >
        <span style={{ color: "hsl(var(--primary))" }}>{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
