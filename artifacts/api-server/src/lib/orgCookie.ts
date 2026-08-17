import type { Response } from "express";

export const ORG_COOKIE_NAME = "ff-org-id";

/** Parse the ff-org-id cookie from a raw Cookie header. Returns null if absent, non-numeric, or malformed. */
export function parseOrgIdCookie(rawCookie: string | undefined): number | null {
  if (!rawCookie) return null;
  for (const part of rawCookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== ORG_COOKIE_NAME) continue;
    let value = part.slice(idx + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return null; // malformed percent-encoding → treat as no cookie
    }
    if (/^\d+$/.test(value)) return Number(value);
    return null;
  }
  return null;
}

/** Set the HttpOnly org-selection cookie (30-day expiry). */
export function setOrgIdCookie(res: Response, orgId: number): void {
  res.cookie(ORG_COOKIE_NAME, String(orgId), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
