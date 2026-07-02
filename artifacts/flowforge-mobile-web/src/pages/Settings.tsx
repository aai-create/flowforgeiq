import { useUser, useClerk } from "@clerk/react";
import { AppShell } from "@/components/AppShell";
import { Globe, User, LogOut, Check, Shield, PlayCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useTour } from "@/hooks/useTour";

const LANGUAGES = [
  { code: "en", label: "English", sub: "English" },
  { code: "zh-CN", label: "简体中文", sub: "Simplified Chinese" },
  { code: "zh-TW", label: "繁體中文", sub: "Traditional Chinese" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { replayTour } = useTour();
  const currentLang = navigator.language?.startsWith("zh-TW") ? "zh-TW"
    : navigator.language?.startsWith("zh") ? "zh-CN" : "en";

  async function handleSignOut() {
    if (!window.confirm("Sign out of FlowForgeIQ?")) return;
    await signOut();
    navigate("/sign-in");
  }

  return (
    <AppShell>
      {/* Header */}
      <div
        className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0 page-header-gradient"
      >
        <img
          src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
          alt="FlowForgeIQ"
          style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(0) invert(1)", flexShrink: 0 }}
        />
        <div>
          <p className="text-white font-bold text-[17px] tracking-tight leading-tight">FlowForgeIQ</p>
          <p className="text-white/55 text-[11px] font-medium tracking-[0.6px] uppercase mt-0.5">Settings</p>
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">

        {/* Profile section */}
        {user && (
          <div className="section-panel p-4 flex flex-col gap-3">
            <p className="section-label">Profile</p>
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
                <span className="text-[10px] font-semibold" style={{ color: "#22c55e" }}>Active</span>
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
            <p className="text-sm font-semibold text-foreground">Language</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choose your preferred interface language.
          </p>
          <div className="flex flex-col gap-2">
            {LANGUAGES.map(({ code, label, sub }) => {
              const active = currentLang === code;
              return (
                <button
                  key={code}
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
            <p className="text-sm font-semibold text-foreground">Onboarding</p>
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
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>Take the tour</p>
              <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                Replay the interactive product walkthrough
              </p>
            </div>
          </button>
        </div>

        {/* Account actions */}
        <div className="section-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: "hsl(var(--destructive) / 0.1)" }}
            >
              <User size={13} color="hsl(var(--destructive))" />
            </div>
            <p className="text-sm font-semibold text-foreground">Account</p>
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
            <span className="text-sm font-bold">Sign Out</span>
          </button>
          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            You'll be signed out of this device only.
          </p>
        </div>

        {/* App info */}
        <div className="section-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">FlowForgeIQ</p>
              <p className="text-xs text-muted-foreground mt-0.5">Supply-chain communication hub</p>
            </div>
            <img
              src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
              alt="FlowForgeIQ"
              className="w-10 h-10 rounded-xl object-contain"
            />
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Install to your home screen via your browser's "Add to Home Screen" for the best experience.
            </p>
          </div>
        </div>

        <div className="h-2" />
      </div>
    </AppShell>
  );
}
