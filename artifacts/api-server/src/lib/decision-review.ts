export const ROUTING_AUTO_CONFIRM_CONFIDENCE = 0.85;
export const REVIEW_CONFIDENCE_FLOOR = 0.45;

export type ReviewCategory = "routing" | "extraction" | "suggestion";

export function needsHumanReview(
  category: ReviewCategory,
  confidence: number,
  conflict = false,
): boolean {
  if (conflict || !Number.isFinite(confidence)) return true;
  // Extracted operational facts always require confirmation, even when the
  // model is confident. Routing is the only category allowed to auto-confirm.
  return category === "extraction" || confidence < ROUTING_AUTO_CONFIRM_CONFIDENCE;
}

export function makeReviewDecision(
  category: ReviewCategory,
  confidence: number,
  reason: string,
  evidence: Record<string, unknown>,
  conflict = false,
) {
  return {
    category,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    reason,
    evidence,
    required: needsHumanReview(category, confidence, conflict),
  };
}