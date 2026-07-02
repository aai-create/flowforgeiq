import { useLocation } from "wouter";
import { Home, Zap, FileText, Settings } from "lucide-react";

const TABS = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/capture", icon: Zap, label: "Capture" },
  { href: "/documents", icon: FileText, label: "Docs" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="safe-bottom shrink-0 bg-card"
      style={{
        borderTop: "1px solid hsl(var(--border))",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex-1 flex flex-col items-center pt-2.5 pb-2 gap-1 transition-opacity active:opacity-60"
              aria-current={active ? "page" : undefined}
            >
              <div
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  background: active ? "hsl(var(--primary) / 0.12)" : "transparent",
                  transition: "background 0.18s ease",
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                />
              </div>
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
