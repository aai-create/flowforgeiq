import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { Globe, User, LogOut, Check, Shield, PlayCircle, Share2, Smartphone, CheckCircle2, Key, Copy, AlertTriangle, RefreshCw, ExternalLink, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTour } from "@/hooks/useTour";
import { useTranslation, Trans } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDeviceTokens,
  useCreateDeviceToken,
  useDeleteDeviceToken,
  getListDeviceTokensQueryKey,
} from "@workspace/api-client-react";
import type { CreateDeviceTokenResponse, DeviceToken as DeviceTokenType } from "@workspace/api-client-react";

function formatLastUsed(lastUsedAt: string | null | undefined): { label: string; color: string } {
  if (!lastUsedAt) {
    return { label: "Never used", color: "#d97706" };
  }
  const used = new Date(lastUsedAt);
  const now = new Date();
  const diffMs = now.getTime() - used.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (diffMs < oneDayMs) {
    const timeStr = used.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return { label: `Today at ${timeStr}`, color: "#059669" };
  }
  const dateStr = used.toLocaleDateString([], { month: "short", day: "numeric" });
  return { label: dateStr, color: "hsl(var(--muted-foreground))" };
}

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

const TOKEN_SESSION_KEY = "ff_ios_token_draft_mobile";
const TOKEN_TTL_MS = 60_000;

type StoredTokenDraft = CreateDeviceTokenResponse & { expiresAt: number };

function saveTokenToSession(t: CreateDeviceTokenResponse) {
  const draft: StoredTokenDraft = { ...t, expiresAt: Date.now() + TOKEN_TTL_MS };
  try { sessionStorage.setItem(TOKEN_SESSION_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
}

function clearTokenFromSession() {
  try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch { /* ignore */ }
}

function loadTokenFromSession(): { token: CreateDeviceTokenResponse; secondsLeft: number } | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_SESSION_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredTokenDraft;
    const secondsLeft = Math.floor((draft.expiresAt - Date.now()) / 1000);
    if (secondsLeft <= 0) { sessionStorage.removeItem(TOKEN_SESSION_KEY); return null; }
    const { expiresAt: _expiresAt, ...tokenResponse } = draft;
    return { token: tokenResponse as CreateDeviceTokenResponse, secondsLeft };
  } catch { return null; }
}

function IOSShortcutsSection() {
  const queryClient = useQueryClient();
  const { data: tokens = [], refetch: refetchTokens } = useListDeviceTokens();
  const createMutation = useCreateDeviceToken();
  const deleteMutation = useDeleteDeviceToken();

  const [newToken, setNewToken] = useState<CreateDeviceTokenResponse | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [tokenCountdown, setTokenCountdown] = useState<number | null>(null);
  const [tokenLabel, setTokenLabel] = useState("iOS Shortcut");

  useEffect(() => {
    const restored = loadTokenFromSession();
    if (restored) {
      setNewToken(restored.token);
      setTokenCountdown(restored.secondsLeft);
    }
  }, []);

  useEffect(() => {
    if (newToken === null) { setTokenCountdown(null); return; }
    const tick = () => {
      const restored = loadTokenFromSession();
      if (!restored) { setNewToken(null); setTokenCountdown(null); return; }
      setTokenCountdown(restored.secondsLeft);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [newToken]);

  const statusBadge = (() => {
    if (tokens.length === 0) return { active: false, label: "No token" };
    return { active: true, label: "Active" };
  })();

  const handleGenerateToken = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await createMutation.mutateAsync({ data: { label: tokenLabel.trim() || "iOS Shortcut" } });
      setNewToken(result);
      saveTokenToSession(result);
      void refetchTokens();
    } catch {
      setGenerateError("Failed to generate token. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDismissToken = () => {
    clearTokenFromSession();
    setNewToken(null);
    setTokenCountdown(null);
    setTokenCopied(false);
  };

  const copyToken = (value: string) => {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      } catch { /* ignore */ }
      document.body.removeChild(ta);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => {
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }).catch(fallback);
    } else {
      fallback();
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Revoke this token? Any iOS Shortcut using it will stop working.")) return;
    setRevoking(id);
    try {
      await deleteMutation.mutateAsync({ id });
      void queryClient.invalidateQueries({ queryKey: getListDeviceTokensQueryKey() });
    } catch {
      alert("Failed to revoke token. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  const isIOS = isIOSDevice();

  const shortcutInstallerUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(
    `${window.location.origin}/api/shortcuts/capture.shortcut`
  )}`;

  return (
    <div
      className="section-panel p-4 flex flex-col gap-3"
      style={{ borderColor: "hsl(274 100% 43% / 0.3)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: "hsl(274 100% 43% / 0.1)" }}
        >
          <Key size={13} color="hsl(274 100% 43%)" />
        </div>
        <p className="text-sm font-semibold text-foreground flex-1">iOS Shortcuts</p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
          style={
            statusBadge.label === "Active"
              ? { backgroundColor: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" }
              : statusBadge.label === "No token"
              ? { backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }
              : { backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }
          }
        >
          ● {statusBadge.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Generate a token and install the FlowForge iOS Shortcut to forward conversations to your inbox from the share sheet.
      </p>

      {/* Token generation */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-foreground">Generate your device token</p>

        {newToken ? (
          <div className="flex flex-col gap-2">
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d" }}
            >
              <AlertTriangle size={13} color="#d97706" className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "#92400e" }}>
                  Copy this token now — it will not be shown again.
                </p>
                {tokenCountdown !== null && (
                  <p className="text-[11px] mt-0.5" style={{ color: "#b45309" }}>
                    Visible for{" "}
                    <span className="font-semibold tabular-nums">
                      {Math.floor(tokenCountdown / 60)}:{String(tokenCountdown % 60).padStart(2, "0")}
                    </span>{" "}
                    more
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-[11px] font-mono break-all leading-relaxed px-2.5 py-2 rounded-xl"
                style={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
              >
                {newToken.token}
              </code>
              <button
                onClick={() => copyToken(newToken.token)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all active:opacity-75 shrink-0"
                style={{
                  border: "1.5px solid hsl(var(--border))",
                  backgroundColor: tokenCopied ? "#d1fae5" : "hsl(var(--background))",
                  color: tokenCopied ? "#065f46" : "hsl(var(--foreground))",
                }}
              >
                {tokenCopied
                  ? <><Check size={13} /><span className="text-xs font-semibold">Copied!</span></>
                  : <><Copy size={13} /><span className="text-xs font-semibold">Copy</span></>}
              </button>
            </div>

            <button
              onClick={handleDismissToken}
              className="flex items-center gap-1.5 text-xs font-medium transition-all active:opacity-75 self-start"
              style={{ color: "#059669" }}
            >
              <Check size={12} />
              Done — I copied it
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="token-label-input"
                className="text-[11px] font-medium text-muted-foreground"
              >
                Device label
              </label>
              <input
                id="token-label-input"
                type="text"
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                maxLength={60}
                placeholder="iOS Shortcut"
                className="w-full text-xs px-3 py-2 rounded-xl outline-none"
                style={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1.5px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
              />
            </div>
            {generateError && (
              <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>{generateError}</p>
            )}
            <button
              onClick={() => void handleGenerateToken()}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all active:opacity-75 btn-press disabled:opacity-60"
              style={{
                backgroundColor: "hsl(274 100% 43%)",
                color: "white",
              }}
            >
              {generating
                ? <><RefreshCw size={14} className="animate-spin" /><span className="text-sm font-semibold">Generating…</span></>
                : <><Key size={14} /><span className="text-sm font-semibold">Generate Token</span></>}
            </button>
          </div>
        )}
      </div>

      {/* Existing tokens list */}
      {tokens.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-foreground">Active tokens</p>
          <div className="flex flex-col gap-2">
            {tokens.map((token: DeviceTokenType) => {
              const lastUsed = formatLastUsed(token.lastUsedAt);
              return (
              <div
                key={token.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {token.label ?? "iOS Shortcut"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {token.createdAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Created {new Date(token.createdAt).toLocaleDateString()}
                      </p>
                    )}
                    <span className="text-[11px] font-medium" style={{ color: lastUsed.color }}>
                      · Last used: {lastUsed.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => void handleRevoke(token.id)}
                  disabled={revoking === token.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:opacity-75 shrink-0 ml-2 disabled:opacity-50"
                  style={{
                    border: "1.5px solid hsl(var(--destructive) / 0.35)",
                    backgroundColor: "hsl(var(--destructive) / 0.06)",
                    color: "hsl(var(--destructive))",
                  }}
                >
                  <Trash2 size={12} />
                  <span className="text-[11px] font-semibold">
                    {revoking === token.id ? "Revoking…" : "Revoke"}
                  </span>
                </button>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Setup guide link */}
      <div
        className="flex flex-col gap-2 pt-1"
        style={{ borderTop: "1px solid hsl(var(--border))" }}
      >
        {isIOS ? (
          <a
            href={shortcutInstallerUrl}
            className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all active:opacity-75 btn-press"
            style={{
              border: "1.5px solid hsl(274 100% 43% / 0.35)",
              backgroundColor: "hsl(274 100% 43% / 0.06)",
              color: "hsl(274 100% 43%)",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} />
            <span className="text-sm font-semibold">Open Shortcut Installer</span>
          </a>
        ) : null}
        <a
          href="/shortcuts"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium transition-all active:opacity-75 self-start"
          style={{ color: "hsl(var(--muted-foreground))", textDecoration: "none" }}
        >
          <ExternalLink size={12} />
          View setup guide →
        </a>
      </div>
    </div>
  );
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

        {/* iOS Shortcuts — only for authenticated users */}
        {user && <IOSShortcutsSection />}

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
