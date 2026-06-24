/**
 * Shared typography class constants for FlowForge UI.
 *
 * Centralising these prevents copy-paste drift when the type scale or
 * brand palette changes. Import the constants instead of writing raw
 * Tailwind strings inline.
 *
 * Usage:
 *   import { SECTION_LABEL, PAGE_TITLE, BODY_MUTED } from "@/lib/typography";
 *   <span className={SECTION_LABEL}>Section Name</span>
 */

/**
 * Section header / column label — 10 px bold uppercase with letter-spacing.
 * Used for sidebar section titles, table column headers, card sub-headings.
 * Colour: medium-gray (#5E687B).
 */
export const SECTION_LABEL =
  "text-[10px] font-bold text-[#5E687B] uppercase tracking-wider";

/**
 * Muted section header / column label — same scale as SECTION_LABEL but
 * lighter (#9E9FAE). Used when the label sits on a low-contrast background
 * or needs to recede visually (e.g. stage tracker, PO column headers).
 */
export const SECTION_LABEL_MUTED =
  "text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider";

/**
 * Page / panel title — 14 px bold, ink colour (#212833).
 * Used for the primary h1/h2 of every page and major panel.
 */
export const PAGE_TITLE = "text-sm font-bold text-[#212833]";

/**
 * Section sub-heading — 14 px semibold, ink colour (#212833).
 * Used for card titles, settings section headings, modal titles.
 */
export const SECTION_HEADING = "text-sm font-semibold text-[#212833]";

/**
 * Standard body / caption text — 12 px (Tailwind `xs`), muted gray (#5E687B).
 * Used for description copy, helper text, and secondary row labels.
 */
export const BODY_MUTED = "text-xs text-[#5E687B]";

/**
 * Small body / helper text — 11 px, muted gray (#5E687B).
 * Used for inline metadata, timestamps, and secondary detail rows.
 */
export const BODY_SM_MUTED = "text-[11px] text-[#5E687B]";

/**
 * Badge label — 11 px semibold. Colour is context-dependent (apply via
 * a conditional class); this constant covers the shared sizing + weight.
 * Used for status pills, spread badges, and urgency tags.
 */
export const BADGE_LABEL = "text-[11px] font-semibold";
