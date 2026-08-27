import { Router, type IRouter } from "express";
import { db, teamUsersTable, teamInvitationsTable, organizationsTable, legalAcceptancesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin, requireClerkAuth } from "../middlewares/requireAuth";
import { parseOrgIdCookie, setOrgIdCookie } from "../lib/orgCookie";
import { clerkClient } from "@clerk/express";
import crypto from "node:crypto";
import * as postmark from "postmark";
import { resolveBaseUrl } from "../lib/resolveBaseUrl";
import {
  createTestBuyerSessionValue,
  createTestBuyerWorkspace,
  TEST_BUYER_SESSION_COOKIE,
  TEST_BUYER_SESSION_MAX_AGE_SECONDS,
  testBuyerSessionCookieOptions,
  testBuyerSessionEnabled,
} from "../lib/testBuyerWorkspace";

function generateInboundToken(): string {
  return crypto.randomBytes(8).toString("hex");
}

/** Derive a clean handle from a display name: lowercase, spaces→dots, strip non-alphanumeric except dots/hyphens, max 30 chars */
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.\-]/g, "")
    .slice(0, 30)
    || "user";
}

/** Find a unique inbound_handle, appending 2/3/… if the base slug is taken */
async function generateUniqueHandle(name: string): Promise<string> {
  const base = slugifyName(name);
  let candidate = base;
  for (let suffix = 2; suffix <= 100; suffix++) {
    const [existing] = await db
      .select({ h: teamUsersTable.inboundHandle })
      .from(teamUsersTable)
      .where(eq(teamUsersTable.inboundHandle, candidate));
    if (!existing) return candidate;
    candidate = `${base}${suffix}`;
  }
  // Extremely unlikely: fall back to a random suffix rather than looping forever.
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

const router: IRouter = Router();
export const PRIVACY_POLICY_VERSION = "2026-08-25-v1";
export const TERMS_OF_SERVICE_VERSION = "2026-08-25-v1";

router.post("/team/legal-acceptance", requireClerkAuth, async (req, res) => {
  const body = req.body as { privacyAccepted?: boolean; termsAccepted?: boolean };
  if (body.privacyAccepted !== true || body.termsAccepted !== true) {
    res.status(400).json({ error: "Both policies must be acknowledged." });
    return;
  }
  try {
    const [acceptance] = await db
      .insert(legalAcceptancesTable)
      .values({
        clerkUserId: req.userId!,
        privacyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        acceptedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: legalAcceptancesTable.clerkUserId,
        set: {
          privacyVersion: PRIVACY_POLICY_VERSION,
          termsVersion: TERMS_OF_SERVICE_VERSION,
          acceptedAt: new Date(),
        },
      })
      .returning();
    res.json({ acceptance });
  } catch (err) {
    req.log.error({ err }, "legal acknowledgement persistence failed");
    res.status(500).json({ error: "Could not save policy acknowledgement. Please try again." });
  }
});

/**
 * Test-only bootstrap for browser checks. It creates an isolated copy of the
 * seeded buyer RFQ data for this Clerk identity and binds the org to a signed
 * HttpOnly cookie. This route is deliberately absent from production behavior.
 */
router.post("/team/test-buyer-session", requireClerkAuth, async (req, res) => {
  if (!testBuyerSessionEnabled()) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const workspace = await createTestBuyerWorkspace(req.userId!);
    const cookieValue = createTestBuyerSessionValue(req.userId!, workspace.id);
    if (!cookieValue) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.cookie(TEST_BUYER_SESSION_COOKIE, cookieValue, testBuyerSessionCookieOptions());
    res.json({
      testOnly: true,
      org: workspace,
      expiresInSeconds: TEST_BUYER_SESSION_MAX_AGE_SECONDS,
    });
  } catch (err) {
    req.log.error({ err }, "test buyer workspace unavailable");
    res.status(503).json({ error: "Seeded buyer workspace is not available yet" });
  }
});

router.get("/org", requireAuth, async (req, res) => {
  const [org] = await db
    .select({ id: organizationsTable.id, name: organizationsTable.name, slug: organizationsTable.slug, visibilityMode: organizationsTable.visibilityMode })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, req.orgId));
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  res.json(org);
});

router.get("/team", requireAuth, async (req, res) => {
  const members = await db.select().from(teamUsersTable).where(eq(teamUsersTable.orgId, req.orgId));
  const rawPending = await db
    .select()
    .from(teamInvitationsTable)
    .where(eq(teamInvitationsTable.orgId, req.orgId))
    .then(rows => rows.filter(r => !r.acceptedAt));

  const baseUrl = resolveBaseUrl();
  const pendingInvitations = rawPending.map(inv => ({
    ...inv,
    inviteUrl: `${baseUrl}/accept-invite?token=${inv.token}`,
  }));

  res.json({ members, pendingInvitations });
});

router.post("/team/invite", requireAdmin, async (req, res) => {
  const { email, role = "member" } = req.body as { email?: string; role?: string };
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const validRole = role === "admin" ? "admin" : role === "manager" ? "manager" : "member";
  const token = crypto.randomBytes(24).toString("hex");
  const [inv] = await db
    .insert(teamInvitationsTable)
    .values({ email, role: validRole, token, invitedBy: req.userId!, orgId: req.orgId })
    .returning();
  const baseUrl = resolveBaseUrl();
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  let emailSent = false;
  if (postmarkToken) {
    try {
      const client = new postmark.ServerClient(postmarkToken);
      await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL ?? "abid@tirasoftware.com",
        To: email,
        Subject: "You've been invited to join FlowForge",
        TextBody: [
          `You've been invited to join FlowForge as a ${validRole}.`,
          "",
          "Click the link below to accept your invitation:",
          inviteUrl,
          "",
          "If you weren't expecting this invitation, you can safely ignore this email.",
        ].join("\n"),
        HtmlBody: [
          `<p>You've been invited to join <strong>FlowForge</strong> as a <strong>${validRole}</strong>.</p>`,
          `<p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>`,
          `<p>Or copy this link into your browser:<br><a href="${inviteUrl}">${inviteUrl}</a></p>`,
          `<p style="color:#6b7280;font-size:12px;">If you weren't expecting this invitation, you can safely ignore this email.</p>`,
        ].join("\n"),
        MessageStream: "outbound",
      });
      emailSent = true;
    } catch (err) {
      req.log.warn({ err, email }, "Failed to send invite email via Postmark");
    }
  } else {
    req.log.warn("POSTMARK_SERVER_TOKEN not set — invite email not sent");
  }

  res.status(201).json({ invitation: inv, inviteUrl, emailSent });
});

router.delete("/team/:userId", requireAdmin, async (req, res) => {
  const targetId = String(req.params.userId ?? "");
  if (targetId === req.userId) {
    res.status(400).json({ error: "Cannot remove yourself" });
    return;
  }
  await db.delete(teamUsersTable).where(and(eq(teamUsersTable.clerkUserId, targetId), eq(teamUsersTable.orgId, req.orgId)));
  res.status(204).send();
});

router.delete("/team/invitations/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(teamInvitationsTable).where(and(eq(teamInvitationsTable.id, id), eq(teamInvitationsTable.orgId, req.orgId)));
  res.status(204).send();
});

router.post("/team/invitations/:id/resend", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [inv] = await db
    .select()
    .from(teamInvitationsTable)
    .where(and(eq(teamInvitationsTable.id, id), eq(teamInvitationsTable.orgId, req.orgId)));

  if (!inv) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  if (inv.acceptedAt) {
    res.status(409).json({ error: "Invitation already accepted" });
    return;
  }

  const newToken = crypto.randomBytes(24).toString("hex");
  const [updated] = await db
    .update(teamInvitationsTable)
    .set({ token: newToken, createdAt: new Date() })
    .where(eq(teamInvitationsTable.id, id))
    .returning();

  const baseUrl = resolveBaseUrl();
  const inviteUrl = `${baseUrl}/accept-invite?token=${newToken}`;

  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  let emailSent = false;
  if (postmarkToken) {
    try {
      const client = new postmark.ServerClient(postmarkToken);
      await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL ?? "abid@tirasoftware.com",
        To: inv.email,
        Subject: "Your FlowForge invitation has been refreshed",
        TextBody: [
          `Your invitation to join FlowForge as a ${inv.role} has been refreshed.`,
          "",
          "Click the link below to accept your invitation:",
          inviteUrl,
          "",
          "If you weren't expecting this invitation, you can safely ignore this email.",
        ].join("\n"),
        HtmlBody: [
          `<p>Your invitation to join <strong>FlowForge</strong> as a <strong>${inv.role}</strong> has been refreshed.</p>`,
          `<p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>`,
          `<p>Or copy this link into your browser:<br><a href="${inviteUrl}">${inviteUrl}</a></p>`,
          `<p style="color:#6b7280;font-size:12px;">If you weren't expecting this invitation, you can safely ignore this email.</p>`,
        ].join("\n"),
        MessageStream: "outbound",
      });
      emailSent = true;
    } catch (err) {
      req.log.warn({ err, email: inv.email }, "Failed to resend invite email via Postmark");
    }
  } else {
    req.log.warn("POSTMARK_SERVER_TOKEN not set — resend invite email not sent");
  }

  res.json({ invitation: updated, inviteUrl, emailSent });
});

router.get("/team/invite-peek", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }
  const [inv] = await db
    .select({ email: teamInvitationsTable.email, acceptedAt: teamInvitationsTable.acceptedAt })
    .from(teamInvitationsTable)
    .where(eq(teamInvitationsTable.token, token));

  if (!inv || inv.acceptedAt) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }

  const [localPart, domain] = inv.email.split("@");
  const masked =
    localPart && domain
      ? `${localPart.charAt(0)}***@${domain}`
      : "***";

  res.json({ maskedEmail: masked });
});

router.post("/team/accept-invite", requireClerkAuth, async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }
  const [inv] = await db
    .select()
    .from(teamInvitationsTable)
    .where(eq(teamInvitationsTable.token, token));

  if (!inv) {
    res.status(404).json({ error: "Invitation not found." });
    return;
  }
  if (inv.acceptedAt) {
    res.status(409).json({ error: "ALREADY_ACCEPTED" });
    return;
  }
  const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - inv.createdAt.getTime() > INVITE_TTL_MS) {
    res.status(410).json({ error: "EXPIRED" });
    return;
  }

  // Verify the signed-in Clerk user owns an email address that matches the invitation.
  // This must happen before marking acceptedAt so a wrong-account attempt cannot
  // consume the invite and deny access to the intended recipient.
  let clerkUserEmails: string[] = [];
  try {
    const clerkUser = await clerkClient.users.getUser(req.userId!);
    clerkUserEmails = clerkUser.emailAddresses.map(e => e.emailAddress.toLowerCase());
  } catch {
    res.status(500).json({ error: "Could not verify account email. Please try again." });
    return;
  }

  if (!clerkUserEmails.includes(inv.email.toLowerCase())) {
    res.status(403).json({ error: "This invitation was sent to a different email address." });
    return;
  }

  const [acceptance] = await db
    .select()
    .from(legalAcceptancesTable)
    .where(eq(legalAcceptancesTable.clerkUserId, req.userId!));
  if (!acceptance || acceptance.privacyVersion !== PRIVACY_POLICY_VERSION || acceptance.termsVersion !== TERMS_OF_SERVICE_VERSION) {
    res.status(428).json({ error: "LEGAL_ACKNOWLEDGEMENT_REQUIRED" });
    return;
  }

  // Membership is per (clerkUserId, orgId): a user already provisioned in another
  // org still needs a NEW row for the invitation's org (multi-org support).
  // Create/verify the membership BEFORE consuming the invitation so a failed
  // insert doesn't burn the token.
  const existingInOrg = await db
    .select()
    .from(teamUsersTable)
    .where(and(eq(teamUsersTable.clerkUserId, req.userId!), eq(teamUsersTable.orgId, inv.orgId)));

  if (existingInOrg.length === 0) {
    const anyExisting = await db
      .select()
      .from(teamUsersTable)
      .where(eq(teamUsersTable.clerkUserId, req.userId!));
    const clerkEmail = inv.email;
    const clerkName = anyExisting[0]?.name ?? clerkEmail.split("@")[0] ?? "Team Member";
    const handle = await generateUniqueHandle(clerkName);
    // Use onConflictDoNothing so Postgres resolves the conflict against whatever
    // constraint exists (single-column PK or composite PK) without needing an
    // explicit target. After the attempt we re-query to confirm the row exists.
    try {
      await db.insert(teamUsersTable).values({
        clerkUserId: req.userId!,
        email: clerkEmail,
        name: clerkName,
        role: inv.role,
        inboundToken: generateInboundToken(),
        inboundHandle: handle,
        orgId: inv.orgId,
      }).onConflictDoNothing();
    } catch (err) {
      req.log.error({ err }, "team_users insert failed during accept-invite");
      res.status(500).json({ error: "Could not join org, please contact support." });
      return;
    }

    // Confirm the row actually exists (insert may have been a no-op for some constraint).
    const [inserted] = await db
      .select()
      .from(teamUsersTable)
      .where(and(eq(teamUsersTable.clerkUserId, req.userId!), eq(teamUsersTable.orgId, inv.orgId)));
    if (!inserted) {
      req.log.error({ userId: req.userId, orgId: inv.orgId }, "team_users row missing after insert attempt");
      res.status(500).json({ error: "Could not join org, please contact support." });
      return;
    }
  } else if (!existingInOrg[0]!.inboundHandle) {
    const handle = await generateUniqueHandle(existingInOrg[0]!.name);
    await db
      .update(teamUsersTable)
      .set({ inboundHandle: handle })
      .where(and(eq(teamUsersTable.clerkUserId, req.userId!), eq(teamUsersTable.orgId, inv.orgId)));
  }

  await db
    .update(teamInvitationsTable)
    .set({ acceptedAt: new Date() })
    .where(eq(teamInvitationsTable.id, inv.id));

  // Point the org-selection cookie at the newly joined org so the user lands there.
  setOrgIdCookie(res, inv.orgId);

  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(and(eq(teamUsersTable.clerkUserId, req.userId!), eq(teamUsersTable.orgId, inv.orgId)));

  res.json({ user });
});

router.post("/team/provision-self", requireClerkAuth, async (req, res) => {
  const { name, email } = req.body as { name?: string; email?: string };
  const existing = await db
    .select()
    .from(teamUsersTable)
    .where(eq(teamUsersTable.clerkUserId, req.userId!));

  if (existing.length > 0) {
    const existingUser = existing[0]!;
    const updates: Record<string, unknown> = {};

    if (!existingUser.inboundToken) {
      updates.inboundToken = generateInboundToken();
    }
    if (!existingUser.inboundHandle) {
      updates.inboundHandle = await generateUniqueHandle(existingUser.name);
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(teamUsersTable)
        .set(updates)
        .where(eq(teamUsersTable.clerkUserId, req.userId!));
      const [updated] = await db
        .select()
        .from(teamUsersTable)
        .where(eq(teamUsersTable.clerkUserId, req.userId!));
      res.json({ user: updated });
      return;
    }
    res.json({ user: existingUser });
    return;
  }

  // If the caller supplies an email that already belongs to a team member, this is
  // a Clerk dev→prod environment switch (same Gmail, different Clerk user ID).
  // Re-bind the existing row to the new Clerk user ID so the user can sign in.
  if (email) {
    const [byEmail] = await db
      .select()
      .from(teamUsersTable)
      .where(eq(teamUsersTable.email, email));

    if (byEmail) {
      const updates: Record<string, unknown> = {
        clerkUserId: req.userId!,
      };
      if (!byEmail.inboundToken) updates.inboundToken = generateInboundToken();
      if (!byEmail.inboundHandle) updates.inboundHandle = await generateUniqueHandle(byEmail.name);

      await db
        .update(teamUsersTable)
        .set(updates)
        .where(eq(teamUsersTable.clerkUserId, byEmail.clerkUserId));

      const [updated] = await db
        .select()
        .from(teamUsersTable)
        .where(eq(teamUsersTable.clerkUserId, req.userId!));
      res.json({ user: updated });
      return;
    }
  }

  // Only allow self-provisioning when the organization has no members yet
  // (first-user bootstrap). All subsequent accounts must join via an invitation.
  const allMembers = await db.select().from(teamUsersTable).where(eq(teamUsersTable.orgId, 1));
  if (allMembers.length > 0) {
    res.status(403).json({ error: "Access restricted. Please use an invitation link to join this workspace." });
    return;
  }

  const displayName = name || email?.split("@")[0] || "Team Member";
  const handle = await generateUniqueHandle(displayName);

  const [user] = await db
    .insert(teamUsersTable)
    .values({
      clerkUserId: req.userId!,
      email: email || `user-${req.userId}@flowforge.local`,
      name: displayName,
      role: "admin",
      inboundToken: generateInboundToken(),
      inboundHandle: handle,
      orgId: 1,
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    const [existing2] = await db
      .select()
      .from(teamUsersTable)
      .where(eq(teamUsersTable.clerkUserId, req.userId!));
    res.json({ user: existing2 });
    return;
  }

  res.status(201).json({ user });
});

// ─── Org selection ───────────────────────────────────────────────────────────
// Lists the orgs the authenticated Clerk user belongs to. Only requires a valid
// Clerk JWT (no provisioning / org selection yet), so it works right after sign-in.
router.get("/team/my-orgs", requireClerkAuth, async (req, res) => {
  const rows = await db
    .select({
      orgId: teamUsersTable.orgId,
      orgName: organizationsTable.name,
      role: teamUsersTable.role,
    })
    .from(teamUsersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, teamUsersTable.orgId))
    .where(eq(teamUsersTable.clerkUserId, req.userId!));

  // Report which org the current ff-org-id cookie selects, if it's valid for
  // this user (the cookie is HttpOnly so the client can't read it directly).
  const cookieOrgId = parseOrgIdCookie(req.headers.cookie);
  const selectedOrgId =
    cookieOrgId !== null && rows.some(r => r.orgId === cookieOrgId) ? cookieOrgId : null;

  res.json({ orgs: rows, selectedOrgId });
});

// Persists the chosen org in a short-lived HttpOnly cookie after verifying the
// user actually belongs to it. Requires only a Clerk JWT.
router.post("/team/select-org", requireClerkAuth, async (req, res) => {
  const { orgId } = req.body as { orgId?: unknown };
  if (typeof orgId !== "number" || !Number.isInteger(orgId) || orgId < 1) {
    res.status(400).json({ error: "orgId must be a positive integer" });
    return;
  }
  const [membership] = await db
    .select({ orgId: teamUsersTable.orgId })
    .from(teamUsersTable)
    .where(and(eq(teamUsersTable.clerkUserId, req.userId!), eq(teamUsersTable.orgId, orgId)));
  if (!membership) {
    res.status(403).json({ error: "You are not a member of that organization" });
    return;
  }
  setOrgIdCookie(res, orgId);
  res.json({ ok: true });
});

router.get("/team/me", requireAuth, async (req, res) => {
  // Scope to the active org so multi-org users get the membership/role for
  // the workspace they selected, not an arbitrary row.
  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(and(eq(teamUsersTable.clerkUserId, req.userId!), eq(teamUsersTable.orgId, req.orgId)));
  if (!user) {
    res.status(404).json({ error: "Not provisioned" });
    return;
  }
  res.json({ user });
});

export default router;
