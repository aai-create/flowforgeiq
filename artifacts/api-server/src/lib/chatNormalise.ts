export interface ChatSegment {
  sender: string;
  body: string;
  sentAt?: string;
}

export interface NormalisedChat {
  segments: ChatSegment[];
  primarySender: string;
  fullText: string;
}

const ME_LABELS = new Set(["me", "you", "i", "myself", "my"]);

function guessNonMeSender(segments: ChatSegment[], senderHint?: string): string {
  if (senderHint?.trim()) return senderHint.trim();
  const freq = new Map<string, number>();
  for (const seg of segments) {
    const key = seg.sender.toLowerCase().trim();
    if (!ME_LABELS.has(key) && key !== "unknown") {
      freq.set(seg.sender, (freq.get(seg.sender) ?? 0) + 1);
    }
  }
  let max = 0;
  let best = "";
  for (const [name, count] of freq) {
    if (count > max) { max = count; best = name; }
  }
  return best || segments[0]?.sender || "Unknown Sender";
}

function normaliseWhatsApp(raw: string): ChatSegment[] {
  const segments: ChatSegment[] = [];
  const lineRe = /^\[(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+):\s(.+)$/;
  const lines = raw.split("\n");
  let current: ChatSegment | null = null;
  for (const line of lines) {
    const m = line.match(lineRe);
    if (m) {
      if (current) segments.push(current);
      current = { sender: m[2].trim(), body: m[3].trim(), sentAt: m[1].trim() };
    } else if (current && line.trim()) {
      current.body += "\n" + line.trim();
    }
  }
  if (current) segments.push(current);
  return segments;
}

function normaliseWeChat(raw: string): ChatSegment[] {
  const segments: ChatSegment[] = [];
  const lines = raw.split("\n").filter(l => l.trim());
  const headerRe = /^(.+?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)\s*$/;
  let i = 0;
  while (i < lines.length) {
    const hm = lines[i].match(headerRe);
    if (hm && i + 1 < lines.length) {
      segments.push({ sender: hm[1].trim(), body: lines[i + 1].trim(), sentAt: hm[2].trim() });
      i += 2;
    } else {
      const colonMatch = lines[i].match(/^([^:]{1,40}):\s*(.+)$/);
      if (colonMatch) {
        segments.push({ sender: colonMatch[1].trim(), body: colonMatch[2].trim() });
      } else if (segments.length > 0) {
        segments[segments.length - 1].body += "\n" + lines[i].trim();
      } else {
        segments.push({ sender: "Unknown", body: lines[i].trim() });
      }
      i++;
    }
  }
  return segments;
}

function normaliseIMessage(raw: string): ChatSegment[] {
  const fwdMatch = raw.match(/begin forwarded message[:\s]*\n+([\s\S]+)/i);
  if (fwdMatch) {
    const inner = fwdMatch[1];
    const fromLine = inner.match(/^From:\s*(.+?)(?:\n|$)/im);
    const sender = fromLine ? fromLine[1].replace(/<[^>]+>/g, "").trim() : "Unknown";
    const bodyMatch = inner.match(/\n\n([\s\S]+)$/);
    const body = bodyMatch ? bodyMatch[1].trim() : inner.trim();
    return [{ sender, body }];
  }
  const fwdPrefixMatch = raw.match(/^FWD?:\s*/im);
  if (fwdPrefixMatch) {
    return [{ sender: "Unknown", body: raw.replace(/^FWD?:\s*/im, "").trim() }];
  }
  return [{ sender: "Unknown", body: raw.trim() }];
}

function normaliseGeneric(raw: string, senderHint?: string): ChatSegment[] {
  const lines = raw.split("\n").filter(l => l.trim());
  const colonLineCount = lines.filter(l => /^[A-Za-z][^:\n]{0,30}:\s+\S/.test(l)).length;
  if (colonLineCount >= 2) {
    const segments: ChatSegment[] = [];
    for (const line of lines) {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (m) {
        segments.push({ sender: m[1].trim(), body: m[2].trim() });
      } else if (segments.length > 0) {
        segments[segments.length - 1].body += "\n" + line.trim();
      }
    }
    if (segments.length > 0) return segments;
  }
  return [{ sender: senderHint ?? "Unknown", body: raw.trim() }];
}

export function normaliseChat(rawText: string, channel: string, senderHint?: string): NormalisedChat {
  const text = rawText.trim();
  let segments: ChatSegment[] = [];

  if (channel === "whatsapp") {
    segments = normaliseWhatsApp(text);
  } else if (channel === "wechat") {
    segments = normaliseWeChat(text);
  } else if (channel === "imessage") {
    segments = normaliseIMessage(text);
  } else {
    segments = normaliseGeneric(text, senderHint);
  }

  if (segments.length === 0) {
    segments = [{ sender: senderHint ?? "Unknown", body: text }];
  }

  const primarySender = guessNonMeSender(segments, senderHint);
  const fullText = segments.map(s => `[${s.sender}]: ${s.body}`).join("\n\n");

  return { segments, primarySender, fullText };
}
