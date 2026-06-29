/**
 * Derive the canonical base URL for invite links.
 *
 * Priority order:
 *  1. APP_URL — explicit override; trailing slash is stripped.
 *  2. REPLIT_DOMAINS — comma-separated list; first entry is used, prefixed with https://.
 *  3. REPLIT_DEV_DOMAIN — Replit development proxy domain, prefixed with https://.
 *  4. "" — fallback when none of the above is set (relative links won't include a host).
 */
export function resolveBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.APP_URL) {
    return env.APP_URL.replace(/\/$/, "");
  }
  if (env.REPLIT_DOMAINS) {
    const first = env.REPLIT_DOMAINS.split(",")[0]!.trim();
    return `https://${first}`;
  }
  if (env.REPLIT_DEV_DOMAIN) {
    return `https://${env.REPLIT_DEV_DOMAIN}`;
  }
  return "";
}
