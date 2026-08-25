import { ArrowLeft } from "lucide-react";
import { Menu, Search } from "lucide-react";
import { useAppShell } from "./AppShell";
import { useTranslation } from "react-i18next";

interface GradientHeaderProps {
  subtitle?: React.ReactNode;
  title?: React.ReactNode;
  subtitleClassName?: string;
  back?: () => void;
  right?: React.ReactNode;
  align?: "center" | "start";
  logoSize?: number;
}

export function GradientHeader({
  title = "FlowForgeIQ",
  subtitle,
  back,
  right,
  align = "center",
}: GradientHeaderProps) {
  const { openDrawer } = useAppShell();
  const { t } = useTranslation();
  return (
    <div
      className={`status-bar-pad px-4 pb-3 flex items-${align} gap-3 shrink-0 bg-card border-b border-border`}
    >
      {back && (
        <button
          onClick={back}
          className={`active:opacity-60${align === "start" ? " mt-0.5" : ""}`}
          >
          <ArrowLeft size={19} className="text-foreground" />
        </button>
      )}
      {!back && (
        <button onClick={openDrawer} className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted" aria-label={t("nav.openMenu")}>
          <Menu size={18} />
        </button>
      )}
      <div className={right ? "flex-1 min-w-0" : "flex-1 min-w-0"}>
        <p className="text-foreground font-semibold text-[16px] tracking-tight leading-tight truncate">{title}</p>
        {subtitle != null && (
          <p className="text-muted-foreground text-[11px] font-medium mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {right ?? (!back ? <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground" aria-label={t("common.search")}><Search size={17} /></button> : null)}
    </div>
  );
}
