import { Router, type IRouter } from "express";
import { db, poNumberingConfigTable, teamUsersTable, messagesTable, deviceTokensTable } from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { getAuth } from "@clerk/express";
import { randomBytes, createHash } from "crypto";
import { resolveOrgId, requireAuth, requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getConfig(orgId = 1) {
  const [cfg] = await db.select().from(poNumberingConfigTable).where(eq(poNumberingConfigTable.orgId, orgId)).limit(1);
  if (cfg) return cfg;
  const [inserted] = await db
    .insert(poNumberingConfigTable)
    .values({ prefix: "PO-", sequenceFormat: "{seq}", supplierSuffix: "S", nextSeq: 1, orgId })
    .returning();
  return inserted!;
}

function buildPoNumber(prefix: string, format: string, seq: number): string {
  return prefix + format.replace("{seq}", String(seq).padStart(4, "0"));
}

function makePreview(cfg: { prefix: string; sequenceFormat: string; supplierSuffix: string; nextSeq: number }) {
  const buyerPo = buildPoNumber(cfg.prefix, cfg.sequenceFormat, cfg.nextSeq);
  const supplierPo = buyerPo + cfg.supplierSuffix;
  return { buyerPo, supplierPo };
}

const HANDLE_RE = /^[a-z0-9][a-z0-9.\-]{1,38}[a-z0-9]$|^[a-z0-9]{3,40}$/;

function buildAddress(localPart: string, domain: string, handle: string | null | undefined, token: string | null | undefined): string {
  const plus = handle || token;
  if (plus && localPart && domain) return `${localPart}+${plus}@${domain}`;
  return `${localPart}@${domain}`;
}

router.get("/settings/inbound-health", requireAuth, async (req, res) => {
  const orgId = await resolveOrgId(req);
  const base = process.env.INBOUND_EMAIL_BASE ?? "iq@flowforgeiq.com";
  const [localPart, domain] = base.split("@") as [string, string];

  let inboundEmailAddress = base;
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (userId) {
      const [teamUser] = await db
        .select({ inboundHandle: teamUsersTable.inboundHandle, inboundToken: teamUsersTable.inboundToken })
        .from(teamUsersTable)
        .where(eq(teamUsersTable.clerkUserId, userId));
      inboundEmailAddress = buildAddress(localPart, domain, teamUser?.inboundHandle, teamUser?.inboundToken);
    }
  } catch {
    // fall back to base address
  }

  const configured = domain.toLowerCase().includes("inbound.");

  const [lastMsg] = await db
    .select({
      receivedAt: messagesTable.receivedAt,
      sender: messagesTable.sender,
      subject: messagesTable.subject,
    })
    .from(messagesTable)
    .where(and(eq(messagesTable.orgId, orgId), eq(messagesTable.channel, "email"), eq(messagesTable.direction, "inbound")))
    .orderBy(desc(messagesTable.receivedAt))
    .limit(1);

  let status: "healthy" | "stale" | "unknown";
  let hoursSinceLastReceived: number | null = null;
  let message: string;

  if (!lastMsg) {
    status = "unknown";
    message = "No inbound emails received yet. Send a test email to verify the pipeline is live.";
  } else {
    const ageMs = Date.now() - new Date(lastMsg.receivedAt).getTime();
    hoursSinceLastReceived = Math.round(ageMs / 3_600_000);
    if (ageMs < 7 * 24 * 3_600_000) {
      status = "healthy";
      message = `Last inbound email received ${hoursSinceLastReceived}h ago.`;
    } else {
      status = "stale";
      message = `Last inbound email received ${hoursSinceLastReceived}h ago — more than 7 days. Check DNS and Postmark settings.`;
    }
  }

  res.json({
    status,
    configured,
    inboundEmailAddress,
    lastReceivedAt: lastMsg ? new Date(lastMsg.receivedAt).toISOString() : null,
    lastReceivedFrom: lastMsg?.sender ?? null,
    lastReceivedSubject: lastMsg?.subject ?? null,
    hoursSinceLastReceived,
    message,
  });
});

router.get("/settings/inbound-email", async (req, res) => {
  const base = process.env.INBOUND_EMAIL_BASE ?? "iq@flowforgeiq.com";
  const [localPart, domain] = base.split("@") as [string, string];

  let inboundEmailAddress = base;
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (userId) {
      const [teamUser] = await db
        .select({ inboundHandle: teamUsersTable.inboundHandle, inboundToken: teamUsersTable.inboundToken })
        .from(teamUsersTable)
        .where(eq(teamUsersTable.clerkUserId, userId));
      inboundEmailAddress = buildAddress(localPart, domain, teamUser?.inboundHandle, teamUser?.inboundToken);
    }
  } catch {
    // fall back to base address if auth fails
  }

  res.json({ inboundEmailAddress });
});

const UpdateHandleBody = z.object({
  handle: z.string(),
});

router.put("/settings/inbound-email", requireAuth, async (req, res) => {
  let body: z.infer<typeof UpdateHandleBody>;
  try {
    body = UpdateHandleBody.parse(req.body);
  } catch {
    res.status(400).json({ error: "handle is required" });
    return;
  }

  const { handle } = body;
  const normalized = handle.toLowerCase().trim();

  if (normalized.length < 3 || normalized.length > 40) {
    res.status(400).json({ error: "Handle must be 3–40 characters" });
    return;
  }
  if (!HANDLE_RE.test(normalized)) {
    res.status(400).json({ error: "Handle may only contain lowercase letters, numbers, dots, and hyphens" });
    return;
  }

  // Check uniqueness (excluding current user)
  const [conflict] = await db
    .select({ clerkUserId: teamUsersTable.clerkUserId })
    .from(teamUsersTable)
    .where(eq(teamUsersTable.inboundHandle, normalized));

  if (conflict && conflict.clerkUserId !== req.userId) {
    res.status(409).json({ error: "That handle is already taken" });
    return;
  }

  await db
    .update(teamUsersTable)
    .set({ inboundHandle: normalized })
    .where(eq(teamUsersTable.clerkUserId, req.userId!));

  const base = process.env.INBOUND_EMAIL_BASE ?? "iq@flowforgeiq.com";
  const [localPart, domain] = base.split("@") as [string, string];
  const inboundEmailAddress = buildAddress(localPart, domain, normalized, null);
  res.json({ inboundEmailAddress });
});

router.get("/settings/po-numbering", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const cfg = await getConfig(orgId);
  res.json({ ...cfg, preview: makePreview(cfg) });
});

const UpdateBody = z.object({
  prefix:         z.string().optional(),
  sequenceFormat: z.string().optional(),
  supplierSuffix: z.string().optional(),
  resetSeq:       z.number().int().positive().optional(),
});

router.put("/settings/po-numbering", requireAdmin, async (req, res) => {
  const orgId = await resolveOrgId(req);
  const body = UpdateBody.parse(req.body);
  const cfg = await getConfig(orgId);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.prefix         !== undefined) patch.prefix         = body.prefix;
  if (body.sequenceFormat !== undefined) patch.sequenceFormat = body.sequenceFormat;
  if (body.supplierSuffix !== undefined) patch.supplierSuffix = body.supplierSuffix;
  if (body.resetSeq       !== undefined) patch.nextSeq        = body.resetSeq;
  await db.update(poNumberingConfigTable).set(patch).where(eq(poNumberingConfigTable.id, cfg.id));
  const updated = await getConfig(orgId);
  res.json({ ...updated, preview: makePreview(updated) });
});

router.get("/settings/po-numbering/next", async (req, res) => {
  const orgId = await resolveOrgId(req);
  const cfg = await getConfig(orgId);
  res.json(makePreview(cfg));
});

router.post("/settings/po-numbering/next", requireAdmin, async (req, res) => {
  const orgId = await resolveOrgId(req);
  const cfg = await getConfig(orgId);
  const [updated] = await db
    .update(poNumberingConfigTable)
    .set({ nextSeq: sql`${poNumberingConfigTable.nextSeq} + 1`, updatedAt: new Date() })
    .where(eq(poNumberingConfigTable.id, cfg.id))
    .returning();
  const consumedSeq = (updated?.nextSeq ?? cfg.nextSeq + 1) - 1;
  const preview = {
    buyerPo: buildPoNumber(cfg.prefix, cfg.sequenceFormat, consumedSeq),
    supplierPo: buildPoNumber(cfg.prefix, cfg.sequenceFormat, consumedSeq) + cfg.supplierSuffix,
  };
  res.json(preview);
});

// ─── Device token routes ──────────────────────────────────────────────────────

const CreateDeviceTokenBody = z.object({
  label: z.string().max(80).default(""),
});

router.get("/settings/device-tokens", requireAuth, async (req, res) => {
  const orgId = await resolveOrgId(req);
  const rows = await db
    .select({
      id: deviceTokensTable.id,
      label: deviceTokensTable.label,
      createdAt: deviceTokensTable.createdAt,
      lastUsedAt: deviceTokensTable.lastUsedAt,
    })
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.clerkUserId, req.userId!));
  res.json(rows);
});

router.post("/settings/device-tokens", requireAuth, async (req, res) => {
  const orgId = await resolveOrgId(req);
  let body: z.infer<typeof CreateDeviceTokenBody>;
  try {
    body = CreateDeviceTokenBody.parse(req.body);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const [inserted] = await db
    .insert(deviceTokensTable)
    .values({
      clerkUserId: req.userId!,
      orgId,
      tokenHash,
      label: body.label,
    })
    .returning({
      id: deviceTokensTable.id,
      label: deviceTokensTable.label,
      createdAt: deviceTokensTable.createdAt,
      lastUsedAt: deviceTokensTable.lastUsedAt,
    });

  req.log.info({ tokenId: inserted?.id }, "settings/device-tokens: created");

  res.status(201).json({
    id: inserted!.id,
    label: inserted!.label,
    createdAt: inserted!.createdAt,
    lastUsedAt: inserted!.lastUsedAt,
    token: rawToken,
  });
});

router.delete("/settings/device-tokens/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(deviceTokensTable)
    .where(
      and(
        eq(deviceTokensTable.id, id),
        eq(deviceTokensTable.clerkUserId, req.userId!),
      ),
    )
    .returning({ id: deviceTokensTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Token not found or does not belong to you" });
    return;
  }

  req.log.info({ tokenId: id }, "settings/device-tokens: revoked");
  res.status(204).end();
});

export { buildPoNumber, getConfig };
export default router;
