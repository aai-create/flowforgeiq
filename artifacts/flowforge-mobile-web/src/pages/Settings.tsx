import { useUser, useClerk } from "@clerk/react";
import { AppShell } from "@/components/AppShell";
import { Globe, User, LogOut, Check } from "lucide-react";
import { useLocation } from "wouter";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const currentLang = navigator.language?.startsWith("zh-TW") ? "zh-TW"
    : navigator.language?.startsWith("zh") ? "zh-CN" : "en";

  async function handleSignOut() {
    if (!window.confirm("Sign out of FlowForgeIQ?")) return;
    await signOut();
    navigate("/sign-in");
  }

  return (
    <AppShell>
      <div
        className="status-bar-pad px-5 pb-4 shrink-0"
        style={{ background: "hsl(var(--primary))" }}
      >
        <p className="text-white font-bold text-xl tracking-tight">FlowForgeIQ</p>
        <p className="text-white/70 text-xs mt-0.5 tracking-wide">Settings</p>
      </div>

      <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">
        {/* Language section */}
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <Globe size={14} color="hsl(var(--primary))" />
            <p className="text-sm font-semibold text-foreground">Language</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-1 leading-[1.5]">
            Set your preferred interface language.
          </p>
          <div className="flex flex-col gap-2">
            {LANGUAGES.map(({ code, label }) => {
              const active = currentLang === code;
              return (
                <button
                  key={code}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl border-[1.5px] transition-all"
                  style={{
                    backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--background))",
                    borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))",
                    color: active ? "white" : "hsl(var(--muted-foreground))",
                  }}
                >
                  <span className="text-sm font-medium">{label}</span>
                  {active && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account section */}
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <User size={14} color="hsl(var(--primary))" />
            <p className="text-sm font-semibold text-foreground">Account</p>
          </div>
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "hsl(var(--accent))" }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: "hsl(var(--primary))" }}
              >
                {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                {user.fullName && <p className="text-sm font-medium text-foreground truncate">{user.fullName}</p>}
                {user.primaryEmailAddress?.emailAddress && (
                  <p className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress.emailAddress}</p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-[1.5px] transition-opacity active:opacity-70"
            style={{
              borderColor: "hsl(var(--destructive) / 0.4)",
              backgroundColor: "hsl(var(--destructive) / 0.07)",
              color: "hsl(var(--destructive))",
            }}
          >
            <LogOut size={15} />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>

        {/* App info */}
        <div className="rounded-xl border bg-card p-4" style={{ borderColor: "hsl(var(--border))" }}>
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
          <p className="text-xs text-muted-foreground mt-3 leading-[1.5]">
            Install to your home screen via your browser's "Add to Home Screen" option for the best mobile experience.
          </p>
        </div>

        <div className="h-2" />
      </div>
    </AppShell>
  );
}
