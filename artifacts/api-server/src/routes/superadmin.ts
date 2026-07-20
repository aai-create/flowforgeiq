import { Router, type IRouter } from "express";
import { db, teamUsersTable, teamInvitationsTable, organizationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireSuperAdmin } from "../middlewares/requireAuth";
import crypto from "node:crypto";
import * as postmark from "postmark";
import { resolveBaseUrl } from "../lib/resolveBaseUrl";

function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50) || "org";
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (true) {
    const [existing] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, candidate));
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
}

const router: IRouter = Router();

router.get("/superadmin/orgs", requireSuperAdmin, async (req, res) => {
  const orgs = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      slug: organizationsTable.slug,
      createdAt: organizationsTable.createdAt,
      memberCount: sql<number>`cast(count(${teamUsersTable.clerkUserId}) as int)`,
    })
    .from(organizationsTable)
    .leftJoin(teamUsersTable, eq(teamUsersTable.orgId, organizationsTable.id))
    .groupBy(organizationsTable.id)
    .orderBy(organizationsTable.id);

  res.json({ orgs });
});

router.post("/superadmin/orgs", requireSuperAdmin, async (req, res) => {
  const { name, slug: rawSlug } = req.body as { name?: string; slug?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: "Organization name is required" });
    return;
  }
  const baseSlug = rawSlug?.trim() ? slugifyOrgName(rawSlug.trim()) : slugifyOrgName(name.trim());
  const slug = await ensureUniqueSlug(baseSlug);

  const [org] = await db
    .insert(organizationsTable)
    .values({ name: name.trim(), slug })
    .returning();

  res.status(201).json({ org });
});

router.post("/superadmin/orgs/:id/invite-admin", requireSuperAdmin, async (req, res) => {
  const orgId = Number(req.params.id);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "Invalid org id" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const { email } = req.body as { email?: string };
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const [inv] = await db
    .insert(teamInvitationsTable)
    .values({
      email: email.trim(),
      role: "admin",
      token,
      invitedBy: req.superAdminEmail ?? "superadmin",
      orgId,
    })
    .returning();

  const baseUrl = resolveBaseUrl();
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
  let emailSent = false;
  if (postmarkToken) {
    try {
      const client = new postmark.ServerClient(postmarkToken);
      await client.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL ?? "noreply@flowforgeiq.com",
        To: email.trim(),
        Subject: `You've been invited to join ${org.name} on FlowForge`,
        TextBody: [
          `You've been invited to join ${org.name} on FlowForge as an admin.`,
          "",
          "Click the link below to accept your invitation:",
          inviteUrl,
          "",
          "If you weren't expecting this invitation, you can safely ignore this email.",
        ].join("\n"),
        HtmlBody: [
          `<p>You've been invited to join <strong>${org.name}</strong> on <strong>FlowForge</strong> as an <strong>admin</strong>.</p>`,
          `<p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>`,
          `<p>Or copy this link into your browser:<br><a href="${inviteUrl}">${inviteUrl}</a></p>`,
          `<p style="color:#6b7280;font-size:12px;">If you weren't expecting this invitation, you can safely ignore this email.</p>`,
        ].join("\n"),
        MessageStream: "outbound",
      });
      emailSent = true;
    } catch (err) {
      req.log.warn({ err, email }, "Failed to send superadmin invite email via Postmark");
    }
  } else {
    req.log.warn("POSTMARK_SERVER_TOKEN not set — superadmin invite email not sent");
  }

  res.status(201).json({ invitation: inv, inviteUrl, emailSent });
});

export default router;
