import { useLocation } from "wouter";
import { Inbox, Package, RadioTower, BarChart3, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();

  const TABS = [
    { href: "/home", icon: Inbox, label: t("nav.inbox") },
    { href: "/orders", icon: Package, label: t("nav.orders") },
    { href: "/risk", icon: RadioTower, label: t("nav.risk") },
    { href: "/reports", icon: BarChart3, label: t("nav.reports") },
    { href: "/more", icon: MoreHorizontal, label: t("nav.more") },
  ];

  return (
    <nav
      className="safe-bottom shrink-0 bg-card"
      style={{
        borderTop: "1px solid hsl(var(--border))",
        boxShadow: "0 -1px 8px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <button
              key={href}
              id={`bottom-nav-${href.replace("/", "")}`}
              onClick={() => navigate(href)}
               className="flex-1 flex flex-col items-center pt-2.5 pb-2 gap-1 transition-opacity active:opacity-60 min-w-0"
              aria-current={active ? "page" : undefined}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                color={active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              />
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  transition: "color 0.18s ease",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
