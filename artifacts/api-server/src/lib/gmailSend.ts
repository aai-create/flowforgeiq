/**
 * Shared Gmail send helper.
 * Used by both POST /messages/:id/send-reply (existing inline reply flow)
 * and POST /signal-inbox/:messageId/send (Signal Inbox dispatch).
 */

import { db, messagesTable, gmailCredentialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildRawEmail, getValidAccessToken } from "../routes/integrations";
import type { Logger } from "pino";

export interface GmailSendOptions {
  orgId: number;
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain-text body to send */
  body: string;
  /** Optional: inbound provider message ID for In-Reply-To / References threading */
  inReplyToMessageId?: string;
  /** Optional: Gmail threadId — when provided the reply is threaded into the existing conversation */
  threadId?: string;
  /** For logging — the source message ID */
  sourceMessageId?: number;
  /** For linking outbound row to shipment/supplier */
  shipmentId?: number | null;
  supplierId?: number | null;
}

export interface GmailSendResult {
  gmailMessageId: string;
  gmailThreadId: string;
  fromAddress: string;
  /** The inserted outbound messages row id */
  outboundMessageId: number;
}

export class GmailNotConnectedError extends Error {
  constructor(public readonly reason: "not_connected" | "token_expired") {
    super(
      reason === "not_connected"
        ? "Gmail not connected. Connect your Gmail account in Settings first."
        : "Gmail token expired and could not be refreshed. Reconnect Gmail in Settings.",
    );
    this.name = "GmailNotConnectedError";
  }
}

export class GmailSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Gmail send failed (HTTP ${status})`);
    this.name = "GmailSendError";
  }
}

export async function sendViaGmail(opts: GmailSendOptions, log: Logger): Promise<GmailSendResult> {
  const { orgId, to, subject, body, inReplyToMessageId, threadId, sourceMessageId, shipmentId, supplierId } = opts;

  const [cred] = await db
    .select()
    .from(gmailCredentialsTable)
    .where(eq(gmailCredentialsTable.orgId, orgId))
    .limit(1);

  if (!cred) {
    throw new GmailNotConnectedError("not_connected");
  }

  const accessToken = await getValidAccessToken(cred);
  if (!accessToken) {
    throw new GmailNotConnectedError("token_expired");
  }

  const raw = buildRawEmail({
    from: cred.gmailAddress,
    to,
    subject,
    body,
    inReplyToMessageId,
  });

  const apiBody: Record<string, unknown> = { raw };
  if (threadId) {
    apiBody.threadId = threadId;
  }

  const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(apiBody),
  });

  if (!gmailRes.ok) {
    const errText = await gmailRes.text();
    log.error({ status: gmailRes.status, sourceMessageId }, "gmailSend: Gmail API error");
    // Strip raw error body from public-facing errors but log it internally
    throw new GmailSendError(gmailRes.status, errText.slice(0, 200));
  }

  const gmailData = (await gmailRes.json()) as { id: string; threadId: string };

  const [outbound] = await db
    .insert(messagesTable)
    .values({
      shipmentId: shipmentId ?? null,
      supplierId: supplierId ?? null,
      sender: cred.gmailAddress,
      recipient: to,
      channel: "email",
      subject,
      direction: "outbound",
      snippet: body.slice(0, 200),
      fullBody: body,
      aiDraft: "",
      aiAction: "",
      aiTags: [],
      unread: false,
      isFlagged: false,
      routingStatus: "routed",
      signalStatus: "sent",
      receivedAt: new Date(),
      orgId,
    })
    .returning();

  log.info(
    { from: cred.gmailAddress, to, sourceMessageId, gmailMessageId: gmailData.id },
    "gmailSend: sent via Gmail",
  );

  return {
    gmailMessageId: gmailData.id,
    gmailThreadId: gmailData.threadId,
    fromAddress: cred.gmailAddress,
    outboundMessageId: outbound.id,
  };
}
