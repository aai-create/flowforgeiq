import { Router, type IRouter } from "express";
import { db, teamUsersTable, teamInvitationsTable, organizationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin, requireClerkAuth } from "../middlewares/requireAuth";
import { clerkClient } from "@clerk/express";
import crypto from "node:crypto";
import * as postmark from "postmark";

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
  let suffix = 2;
  while (true) {
    const [existing] = await db
      .select({ h: teamUsersTable.inboundHandle })
      .from(teamUsersTable)
      .where(eq(teamUsersTable.inboundHandle, candidate));
    if (!existing) return candidate;
    candidate = `${base}${suffix}`;
    suffix++;
  }
}

const router: IRouter = Router();

router.get("/org", requireAuth, async (req, res) => {
  const [org] = await db
    .select({ id: organizationsTable.id, name: organizationsTable.name, slug: organizationsTable.slug })
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

  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
    : process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "";
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
  const validRole = role === "admin" ? "admin" : "member";
  const token = crypto.randomBytes(24).toString("hex");
  const [inv] = await db
    .insert(teamInvitationsTable)
    .values({ email, role: validRole, token, invitedBy: req.userId!, orgId: req.orgId })
    .returning();
  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
    : process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "";
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  let emailSent = false;
  if (postmarkToken) {
    try {
      const client = new postmark.ServerClient(postmarkToken);
      await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL ?? "noreply@flowforgeiq.com",
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

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
      : "";
  const inviteUrl = `${baseUrl}/accept-invite?token=${newToken}`;

  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  let emailSent = false;
  if (postmarkToken) {
    try {
      const client = new postmark.ServerClient(postmarkToken);
      await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL ?? "noreply@flowforgeiq.com",
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

  await db
    .update(teamInvitationsTable)
    .set({ acceptedAt: new Date() })
    .where(eq(teamInvitationsTable.id, inv.id));

  const existing = await db
    .select()
    .from(teamUsersTable)
    .where(eq(teamUsersTable.clerkUserId, req.userId!));

  if (existing.length === 0) {
    const clerkEmail = inv.email;
    const clerkName = clerkEmail.split("@")[0] ?? "Team Member";
    const handle = await generateUniqueHandle(clerkName);
    await db.insert(teamUsersTable).values({
      clerkUserId: req.userId!,
      email: clerkEmail,
      name: clerkName,
      role: inv.role,
      inboundToken: generateInboundToken(),
      inboundHandle: handle,
      orgId: inv.orgId,
    });
  } else if (!existing[0]!.inboundHandle) {
    const handle = await generateUniqueHandle(existing[0]!.name);
    await db
      .update(teamUsersTable)
      .set({ inboundHandle: handle })
      .where(eq(teamUsersTable.clerkUserId, req.userId!));
  }

  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(eq(teamUsersTable.clerkUserId, req.userId!));

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

router.get("/team/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(teamUsersTable)
    .where(eq(teamUsersTable.clerkUserId, req.userId!));
  if (!user) {
    res.status(404).json({ error: "Not provisioned" });
    return;
  }
  res.json({ user });
});

export default router;
