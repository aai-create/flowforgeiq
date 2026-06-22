import { Router, type IRouter } from "express";
import { db, gmailCredentialsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveOrgId } from "../middlewares/requireAuth";
import { z } from "zod/v4";
import { randomBytes, createHmac } from "crypto";

const router: IRouter = Router();

const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly";

function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}

function getGoogleClientSecret(): string | undefined {
  return process.env.GOOGLE_CLIENT_SECRET;
}

function getCallbackUrl(req: Parameters<typeof router.get>[1] extends (req: infer R, ...args: unknown[]) => void ? R : never): string {
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${host}/api/integrations/gmail/callback`;
}

router.get("/integrations/gmail/status", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const [cred] = await db.select().from(gmailCredentialsTable).where(eq(gmailCredentialsTable.orgId, orgId)).limit(1);
  if (!cred) {
    const clientConfigured = !!(getGoogleClientId() && getGoogleClientSecret());
    res.json({ connected: false, clientConfigured });
    return;
  }
  res.json({
    connected: true,
    gmailAddress: cred.gmailAddress,
    clientConfigured: !!(getGoogleClientId() && getGoogleClientSecret()),
  });
});

function signState(token: string, clientSecret: string): string {
  return createHmac("sha256", clientSecret).update(token).digest("hex");
}

router.get("/integrations/gmail/connect", async (req, res) => {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    res.status(400).json({ error: "Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    return;
  }
  const callbackUrl = getCallbackUrl(req as never);
  const orgId = await resolveOrgId(req);
  const stateToken = `${orgId}:${randomBytes(16).toString("hex")}`;
  const stateHmac = signState(stateToken, clientSecret);
  const state = `${stateToken}.${stateHmac}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  res.json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

router.get("/integrations/gmail/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;
  const state = req.query.state as string | undefined;

  if (error) {
    res.status(400).send(`OAuth error: ${error}`);
    return;
  }
  if (!code) {
    res.status(400).send("Missing authorization code");
    return;
  }

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    res.status(400).json({ error: "Google OAuth credentials not configured." });
    return;
  }

  if (!state) {
    res.status(400).send("Missing state parameter — possible CSRF attempt");
    return;
  }
  const dotIdx = state.lastIndexOf(".");
  if (dotIdx === -1) {
    res.status(400).send("Malformed state parameter");
    return;
  }
  const stateToken = state.slice(0, dotIdx);
  const providedHmac = state.slice(dotIdx + 1);
  const expectedHmac = signState(stateToken, clientSecret);
  if (providedHmac !== expectedHmac) {
    res.status(400).send("Invalid state parameter — possible CSRF attempt");
    return;
  }

  const callbackUrl = getCallbackUrl(req as never);

  // Extract the orgId that was embedded in the state token during the connect flow.
  // State format: "${orgId}:${randomHex}.${hmac}" — the colon separator is safe because
  // orgId is always a decimal integer and the random part is hex (no colons).
  const colonIdx = stateToken.indexOf(":");
  const callbackOrgId = colonIdx !== -1 ? (parseInt(stateToken.slice(0, colonIdx), 10) || 1) : 1;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      req.log.error({ status: tokenRes.status, body: errText }, "gmail-oauth: token exchange failed");
      res.status(500).send("Token exchange failed");
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = (await profileRes.json()) as { email?: string };
    const gmailAddress = profileData.email ?? "unknown@gmail.com";

    const tokenExpiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    const [existing] = await db.select().from(gmailCredentialsTable).where(eq(gmailCredentialsTable.orgId, callbackOrgId)).limit(1);
    if (existing) {
      await db.update(gmailCredentialsTable).set({
        gmailAddress,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? existing.refreshToken,
        tokenExpiry: tokenExpiry ?? undefined,
        updatedAt: new Date(),
      }).where(and(eq(gmailCredentialsTable.id, existing.id), eq(gmailCredentialsTable.orgId, callbackOrgId)));
    } else {
      await db.insert(gmailCredentialsTable).values({
        gmailAddress,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? "",
        tokenExpiry: tokenExpiry ?? undefined,
        orgId: callbackOrgId,
      });
    }

    req.log.info({ gmailAddress }, "gmail-oauth: connected successfully");

    res.send(`<html><body><script>window.close(); if(window.opener) { window.opener.postMessage({ type: 'gmail-connected', email: '${gmailAddress.replace(/'/g, "\\'")}' }, '*'); }</script><p>Gmail connected as ${gmailAddress}. You can close this window.</p></body></html>`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err: msg }, "gmail-oauth: callback error");
    res.status(500).send("OAuth callback failed: " + msg);
  }
});

router.post("/integrations/gmail/disconnect", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db.delete(gmailCredentialsTable).where(eq(gmailCredentialsTable.orgId, orgId)).returning();
  req.log.info({ deleted: rows.length }, "gmail-oauth: disconnected");
  res.json({ disconnected: true });
});

const TestEmailBody = z.object({
  to: z.string().optional(),
});

router.post("/integrations/gmail/test", async (req, res) => {
  const body = TestEmailBody.safeParse(req.body);
  const to = (body.success ? body.data.to : undefined) ?? "test@example.com";
  const orgId = await resolveOrgId(req);

  const [cred] = await db.select().from(gmailCredentialsTable).where(eq(gmailCredentialsTable.orgId, orgId)).limit(1);
  if (!cred) {
    res.status(400).json({ error: "Gmail not connected. Connect your account first." });
    return;
  }

  const accessToken = await getValidAccessToken(cred);
  if (!accessToken) {
    res.status(401).json({ error: "Gmail token expired and could not be refreshed." });
    return;
  }

  const raw = buildRawEmail({
    from: cred.gmailAddress,
    to,
    subject: "FlowForge test — email pipeline verification",
    body: "This is an automated test message from FlowForge to verify the Gmail send-as pipeline is working correctly.",
  });

  const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!gmailRes.ok) {
    const errText = await gmailRes.text();
    req.log.error({ status: gmailRes.status, body: errText }, "gmail-test: send failed");
    res.status(500).json({ error: "Gmail send failed", details: errText });
    return;
  }

  res.json({ sent: true, to, from: cred.gmailAddress });
});

export function buildRawEmail({
  from,
  to,
  subject,
  body,
  inReplyToMessageId,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyToMessageId?: string;
}): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
  ];
  if (inReplyToMessageId) {
    lines.push(`In-Reply-To: ${inReplyToMessageId}`);
    lines.push(`References: ${inReplyToMessageId}`);
  }
  lines.push("", body);
  const raw = lines.join("\r\n");
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getValidAccessToken(
  cred: { id: number; accessToken: string; refreshToken: string; tokenExpiry: Date | null }
): Promise<string | null> {
  const isExpired = cred.tokenExpiry ? cred.tokenExpiry.getTime() < Date.now() + 60_000 : false;
  if (!isExpired) return cred.accessToken;

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: cred.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const newExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;

    await db.update(gmailCredentialsTable).set({
      accessToken: data.access_token,
      tokenExpiry: newExpiry ?? undefined,
      updatedAt: new Date(),
    }).where(eq(gmailCredentialsTable.id, cred.id));

    return data.access_token;
  } catch {
    return null;
  }
}

export default router;
