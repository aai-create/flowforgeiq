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
      className="safe-bottom shrink-0 border-t bg-card"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="flex">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex-1 flex flex-col items-center gap-1 py-2 transition-opacity active:opacity-60"
              style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
