/**
 * Option D – Warm Slate + Muted Purple
 * Header bg: #2D3748  Accent: #7C3AED at lower saturation for a refined feel
 * WCAG AA: white on #2D3748 ≈ 10.6:1  white on #6D3EC5 ≈ 6.1:1  ✓
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
          "--primary": "217 23% 23%",
          "--primary-hover": "217 23% 18%",
          "--accent": "262 38% 95%",
          "--accent-foreground": "262 55% 38%",
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
