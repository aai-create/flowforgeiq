import { useState, useRef } from "react";

interface HotspotProps {
  top: string;
  left: string;
  label: string;
  description: string;
}

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

export default function Hotspot({ top, left, label, description }: HotspotProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function close(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    setOpen(false);
  }

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  if (isAllSlides) {
    return (
      <div
        style={{
          position: "absolute",
          top,
          left,
          transform: "translate(-50%, -50%)",
          background: "#7C3AED",
          color: "#F1F5F9",
          borderRadius: "999px",
          padding: "0.4vh 1vw",
          fontSize: "1.2vw",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontWeight: 500,
          zIndex: 10,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <>
      {open && (
        <div
          onClick={close}
          onKeyDown={(e) => e.key === "Escape" && close(e)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 18,
            cursor: "default",
            background: "transparent",
          }}
          aria-hidden="true"
        />
      )}

      <div
        ref={wrapperRef}
        style={{
          position: "absolute",
          top,
          left,
          transform: "translate(-50%, -50%)",
          zIndex: open ? 22 : 20,
        }}
      >
        <div style={{ position: "relative", width: "2.2vw", height: "2.2vw" }}>
          <div
            className="hotspot-ring"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "rgba(124,58,237,0.4)",
            }}
          />
          <button
            onClick={toggle}
            aria-label={`${open ? "Close" : "Show"} info: ${label}`}
            style={{
              position: "absolute",
              inset: "0.2vw",
              borderRadius: "50%",
              background: open ? "#7C3AED" : "rgba(124,58,237,0.85)",
              border: "2px solid #A78BFA",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F1F5F9",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "0.9vw",
              zIndex: 1,
            }}
          >
            {open ? "×" : "+"}
          </button>
        </div>

        {open && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: "calc(100% + 0.8vh)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#131929",
              border: "1px solid rgba(124,58,237,0.45)",
              borderRadius: "0.6vw",
              padding: "1.2vh 1.2vw",
              minWidth: "14vw",
              maxWidth: "20vw",
              zIndex: 30,
              boxShadow: "0 0.5vh 2vh rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                color: "#A78BFA",
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: "1.2vw",
                marginBottom: "0.5vh",
              }}
            >
              {label}
            </div>
            <div
              style={{
                color: "#94A3B8",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "1.1vw",
                lineHeight: 1.5,
              }}
            >
              {description}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
