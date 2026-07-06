import { ArrowLeft } from "lucide-react";

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
  subtitleClassName = "text-white/55 text-[11px] font-medium tracking-[0.6px] uppercase mt-0.5",
  back,
  right,
  align = "center",
  logoSize = 28,
}: GradientHeaderProps) {
  return (
    <div
      className={`status-bar-pad px-5 pb-3.5 flex items-${align} gap-3 shrink-0 page-header-gradient`}
    >
      {back && (
        <button
          onClick={back}
          className={`active:opacity-60${align === "start" ? " mt-0.5" : ""}`}
        >
          <ArrowLeft size={20} color="white" />
        </button>
      )}
      <img
        src={`${import.meta.env.BASE_URL}flowforge-logo.png`}
        alt="FlowForgeIQ"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: "contain",
          filter: "brightness(0) invert(1)",
          flexShrink: 0,
          ...(align === "start" ? { marginTop: 2 } : {}),
        }}
      />
      <div className={right ? "flex-1 min-w-0" : undefined}>
        <p className="text-white font-bold text-[17px] tracking-tight leading-tight">{title}</p>
        {subtitle != null && (
          <p className={subtitleClassName}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}
