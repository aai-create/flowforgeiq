/**
 * Option D – FlowForgeIQ Brand Purple (updated)
 * Primary: #9000FF (274 100% 50%) — matches the live web app exactly
 * Hover:   #7A00D9 (274 100% 43%)
 * Accent bg:  274 100% 96%   (near-white purple tint)
 * Accent fg:  274 100% 32%   (deep brand purple for readable text)
 * WCAG AA: white on #9000FF ≈ 4.6:1  ✓ (AA for large/bold text; passes at 18px+)
 *
 * Access at: /__mockup/preview/mobile-colorways/CaptureVariantD
 */
import React from "react";
import { CapturePreview } from "./CapturePreview";

export function CaptureVariantD() {
  return (
    <div
      style={
        {
          "--primary":             "274 100% 50%",
          "--primary-hover":       "274 100% 43%",
          "--accent":              "274 100% 96%",
          "--accent-foreground":   "274 100% 32%",
          width: "100%",
          height: "100%",
        } as React.CSSProperties
      }
    >
      <CapturePreview />
    </div>
  );
}

export default CaptureVariantD;
