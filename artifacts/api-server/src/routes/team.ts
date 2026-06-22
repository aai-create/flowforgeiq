import { Router, type IRouter } from "express";
import { db, teamUsersTable, teamInvitationsTable, organizationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin, requireClerkAuth } from "../middlewares/requireAuth";
import crypto from "node:crypto";

function generateInboundToken(): string {
  return crypto.randomBytes(8).toString("hex");
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
  const pending = await db
    .select()
    .from(teamInvitationsTable)
    .where(eq(teamInvitationsTable.orgId, req.orgId))
    .then(rows => rows.filter(r => !r.acceptedAt));
  res.json({ members, pendingInvitations: pending });
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
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "";
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;
  res.status(201).json({ invitation: inv, inviteUrl });
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
    res.status(404).json({ error: "Invitation not found or already used" });
    return;
  }
  if (inv.acceptedAt) {
    res.status(409).json({ error: "Invitation already accepted" });
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
    await db.insert(teamUsersTable).values({
      clerkUserId: req.userId!,
      email: clerkEmail,
      name: clerkName,
      role: inv.role,
      inboundToken: generateInboundToken(),
      orgId: inv.orgId,
    });
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
    if (!existingUser.inboundToken) {
      await db
        .update(teamUsersTable)
        .set({ inboundToken: generateInboundToken() })
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

  const allMembers = await db.select().from(teamUsersTable).where(eq(teamUsersTable.orgId, 1));
  const isFirstUser = allMembers.length === 0;
  const role = isFirstUser ? "admin" : "member";

  const [user] = await db
    .insert(teamUsersTable)
    .values({
      clerkUserId: req.userId!,
      email: email || `user-${req.userId}@flowforge.local`,
      name: name || email?.split("@")[0] || "Team Member",
      role,
      inboundToken: generateInboundToken(),
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
