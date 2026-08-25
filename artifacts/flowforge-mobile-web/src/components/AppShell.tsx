import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { BottomNav } from "./BottomNav";
import { useLocation } from "wouter";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeftClose,
  RadioTower,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface AppShellProps {
  children: React.ReactNode;
}

type NavSection = {
  label: string;
  items: { href: string; labelKey: string; icon: React.ElementType }[];
};

const sections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/home", labelKey: "nav.inbox", icon: LayoutDashboard },
      { href: "/orders", labelKey: "nav.orders", icon: Package },
      { href: "/risk", labelKey: "nav.risk", icon: RadioTower },
      { href: "/rfqs", labelKey: "nav.rfqs", icon: FileText },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/reports", labelKey: "nav.reports", icon: BarChart3 },
      { href: "/pipeline", labelKey: "nav.pipeline", icon: Sparkles },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/suppliers", labelKey: "nav.suppliers", icon: ShoppingBag },
      { href: "/buyers", labelKey: "nav.buyers", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/tasks", labelKey: "nav.tasks", icon: ClipboardList },
    ],
  },
];

type ShellContextValue = { openDrawer: () => void };
const ShellContext = createContext<ShellContextValue>({ openDrawer: () => undefined });

export function useAppShell() {
  return useContext(ShellContext);
}

export function AppShell({ children }: AppShellProps) {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  useEffect(() => {
    if (!drawerOpen) {
      lastFocusedRef.current?.focus();
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  const isActive = (href: string) => location === href || location.startsWith(`${href}/`);

  const openDrawer = () => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDrawerOpen(true);
  };

  return (
    <ShellContext.Provider value={{ openDrawer }}>
    <div className="enterprise-shell flex flex-col h-full w-full max-w-lg mx-auto overflow-hidden">
      {drawerOpen && (
        <>
          <button
            aria-label={t("common.close")}
            className="fixed inset-0 z-40 bg-slate-950/35"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            className="enterprise-drawer fixed left-0 top-0 bottom-0 z-50 w-[min(84vw,340px)] bg-card shadow-2xl flex flex-col"
          >
            <div className="safe-top px-5 pt-4 pb-4 flex items-center justify-between border-b border-border">
              <button onClick={() => navigate("/home")} className="flex items-center gap-2.5 text-left">
                <span className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs">F</span>
                <span className="font-bold tracking-tight text-foreground">FlowForge<span className="text-primary">IQ</span></span>
              </button>
              <button
                ref={closeButtonRef}
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {sections.map((section) => (
                <div key={section.label} className="mb-5">
                  <p className="section-label px-3 mb-1.5">{t(`nav.group${section.label}`)}</p>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map(({ href, icon: Icon, labelKey }) => {
                      const active = isActive(href);
                      return (
                        <button
                          key={href}
                          onClick={() => navigate(href)}
                          aria-current={active ? "page" : undefined}
                          className={`drawer-item flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${active ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
                          <span>{t(labelKey)}</span>
                          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-3">
                <p className="section-label px-3 mb-1.5">{t("nav.legacy")}</p>
                <button onClick={() => navigate("/documents")} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm text-muted-foreground hover:bg-muted">
                  <Search size={16} />
                  <span>{t("nav.documents")}</span>
                </button>
                <button onClick={() => navigate("/capture")} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm text-muted-foreground hover:bg-muted">
                  <PanelLeftClose size={16} />
                  <span>{t("nav.capture")}</span>
                </button>
                <button onClick={() => navigate("/settings")} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm text-muted-foreground hover:bg-muted">
                  <Menu size={16} />
                  <span>{t("nav.settings")}</span>
                </button>
              </div>
            </div>
            <div className="safe-bottom border-t border-border p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-foreground text-white flex items-center justify-center text-[11px] font-bold">FF</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{t("nav.workspaceMember")}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t("nav.workspaceName")}</p>
              </div>
            </div>
          </aside>
        </>
      )}
      <div className="flex-1 overflow-hidden flex flex-col" aria-hidden={drawerOpen || undefined} style={drawerOpen ? { pointerEvents: "none" } : undefined}>
        {children}
      </div>
      <div aria-hidden={drawerOpen || undefined} style={drawerOpen ? { pointerEvents: "none" } : undefined}><BottomNav /></div>
    </div>
    </ShellContext.Provider>
  );
}
