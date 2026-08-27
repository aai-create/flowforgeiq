import { createHash } from "node:crypto";

export const INBOUND_NORMALIZATION_VERSION = "inbound-v1";

export type InboundSuppressionReason =
  | "auto_reply"
  | "no_action_notification"
  | "quoted_history_only";

export interface InboundTriage {
  normalizedBody: string;
  normalizationVersion: typeof INBOUND_NORMALIZATION_VERSION;
  suppressionReason: InboundSuppressionReason | null;
}

type ShipmentReference = {
  id: number;
  poNumber: string;
  product: string;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Retains the original body separately, while removing only high-confidence
 * reply-history and signature delimiters from the derived routing input.
 */
export function triageInboundEmail(subject: string, rawBody: string): InboundTriage {
  const lines: string[] = [];
  for (const line of rawBody.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (
      /^on .+wrote:$/i.test(trimmed) ||
      /^-{2,}\s*(original message|forwarded message)\s*-*$/i.test(trimmed) ||
      /^--\s*$/.test(trimmed) ||
      /^sent from my /i.test(trimmed)
    ) {
      break;
    }
    if (!trimmed.startsWith(">")) lines.push(line);
  }

  const normalizedBody = collapseWhitespace(lines.join("\n"));
  const normalSubject = collapseWhitespace(subject).toLowerCase();
  const combined = `${normalSubject}\n${normalizedBody}`.toLowerCase();

  const suppressionReason: InboundSuppressionReason | null =
    /^(automatic reply|auto(?:matic)?\s*(reply|response)|out of office|ooo)\b/i.test(normalSubject)
      ? "auto_reply"
      : /^(delivery status notification|undeliverable|failure notice|mail delivery failed)\b/i.test(normalSubject)
        ? "no_action_notification"
        : !normalizedBody && rawBody.trim()
          ? "quoted_history_only"
          : /\b(this is an automatically generated (message|email)|do not reply)\b/i.test(combined) &&
              /\b(delivery|unsubscribe|password reset|newsletter)\b/i.test(combined)
            ? "no_action_notification"
            : null;

  return { normalizedBody, normalizationVersion: INBOUND_NORMALIZATION_VERSION, suppressionReason };
}

export function canonicalProviderMessageId(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^<+|>+$/g, "").trim().toLowerCase();
  return normalized || null;
}

/**
 * A provider ID is authoritative. Without one, an exact normalized delivery
 * is coalesced for the same org for 24 hours. This intentionally favors
 * retry-safety over retaining identical no-ID notices during that window.
 */
export function emailInboundEventKey(input: {
  providerMessageId: string | null;
  from: string;
  recipient: string;
  subject: string;
  normalizedBody: string;
  receivedAt: Date;
}): string {
  const providerId = canonicalProviderMessageId(input.providerMessageId);
  if (providerId) return `email:provider:${providerId}`;

  const day = input.receivedAt.toISOString().slice(0, 10);
  return `email:fallback:${digest([
    input.from.trim().toLowerCase(),
    input.recipient.trim().toLowerCase(),
    collapseWhitespace(input.subject).toLowerCase(),
    input.normalizedBody,
    day,
  ].join("\u001f"))}`;
}

/**
 * Mobile channels do not expose a provider event ID. Exact same normalized
 * sender/content captured by the same user in the same five-minute bucket is
 * one event; the bucket permits legitimate repeat messages later.
 */
export function captureInboundEventKey(input: {
  userId: string;
  channel: string;
  sender: string;
  normalizedBody: string;
  receivedAt: Date;
}): string {
  const bucket = Math.floor(input.receivedAt.getTime() / (5 * 60 * 1000));
  return `capture:fallback:${digest([
    input.userId,
    input.channel.trim().toLowerCase(),
    collapseWhitespace(input.sender).toLowerCase(),
    input.normalizedBody,
    String(bucket),
  ].join("\u001f"))}`;
}

export function deterministicShipmentMatch(
  subject: string,
  body: string,
  candidates: ShipmentReference[],
): number | null {
  const raw = `${subject} ${body}`.toLowerCase();
  const stripped = raw.replace(/[^a-z0-9]/g, "");
  const hits = candidates.filter((shipment) => {
    const po = shipment.poNumber.toLowerCase();
    if (raw.includes(po)) return true;
    const poAlpha = po.replace(/[^a-z0-9]/g, "");
    if (poAlpha.length >= 4 && stripped.includes(poAlpha)) return true;

    const product = shipment.product.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    return product.length >= 6 && raw.includes(product);
  });
  return hits.length === 1 ? hits[0]!.id : null;
}