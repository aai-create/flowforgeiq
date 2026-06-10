export interface ChatForwardDetection {
  isChat: boolean;
  channel: "whatsapp" | "imessage" | "wechat" | null;
  chatBody: string | null;
}

export function detectChatForward(subject: string | undefined, textBody: string | undefined): ChatForwardDetection {
  const body = textBody ?? "";
  const subj = subject ?? "";
  const subjL = subj.toLowerCase();
  const bodyHead = body.slice(0, 500);

  const inferChannel = (): "whatsapp" | "imessage" | "wechat" => {
    const ctx = subjL + " " + bodyHead.toLowerCase();
    if (/wechat|weixin/.test(ctx)) return "wechat";
    if (/imessage|iphone|apple\.com/.test(ctx)) return "imessage";
    return "whatsapp";
  };

  // 1. WhatsApp timestamp pattern: [DD/MM/YYYY, HH:MM] or similar
  if (/\[\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4},?\s*\d{1,2}:\d{2}/m.test(body)) {
    return { isChat: true, channel: "whatsapp", chatBody: body };
  }

  // 2. Subject starts with "FWD:" or "Fwd:" — confirm chat-style "Sender: message" lines.
  //    Exclude email headers (From:, Subject:, Date:, To:, Cc:) and plain-text key-value
  //    patterns (Total amount:, Best regards:, etc.) by requiring:
  //    a) at least 2 matching lines, AND
  //    b) the sender segment does not start with a known email-header or phrase keyword.
  if (/^(?:fwd?:|re:\s*fwd?:|【?fwd?】?:)/i.test(subj)) {
    const EMAIL_HEADER_RE = /^(?:from|subject|date|to|cc|bcc|reply-to|content|total|best|dear|please|regards|sincerely|hi,|hello)\b/i;
    const CHAT_LINE_RE = /^[^:\n@]{1,50}:\s*\S/gm;
    const chatLines = [...body.matchAll(CHAT_LINE_RE)].filter(
      m => !EMAIL_HEADER_RE.test(m[0])
    );
    if (chatLines.length >= 2) {
      return { isChat: true, channel: inferChannel(), chatBody: body };
    }
  }

  // 3. Body contains "Forwarded from [Name]" header
  if (/(?:^|[\n\r])[-–—]*\s*(?:forwarded from|forward from)[:\s][^\n]{0,80}/im.test(body)) {
    return { isChat: true, channel: inferChannel(), chatBody: body };
  }

  // 4. WhatsApp subject keyword
  if (/whatsapp/i.test(subjL)) {
    return { isChat: true, channel: "whatsapp", chatBody: body };
  }

  // 5. iMessage "Begin forwarded message" with Apple/iMessage markers
  //    icloud.com is Apple's email domain, so we include it alongside apple.com
  if (/begin forwarded message/i.test(body) && /imessage|iphone|apple\.com|icloud\.com/i.test(subjL + " " + bodyHead)) {
    return { isChat: true, channel: "imessage", chatBody: body };
  }

  // 6. WeChat / Weixin forward
  if (/wechat|weixin/i.test(subjL + " " + bodyHead)) {
    return { isChat: true, channel: "wechat", chatBody: body };
  }

  return { isChat: false, channel: null, chatBody: null };
}

/**
 * Routing threshold for chat-forward detection.
 * Reads CHAT_ROUTING_THRESHOLD from environment; defaults to 0.65.
 * Increase to be more conservative (fewer auto-routes, more needs-review).
 * Decrease to route more aggressively.
 */
export const CHAT_ROUTING_THRESHOLD: number = (() => {
  const raw = process.env.CHAT_ROUTING_THRESHOLD;
  if (!raw) return 0.65;
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed < 0 || parsed > 1) {
    return 0.65;
  }
  return parsed;
})();
