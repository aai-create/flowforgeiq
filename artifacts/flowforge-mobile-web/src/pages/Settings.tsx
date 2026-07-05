import { useUser, useClerk } from "@clerk/react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { Globe, User, LogOut, Check, Shield, PlayCircle, Share2, Smartphone, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTour } from "@/hooks/useTour";
import { useTranslation, Trans } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English", sub: "English" },
  { code: "zh-CN", label: "简体中文", sub: "Simplified Chinese" },
  { code: "zh-TW", label: "繁體中文", sub: "Traditional Chinese" },
];

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIOSDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroidDevice(): boolean {
  return /android/i.test(navigator.userAgent);
}

function InstallForSharingSection() {
  const { t } = useTranslation();
  const installed = isInStandaloneMode();

  if (installed) {
    return (
      <div
        className="section-panel p-4 flex flex-col gap-3"
        style={{ borderColor: "hsl(142 70% 45% / 0.35)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: "hsl(142 70% 45% / 0.12)" }}
          >
            <CheckCircle2 size={13} color="hsl(142 70% 45%)" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("settings.installInstalledTitle")}</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("settings.installInstalledDesc")}
        </p>
      </div>
    );
  }

  const isIOS = isIOSDevice();
  const isAndroid = isAndroidDevice();

  return (
    <div
      className="section-panel p-4 flex flex-col gap-3"
      style={{ borderColor: "hsl(var(--primary) / 0.3)" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
        >
          <Share2 size={13} color="hsl(var(--primary))" />
        </div>
        <p className="text-sm font-semibold text-foreground">{t("settings.installSection")}</p>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("settings.installSectionDesc")}
      </p>

      <div
        className="rounded-xl p-3 flex flex-col gap-2.5"
        style={{ backgroundColor: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.15)" }}
      >
        <div className="flex items-center gap-2">
          <Smartphone size={13} color="hsl(var(--primary))" />
          <p className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>
            {isIOS
              ? t("settings.installIosTitle")
              : isAndroid
              ? t("settings.installAndroidTitle")
              : t("settings.installOtherTitle")}
          </p>
        </div>

        {isIOS ? (
          <div className="flex flex-col gap-1.5">
            <InstallStep number={1} text={<Trans i18nKey="install.iosStep1" components={{ bold: <strong /> }} />} />
            <InstallStep number={2} text={<Trans i18nKey="install.iosStep2" components={{ bold: <strong /> }} />} />
            <InstallStep number={3} text={<Trans i18nKey="install.iosStep3" components={{ bold: <strong /> }} />} />
          </div>
        ) : isAndroid ? (
          <div className="flex flex-col gap-1.5">
            <InstallStep number={1} text={<><strong>Chrome</strong>: tap the <strong>⋮ menu → Add to Home Screen</strong></>} />
            <InstallStep number={2} text={<>Or tap the <strong>install prompt</strong> shown at the bottom of the screen</>} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("settings.installOtherDesc")}
          </p>
        )}
      </div>
    </div>
  );
}

function InstallStep({ number, text }: { number: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white mt-0.5"
        style={{ background: "hsl(var(--primary))" }}
      >
        {number}
      </div>
      <p className="text-xs text-foreground leading-snug flex-1">{text}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { replayTour } = useTour();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith("zh-TW") ? "zh-TW"
    : i18n.language?.startsWith("zh") ? "zh-CN" : "en";

  async function handleSignOut() {
    if (!window.confirm(t("settings.signOutConfirm"))) return;
    await signOut();
    navigate("/sign-in");
  }

  function handleLanguageChange(code: string) {
    i18n.changeLanguage(code);
  }

  return (
    <AppShell>
      {/* Header */}
      <GradientHeader subtitle={t("settings.title")} />

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">

        {/* Profile section */}
        {user && (
          <div className="section-panel p-4 flex flex-col gap-3">
            <p className="section-label">{t("settings.profileSection")}</p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
                }}
              >
                {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                {user.fullName && (
                  <p className="text-sm font-semibold text-foreground truncate">{user.fullName}</p>
                )}
                {user.primaryEmailAddress?.emailAddress && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user.primaryEmailAddress.emailAddress}
                  </p>
                )}
              </div>
              <div
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0"
                style={{ backgroundColor: "#22c55e18" }}
              >
                <Shield size={10} color="#22c55e" />
                <span className="text-[10px] font-semibold" style={{ color: "#22c55e" }}>{t("settings.activeStatus")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Language */}
        <div className="section-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
            >
              <Globe size={13} color="hsl(var(--primary))" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t("settings.languageSection")}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("settings.languageDesc")}
          </p>
          <div className="flex flex-col gap-2">
            {LANGUAGES.map(({ code, label, sub }) => {
              const active = currentLang === code;
              return (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl transition-all active:opacity-75"
                  style={{
                    backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--background))",
                    border: `1.5px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    color: active ? "white" : "hsl(var(--foreground))",
                  }}
                >
                  <div className="text-left">
                    <span className="text-sm font-semibold">{label}</span>
                    {!active && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{sub}</p>}
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                      <Check size={12} color="white" strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Onboarding tour */}
        <div className="section-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
            >
              <PlayCircle size={13} color="hsl(var(--primary))" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t("settings.onboardingSection")}</p>
          </div>
          <button
            onClick={replayTour}
            className="flex items-center gap-3 w-full px-3.5 py-3.5 rounded-xl transition-all active:opacity-75 btn-press text-left"
            style={{
              border: "1.5px solid hsl(var(--primary) / 0.3)",
              backgroundColor: "hsl(var(--primary) / 0.06)",
            }}
          >
            <PlayCircle size={18} color="hsl(var(--primary))" strokeWidth={2} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>{t("settings.takeTour")}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("settings.tourDesc")}
              </p>
            </div>
          </button>
        </div>

        {/* Install to share */}
        <InstallForSharingSection />

        {/* Account actions */}
        <div className="section-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: "hsl(var(--destructive) / 0.1)" }}
            >
              <User size={13} color="hsl(var(--destructive))" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t("settings.accountSection")}</p>
          </div>
          <div
            className="rounded-xl h-px"
            style={{ backgroundColor: "hsl(var(--border))" }}
          />
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl transition-all active:opacity-75 btn-press"
            style={{
              border: "1.5px solid hsl(var(--destructive) / 0.35)",
              backgroundColor: "hsl(var(--destructive) / 0.06)",
              color: "hsl(var(--destructive))",
            }}
          >
            <LogOut size={15} strokeWidth={2} />
            <span className="text-sm font-bold">{t("settings.signOut")}</span>
          </button>
          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            {t("settings.signOutNote")}
          </p>
        </div>

        {/* App info */}
        <div className="section-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">FlowForgeIQ</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.appTagline")}</p>
            </div>
            <img
              src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
              alt="FlowForgeIQ"
              className="w-10 h-10 rounded-xl object-contain"
            />
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.addHomeScreen")}
            </p>
          </div>
        </div>

        <div className="h-2" />
      </div>
    </AppShell>
  );
}
