import React from "react";
import { useLocation, Link } from "wouter";
import { Inbox, LayoutGrid, Calendar, ShieldAlert, BarChart3, Building2, BookOpen, Settings2, LogOut, FileQuestion, Users, Globe, GitBranch, ShieldCheck } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useMyRole } from "@/lib/useCurrentUser";

const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL as string | undefined;

interface NavSidebarProps {
  showBrand?: boolean;
  counts?: {
    myOrders?: number | null;
    inbox?: number | null;
    riskRadar?: number | null;
  };
  children?: React.ReactNode;
}

const LANG_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "zh-CN", label: "简体" },
  { code: "zh-TW", label: "繁體" },
] as const;

export function NavSidebar({
  showBrand = true,
  counts = {},
  children,
}: NavSidebarProps) {
  const [location] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { t, i18n: i18nHook } = useTranslation();
  const { isManager } = useMyRole();

  const navItems = [
    { id: "inbox",     icon: Inbox,        to: "/inbox",       count: counts.inbox     ?? null },
    { id: "myOrders",  icon: LayoutGrid,   to: "/orders",      count: counts.myOrders  ?? null },
    { id: "calendar",  icon: Calendar,     to: "/calendar",    count: null              },
    { id: "rfqs",      icon: FileQuestion, to: "/rfqs",        count: null              },
    { id: "riskRadar", icon: ShieldAlert,  to: "/risk-radar",  count: counts.riskRadar ?? null },
    { id: "reports",   icon: BarChart3,    to: "/reports",     count: null              },
    ...(isManager ? [{ id: "pipeline", icon: GitBranch, to: "/pipeline", count: null }] : []),
    { id: "suppliers", icon: Building2,    to: "/suppliers",   count: null              },
    { id: "buyers",    icon: Users,        to: "/buyers",      count: null              },
    { id: "help",      icon: BookOpen,     to: "/help",        count: null              },
    { id: "settings",  icon: Settings2,    to: "/settings",    count: null              },
  ];

  function isActive(id: string, to: string) {
    if (id === "inbox") return location === to || location === "/" || location === "/signal-inbox";
    if (id === "myOrders") return location === to || location === "/command";
    return location === to;
  }

  const itemClassName = (active: boolean) =>
    `w-full flex items-center justify-between px-2 h-8 rounded-md text-sm transition-colors ${
      active
        ? "bg-[#E5EAF0] text-[#212833] font-semibold"
        : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"
    }`;

  const displayName = user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = displayName.charAt(0).toUpperCase() || "?";

  const currentLang = i18nHook.language;

  return (
    <div className="w-[240px] bg-[#F7F9FA] border-r border-[#E5EAF0] flex flex-col shrink-0">
      {showBrand && (
        <div className="px-3 py-3 border-b border-[#E5EAF0] flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
            <img
              src="/flowforge-logo.png"
              alt="FlowForgeIQ"
              width={20}
              height={20}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#9000FF]">FlowForgeIQ</span>
          <span className="text-xs font-medium bg-purple-100 text-purple-600 rounded px-1.5 py-0.5 leading-none">Beta</span>
        </div>
      )}
      <div className={`p-2 flex flex-col gap-0.5 shrink-0 ${!showBrand ? "mt-1" : ""}`}>
        {navItems.map(({ id, icon: Icon, to, count }) => {
          const active = isActive(id, to);

          return (
            <Link
              key={id}
              id={`nav-${id}`}
              href={to}
              aria-current={active ? "page" : undefined}
              className={itemClassName(active)}
            >
              <span className="flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#9000FF]" : id === "riskRadar" ? "text-[#9000FF]" : ""}`} />
                {t(`nav.${id}`)}
              </span>
              {count != null && (
                <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                  active ? "bg-[#9000FF] text-white" : "bg-[#E5EAF0] text-[#5E687B]"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {children && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {children}
        </div>
      )}

      {/* Language switcher */}
      <div className="border-t border-[#E5EAF0] px-2 py-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <Globe className="w-3 h-3 text-[#9E9FAE] shrink-0" />
          <div className="flex gap-0.5 ml-0.5">
            {LANG_OPTIONS.map(({ code, label }) => {
              const active = currentLang === code || (code === "en" && !["zh-CN", "zh-TW"].includes(currentLang));
              return (
                <button
                  key={code}
                  onClick={() => void i18n.changeLanguage(code)}
                  aria-pressed={active}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    active
                      ? "bg-[#9000FF] text-white"
                      : "text-[#9E9FAE] hover:text-[#212833] hover:bg-[#E5EAF0]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User profile footer */}
      {isLoaded && user && (
        <div className="border-t border-[#E5EAF0] p-2 shrink-0">
          {SUPER_ADMIN_EMAIL && user.primaryEmailAddress?.emailAddress?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
            <Link
              href="/superadmin"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#9000FF] hover:bg-[#9000FF]/5 transition-colors mb-0.5"
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span className="text-[11px] font-semibold">Platform Admin</span>
            </Link>
          )}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#9000FF]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#212833] truncate">{displayName}</div>
              <div className="text-[9px] text-[#9E9FAE] truncate">{user.primaryEmailAddress?.emailAddress}</div>
            </div>
            <button
              onClick={() => void signOut()}
              title={t("common.signOut")}
              aria-label={t("common.signOut")}
              className="p-1 text-[#9E9FAE] hover:text-[#212833] hover:bg-[#E5EAF0] rounded transition-colors shrink-0"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
