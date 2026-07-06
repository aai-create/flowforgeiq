import { useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const SHORTCUT_FILE_PATH = `${basePath}/api/shortcuts/capture.shortcut`;

function getShortcutFileUrl() {
  return `${window.location.origin}${SHORTCUT_FILE_PATH}`;
}

function isIOS() {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function ShortcutsRedirect() {
  useEffect(() => {
    const fileUrl = getShortcutFileUrl();
    if (isIOS()) {
      window.location.href = `shortcuts://import-shortcut?url=${encodeURIComponent(fileUrl)}`;
    } else {
      window.location.href = fileUrl;
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        background: "#FAFBFC",
        color: "#5E687B",
        gap: 12,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#9000FF" fillOpacity="0.1" />
        <path
          d="M16 10v6l4 2"
          stroke="#9000FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p style={{ fontSize: 14, margin: 0 }}>Opening shortcut…</p>
    </div>
  );
}

export default ShortcutsRedirect;
