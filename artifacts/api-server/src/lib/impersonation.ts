import crypto from "node:crypto";

function getImpersonationSecret(): string {
  const secret = process.env.SUPER_ADMIN_SECRET;
  if (secret) return secret;
  const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin";
  return crypto.createHash("sha256").update(email).digest("hex");
}

export function signImpersonationToken(payload: {
  orgId: number;
  orgName: string;
  orgSlug: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "FORGE-IMPERSONATE" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 8 * 3600 }),
  ).toString("base64url");
  const secret = getImpersonationSecret();
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyImpersonationToken(
  token: string,
): { orgId: number; orgName: string; orgSlug: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const secret = getImpersonationSecret();
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      orgId: number;
      orgName: string;
      orgSlug: string;
      exp: number;
    };
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.orgId !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}
