export type Channel = "whatsapp" | "wechat" | "imessage" | "sms" | "email";

export interface DetectResult {
  channel: Channel;
  label: string;
}

/**
 * Heuristic channel detection from shared text, url, and title.
 * Returns a DetectResult when a signal is found, or null when no match.
 */
export function detectChannel(
  text: string,
  url: string,
  title: string
): DetectResult | null {
  const t = text.toLowerCase();
  const u = url.toLowerCase();
  const ti = title.toLowerCase();
  const all = `${t} ${u} ${ti}`;

  // WhatsApp signals
  // wa.me links, share URLs, or chat export formatting
  if (
    u.includes("wa.me") ||
    u.includes("whatsapp.com") ||
    u.includes("api.whatsapp.com") ||
    /\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}/.test(text) || // WhatsApp timestamp [DD/MM/YY, HH:MM]
    /^‎?[\w\s]+:\s/.test(text) || // sender: message pattern
    all.includes("whatsapp")
  ) {
    return { channel: "whatsapp", label: "WhatsApp" };
  }

  // WeChat signals
  // WeChat transcript markers and links
  if (
    u.includes("weixin.qq.com") ||
    u.includes("wechat.com") ||
    all.includes("wechat") ||
    all.includes("weixin") ||
    /微信/.test(text) ||
    // WeChat export format: time stamps like "下午3:22" or "上午10:05"
    /[下上]午\d{1,2}:\d{2}/.test(text)
  ) {
    return { channel: "wechat", label: "WeChat" };
  }

  // iMessage signals
  // Blue bubble patterns: "Read", "Delivered" footers, iMessage URLs
  if (
    u.includes("imessage") ||
    all.includes("imessage") ||
    // iMessage transcript markers
    /\bRead\s+\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(text) ||
    /\bDelivered\b/.test(text) ||
    // "Today HH:MM AM/PM" time format typical in iMessage exports
    /\bToday\s+\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(text)
  ) {
    return { channel: "imessage", label: "iMessage" };
  }

  // Email signals
  // mailto: links, Gmail share URLs, "From:", "Subject:", "Fw:" patterns
  if (
    u.startsWith("mailto:") ||
    u.includes("mail.google.com") ||
    u.includes("gmail.com") ||
    u.includes("outlook.live.com") ||
    u.includes("outlook.com") ||
    /^(from|subject|to|cc|bcc|fw:|fwd:|re:)\s*:/im.test(text) ||
    /^from:.+@.+\n/im.test(text) ||
    all.includes("gmail") ||
    all.includes("outlook")
  ) {
    return { channel: "email", label: "Email" };
  }

  // SMS signals
  // Short-code numbers (5-6 digit), common SMS indicators
  if (
    /\b\d{5,6}\b/.test(text) || // short code numbers
    /\bSMS\b/i.test(all) ||
    /\btext message\b/i.test(all) ||
    // phone number + message pattern typical in SMS apps
    /^\+?\d[\d\s\-().]{6,}\n/m.test(text)
  ) {
    return { channel: "sms", label: "SMS" };
  }

  return null;
}
