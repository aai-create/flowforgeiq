/**
 * Option A – Deep Navy
 * Primary: #1A2B4A  Hover: #152338  Accent bg: light navy  Accent fg: deep navy
 * WCAG AA: white on #1A2B4A ≈ 12.6:1  ✓
 *
 * Access at: /__mockup/preview/mobile-colorways/CaptureVariantA
 */
import React from "react";
import { CapturePreview } from "./CapturePreview";

export function CaptureVariantA() {
  return (
    <div
      style={
        {
          "--primary": "219 48% 20%",
          "--primary-hover": "219 48% 16%",
          "--accent": "219 40% 94%",
          "--accent-foreground": "219 48% 24%",
          width: "100%",
          height: "100%",
        } as React.CSSProperties
      }
    >
      <CapturePreview />
    </div>
  );
}

export default CaptureVariantA;
