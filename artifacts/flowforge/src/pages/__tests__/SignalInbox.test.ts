import { describe, expect, it } from "vitest";
import {
  FILTER_LABELS,
  filterFromSearch,
  isFilterMatch,
  type Filter,
} from "../SignalInbox";
import { isActionableInboxStatus } from "../InboxHub";

describe("Inbox communication views", () => {
  it("exposes the public communication views with Inbox terminology", () => {
    expect(Object.values(FILTER_LABELS)).toEqual([
      "Needs review",
      "AI drafts",
      "Ready to send",
      "Failed",
      "Sent",
      "Skipped",
    ]);
  });

  it("keeps the default view actionable and maps workflow states into public buckets", () => {
    const cases: Array<[Filter, string, boolean]> = [
      ["needs-review", "new", true],
      ["needs-review", "draft_ready", true],
      ["needs-review", "approved", true],
      ["needs-review", "sent", false],
      ["ai-drafts", "draft_ready", true],
      ["ai-drafts", "approved", false],
      ["ready-to-send", "approved", true],
      ["failed", "send_failed", true],
      ["failed", "send_uncertain", true],
      ["failed", "sent", false],
      ["sent", "sent", true],
      ["skipped", "skipped", true],
    ];

    for (const [filter, status, expected] of cases) {
      expect(isFilterMatch(filter, status)).toBe(expected);
    }
  });

  it("accepts legacy status/filter query values without changing internal states", () => {
    expect(filterFromSearch("?status=draft_ready")).toBe("ai-drafts");
    expect(filterFromSearch("?status=approved")).toBe("ready-to-send");
    expect(filterFromSearch("?status=send_failed")).toBe("failed");
    expect(filterFromSearch("?filter=skipped&messageId=42")).toBe("skipped");
    expect(filterFromSearch("?activeView=signal-inbox")).toBe("needs-review");
    expect(filterFromSearch("")).toBe("needs-review");
  });

  it("counts every actionable Inbox state for the sidebar badge", () => {
    expect(isActionableInboxStatus("new")).toBe(true);
    expect(isActionableInboxStatus("draft_ready")).toBe(true);
    expect(isActionableInboxStatus("approved")).toBe(true);
    expect(isActionableInboxStatus("send_failed")).toBe(true);
    expect(isActionableInboxStatus("assessing")).toBe(false);
    expect(isActionableInboxStatus("sent")).toBe(false);
    expect(isActionableInboxStatus("skipped")).toBe(false);
  });
});