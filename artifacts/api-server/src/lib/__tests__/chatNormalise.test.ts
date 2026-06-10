import { describe, it, expect } from "vitest";
import { normaliseChat } from "../chatNormalise";

// ─── WhatsApp fixtures ────────────────────────────────────────────────────────

const WHATSAPP_EXPORT = `[12/05/2026, 09:14] Alice Chan: Hi, PO-8821 is ready for QC inspection.
[12/05/2026, 09:15] Me: Great, we will schedule for Monday.
[12/05/2026, 09:16] Alice Chan: Confirmed. Ex-factory by the 20th.
[12/05/2026, 09:18] Alice Chan: Please also confirm deposit receipt.`;

const WHATSAPP_MULTILINE = `[12/05/2026, 09:00] Supplier: Hi,
please confirm PO-1234.
[12/05/2026, 09:05] Me: Confirmed.`;

const WHATSAPP_AM_PM_FORMAT = `[5/6/2026, 9:00 AM] Wang Li: Production 80% done.
[5/6/2026, 9:02 AM] Me: Thanks for update.`;

// ─── WeChat fixtures ──────────────────────────────────────────────────────────

const WECHAT_EXPORT = `Wang Li  09:00
Can you confirm balance payment?
Me  09:05
Will process today, thanks.
Wang Li  09:10
Great, ex-factory on 25th.`;

const WECHAT_COLON_LINES = `Wang Li: Balance payment confirmed received.
Me: Great, ex-factory on 25th then.
Wang Li: We will ship on time.`;

// ─── iMessage fixtures ────────────────────────────────────────────────────────

const IMESSAGE_BEGIN_FORWARDED = `Begin forwarded message:

From: Alice Chan <alice@supplier.com>
Subject: PO-7712 update

Hi, samples approved. Proceeding to bulk production.`;

const IMESSAGE_FWD_PREFIX = `FWD: Hi team, QC passed on sample batch #3.`;

// ─── Generic colon-formatted chat ─────────────────────────────────────────────

const GENERIC_COLON_CHAT = `Guangzhou Office: Hi, the balance is due.
Buyer: We will wire today.
Guangzhou Office: Thank you.`;

describe("normaliseChat — WhatsApp", () => {
  it("parses bracketed WhatsApp timestamp lines into segments", () => {
    const result = normaliseChat(WHATSAPP_EXPORT, "whatsapp");
    expect(result.segments.length).toBe(4);
    expect(result.segments[0].sender).toBe("Alice Chan");
    expect(result.segments[0].body).toContain("PO-8821");
    expect(result.segments[0].sentAt).toContain("12/05/2026");
  });

  it("identifies the non-me primary sender", () => {
    const result = normaliseChat(WHATSAPP_EXPORT, "whatsapp");
    expect(result.primarySender).toBe("Alice Chan");
  });

  it("appends continuation lines to the current segment", () => {
    const result = normaliseChat(WHATSAPP_MULTILINE, "whatsapp");
    expect(result.segments[0].body).toContain("Hi,");
    expect(result.segments[0].body).toContain("please confirm PO-1234");
  });

  it("handles AM/PM timestamp variants", () => {
    const result = normaliseChat(WHATSAPP_AM_PM_FORMAT, "whatsapp");
    expect(result.segments.length).toBe(2);
    expect(result.segments[0].sender).toBe("Wang Li");
  });

  it("builds fullText as bracketed sender: body lines joined with double newlines", () => {
    const result = normaliseChat(WHATSAPP_EXPORT, "whatsapp");
    expect(result.fullText).toContain("[Alice Chan]: Hi, PO-8821");
    expect(result.fullText).toContain("[Me]:");
  });

  it("falls back to a single segment when no timestamps match", () => {
    const result = normaliseChat("No timestamps here just some text", "whatsapp");
    expect(result.segments.length).toBe(1);
  });
});

describe("normaliseChat — WeChat", () => {
  it("parses WeChat header+body pairs from two-space separated lines", () => {
    const result = normaliseChat(WECHAT_EXPORT, "wechat");
    expect(result.segments.length).toBeGreaterThanOrEqual(3);
    const wangSeg = result.segments.find(s => s.sender === "Wang Li");
    expect(wangSeg).toBeTruthy();
    expect(wangSeg!.body).toContain("balance payment");
  });

  it("identifies Wang Li as primary sender (most frequent non-me)", () => {
    const result = normaliseChat(WECHAT_EXPORT, "wechat");
    expect(result.primarySender).toBe("Wang Li");
  });

  it("parses WeChat colon-style export", () => {
    const result = normaliseChat(WECHAT_COLON_LINES, "wechat");
    expect(result.segments.length).toBe(3);
    expect(result.segments[0].sender).toBe("Wang Li");
  });
});

describe("normaliseChat — iMessage", () => {
  it("parses 'Begin forwarded message' block into a single segment", () => {
    const result = normaliseChat(IMESSAGE_BEGIN_FORWARDED, "imessage");
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].sender).toContain("Alice Chan");
    expect(result.segments[0].body).toContain("samples approved");
  });

  it("strips FWD: prefix and returns the body", () => {
    const result = normaliseChat(IMESSAGE_FWD_PREFIX, "imessage");
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].body).toContain("QC passed");
  });
});

describe("normaliseChat — generic channel", () => {
  it("parses colon-formatted lines into segments", () => {
    const result = normaliseChat(GENERIC_COLON_CHAT, "email");
    expect(result.segments.length).toBe(3);
    expect(result.segments[0].sender).toBe("Guangzhou Office");
    expect(result.segments[0].body).toBe("Hi, the balance is due.");
  });

  it("uses senderHint as primarySender fallback when no clear non-me sender", () => {
    const result = normaliseChat("Hello there", "email", "TestSender");
    expect(result.primarySender).toBe("TestSender");
  });

  it("falls back to single segment for unstructured text", () => {
    const result = normaliseChat("Some unstructured update text.", "email");
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].body).toBe("Some unstructured update text.");
  });
});

describe("normaliseChat — edge cases", () => {
  it("handles empty string without throwing", () => {
    const result = normaliseChat("", "whatsapp");
    expect(result.segments.length).toBe(1);
    expect(result.fullText).toBeTruthy();
  });

  it("always returns a non-null primarySender", () => {
    const result = normaliseChat("", "wechat");
    expect(typeof result.primarySender).toBe("string");
  });
});
