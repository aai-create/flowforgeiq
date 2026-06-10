import { describe, it, expect } from "vitest";
import { detectChatForward } from "../chatDetect";

// ─── WhatsApp fixtures ────────────────────────────────────────────────────────

const WHATSAPP_TIMESTAMP_BODY = `[12/05/2026, 09:14] Alice: Hi, shipment PO-8821 is ready for QC.
[12/05/2026, 09:15] Bob: Great, we'll schedule inspection for Monday.
[12/05/2026, 09:16] Alice: Confirmed. Ex-factory by 20th.`;

const WHATSAPP_OLDER_FORMAT = `[5-6-2026, 10:00] Supplier Wang: The production is 80% done.
[5-6-2026, 10:02] Me: Thanks for the update.`;

const WHATSAPP_SUBJECT_KEYWORD = `Please see conversation below.

Guangzhou Supplier: PO confirmed, deposit received.
Me: Thank you.`;

// ─── WeChat fixtures ──────────────────────────────────────────────────────────

const WECHAT_BODY = `WeChat export from Guangzhou Textile

Wang Li  09:00
Can you confirm the balance payment?
Me  09:05
Will process today.`;

const WECHAT_WEIXIN_SUBJECT = `Weixin chat - PO 4421 update`;

const WECHAT_COLON_LINES = `Wang Li: Balance payment confirmed received.
Me: Great, ex-factory on 25th then.
Wang Li: Correct, we will ship on time.`;

// ─── iMessage fixtures ────────────────────────────────────────────────────────

const IMESSAGE_FORWARDED_BODY = `Begin forwarded message:

From: supplier@example.com
Subject: RE: PO-7712
Date: May 10, 2026

Hi, samples approved. Proceeding to bulk production.`;

const IMESSAGE_SUBJECT_KEYWORD = `iMessage conversation about PO-1234`;

const IMESSAGE_APPLE_DOMAIN_BODY = `Begin forwarded message:

From: Alice <alice@icloud.com>
Subject: Shipment update

QC passed. Ready to ship.`;

// ─── Forwarded-from header fixtures ──────────────────────────────────────────

const FORWARDED_FROM_BODY = `Please see below.

-- Forwarded from Alice Chan --
Hi, the fabric arrived and production starts Monday.`;

const FORWARDED_FROM_COLON_VARIANT = `FYI:

Forwarded from: Guangzhou Office
Wang: QC cleared on sample #3.
Me: Noted, proceeding to bulk.`;

// ─── FWD: subject fixtures ────────────────────────────────────────────────────

const FWD_SUBJECT = `FWD: PO 8821 update`;
const FWD_COLON_BODY = `Alice: Production is 90% complete.
Bob: Great. ETA for ex-factory?
Alice: Next Friday.`;

const RE_FWD_SUBJECT = `Re: Fwd: shipment delay`;

// ─── Plain email (should NOT be detected as chat) ─────────────────────────────

const PLAIN_EMAIL_BODY = `Dear Team,

Please find attached the commercial invoice for PO-4421.
Total amount: USD 15,200.

Best regards,
Guangzhou Textile Co.`;

const FORWARDED_EMAIL_ONLY = `---------- Forwarded message ---------
From: supplier@guangzhou.com
Subject: Invoice

Please see the invoice attached.`;

describe("detectChatForward", () => {
  describe("WhatsApp detection", () => {
    it("detects WhatsApp by timestamp pattern [DD/MM/YYYY, HH:MM]", () => {
      const result = detectChatForward("FWD: supplier chat", WHATSAPP_TIMESTAMP_BODY);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("whatsapp");
      expect(result.chatBody).toBe(WHATSAPP_TIMESTAMP_BODY);
    });

    it("detects WhatsApp by timestamp with dash separator [D-M-YYYY]", () => {
      const result = detectChatForward(undefined, WHATSAPP_OLDER_FORMAT);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("whatsapp");
    });

    it("detects WhatsApp by 'whatsapp' keyword in subject", () => {
      const result = detectChatForward("WhatsApp conversation PO-8821", WHATSAPP_SUBJECT_KEYWORD);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("whatsapp");
    });
  });

  describe("WeChat detection", () => {
    it("detects WeChat by 'wechat' keyword in body", () => {
      const result = detectChatForward("Chat export", WECHAT_BODY);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("wechat");
    });

    it("detects WeChat by 'weixin' keyword in subject", () => {
      const result = detectChatForward(WECHAT_WEIXIN_SUBJECT, WECHAT_COLON_LINES);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("wechat");
    });

    it("detects WeChat chat via FWD: subject with colon-formatted lines and wechat body", () => {
      const result = detectChatForward(FWD_SUBJECT, "WeChat:\n" + WECHAT_COLON_LINES);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("wechat");
    });
  });

  describe("iMessage detection", () => {
    it("detects iMessage by 'Begin forwarded message' + iMessage subject", () => {
      const result = detectChatForward(IMESSAGE_SUBJECT_KEYWORD, IMESSAGE_FORWARDED_BODY);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("imessage");
    });

    it("detects iMessage by apple.com domain in body", () => {
      const result = detectChatForward("FWD: note from Alice", IMESSAGE_APPLE_DOMAIN_BODY);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("imessage");
    });
  });

  describe("Forwarded-from header detection", () => {
    it("detects chat via '-- Forwarded from Name --' header", () => {
      const result = detectChatForward("Fwd: supplier update", FORWARDED_FROM_BODY);
      expect(result.isChat).toBe(true);
      expect(result.chatBody).toBe(FORWARDED_FROM_BODY);
    });

    it("detects chat via 'Forwarded from: <location>' variant", () => {
      const result = detectChatForward("Update", FORWARDED_FROM_COLON_VARIANT);
      expect(result.isChat).toBe(true);
    });
  });

  describe("FWD: subject + colon-formatted lines", () => {
    it("detects chat when FWD: subject + Sender: message lines present", () => {
      const result = detectChatForward(FWD_SUBJECT, FWD_COLON_BODY);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("whatsapp");
    });

    it("detects chat with Re: Fwd: subject prefix", () => {
      const result = detectChatForward(RE_FWD_SUBJECT, FWD_COLON_BODY);
      expect(result.isChat).toBe(true);
    });

    it("does NOT detect as chat when FWD: subject but no colon lines", () => {
      const result = detectChatForward(FWD_SUBJECT, PLAIN_EMAIL_BODY);
      expect(result.isChat).toBe(false);
    });
  });

  describe("Plain email — should NOT be detected as chat", () => {
    it("does not detect a standard plain email as chat", () => {
      const result = detectChatForward("Invoice for PO-4421", PLAIN_EMAIL_BODY);
      expect(result.isChat).toBe(false);
      expect(result.channel).toBeNull();
      expect(result.chatBody).toBeNull();
    });

    it("does not detect a forwarded email (no chat markers) as chat", () => {
      const result = detectChatForward("FWD: Invoice", FORWARDED_EMAIL_ONLY);
      expect(result.isChat).toBe(false);
    });

    it("returns false when both subject and body are undefined", () => {
      const result = detectChatForward(undefined, undefined);
      expect(result.isChat).toBe(false);
    });

    it("returns false when body is empty string", () => {
      const result = detectChatForward("Invoice attached", "");
      expect(result.isChat).toBe(false);
    });
  });

  describe("channel inference priority", () => {
    it("prefers wechat over whatsapp when wechat keyword appears in body", () => {
      const body = `WeChat export\n[12/05/2026, 09:00] Alice: hi`;
      const result = detectChatForward(undefined, body);
      expect(result.isChat).toBe(true);
      expect(result.channel).toBe("whatsapp");
    });

    it("returns chatBody equal to full input body", () => {
      const result = detectChatForward(undefined, WHATSAPP_TIMESTAMP_BODY);
      expect(result.chatBody).toBe(WHATSAPP_TIMESTAMP_BODY);
    });
  });
});
