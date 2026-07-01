/**
 * Option C – Charcoal + Indigo
 * Primary (header + button): #1E1E2E  Accent chips: indigo-tinted (#E8EAFB / #3D4FAA)
 * WCAG AA: white on #1E1E2E ≈ 20+:1  white on #3D4FAA ≈ 7.3:1  ✓
 *
 * Access at: /__mockup/preview/mobile-colorways/CaptureVariantC
 */
import React from "react";
import { CapturePreview } from "./CapturePreview";

export function CaptureVariantC() {
  return (
    <div
      style={
        {
          "--primary": "240 21% 15%",
          "--primary-hover": "240 21% 10%",
          "--accent": "232 40% 94%",
          "--accent-foreground": "232 46% 38%",
          width: "100%",
          height: "100%",
        } as React.CSSProperties
      }
    >
      <CapturePreview />
    </div>
  );
}

export default CaptureVariantC;
