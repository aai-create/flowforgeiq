/**
 * Option B – Slate Teal
 * Primary: #1F6B72  Hover: #1A5C62  Accent bg: light teal  Accent fg: dark teal
 * WCAG AA: white on #1F6B72 ≈ 5.7:1  ✓
 *
 * Access at: /__mockup/preview/mobile-colorways/CaptureVariantB
 */
import React from "react";
import { CapturePreview } from "./CapturePreview";

export function CaptureVariantB() {
  return (
    <div
      style={
        {
          "--primary": "185 57% 28%",
          "--primary-hover": "185 57% 23%",
          "--accent": "185 42% 93%",
          "--accent-foreground": "185 57% 24%",
          width: "100%",
          height: "100%",
        } as React.CSSProperties
      }
    >
      <CapturePreview />
    </div>
  );
}

export default CaptureVariantB;
