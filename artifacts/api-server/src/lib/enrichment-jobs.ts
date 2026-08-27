import { and, asc, eq, lte } from "drizzle-orm";
import { aiEnrichmentJobsTable, db, messagesTable } from "@workspace/db";
import { logger } from "./logger";
import { requireAiResult, runAi } from "./ai-gateway";
import { makeReviewDecision } from "./decision-review";

const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000];
let running = false;

export async function enqueueMessageEnrichment(orgId: number, messageId: number): Promise<void> {
  await db.insert(aiEnrichmentJobsTable).values({
    orgId, messageId, idempotencyKey: `message-enrichment:${messageId}`,
  }).onConflictDoNothing();
}

export async function processEnrichmentJobs(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const [job] = await db.select().from(aiEnrichmentJobsTable)
      .where(and(eq(aiEnrichmentJobsTable.status, "pending"), lte(aiEnrichmentJobsTable.runAt, new Date())))
      .orderBy(asc(aiEnrichmentJobsTable.runAt)).limit(1);
    if (!job) return;
    const [claimed] = await db.update(aiEnrichmentJobsTable).set({
      status: "processing", attempts: job.attempts + 1, lockedAt: new Date(),
    }).where(and(eq(aiEnrichmentJobsTable.id, job.id), eq(aiEnrichmentJobsTable.status, "pending"))).returning();
    if (!claimed) return;
    try {
      const [message] = await db.select().from(messagesTable)
        .where(and(eq(messagesTable.id, job.messageId), eq(messagesTable.orgId, job.orgId)));
      if (!message) throw new Error("source message missing");
      const result = requireAiResult(await runAi<{ intent?: string; summary?: string; tags?: string[]; draft?: string }>({
        metadata: { orgId: job.orgId, workflow: "durable_enrichment", event: "message_enrichment", conversationId: `message:${message.id}` },
        messages: [{ role: "user", content: `Classify this supply-chain message. Return JSON: {"intent":string,"summary":string,"tags":string[],"draft":string}. draft must be a concise professional reply and requires human approval before sending. Message: ${(message.normalizedBody ?? message.fullBody).slice(0, 1800)}` }],
        output: "json", temperature: 0, maxCompletionTokens: 180, responseFormat: { type: "json_object" },
      }));
      await db.update(messagesTable).set({
        aiTags: Array.isArray(result.tags) ? result.tags.slice(0, 8) : [result.intent ?? "other"],
        aiDraft: typeof result.draft === "string" ? result.draft : message.aiDraft,
      }).where(and(eq(messagesTable.id, message.id), eq(messagesTable.orgId, job.orgId)));
      await db.update(aiEnrichmentJobsTable).set({ status: "completed", completedAt: new Date(), result: { intent: result.intent ?? null, summary: result.summary ?? null } })
        .where(eq(aiEnrichmentJobsTable.id, job.id));
    } catch (error) {
      const terminal = claimed.attempts >= claimed.maxAttempts;
      await db.update(aiEnrichmentJobsTable).set({
        status: terminal ? "failed" : "pending",
        runAt: new Date(Date.now() + BACKOFF_MS[Math.min(claimed.attempts - 1, BACKOFF_MS.length - 1)]),
        lastError: "AI enrichment failed; original message remains available for manual review.",
      }).where(eq(aiEnrichmentJobsTable.id, job.id));
      if (terminal) await db.update(messagesTable).set({
        reviewStatus: "error",
        reviewDecision: makeReviewDecision(
          "extraction", 0,
          "Background AI enrichment failed after all retries. Review the original message manually.",
          { jobId: job.id },
        ),
      })
        .where(and(eq(messagesTable.id, job.messageId), eq(messagesTable.orgId, job.orgId)));
      logger.warn({ jobId: job.id, attempts: claimed.attempts, error: String(error) }, "enrichment job failed");
    }
  } finally { running = false; }
}

export async function recoverInterruptedEnrichmentJobs(): Promise<void> {
  // A process that stops mid-request cannot release its database lease. Requeue
  // only old leases; a live worker has five seconds between scheduling ticks.
  await db.update(aiEnrichmentJobsTable).set({ status: "pending", lockedAt: null })
    .where(and(
      eq(aiEnrichmentJobsTable.status, "processing"),
      lte(aiEnrichmentJobsTable.lockedAt, new Date(Date.now() - 60_000)),
    ));
}

export function startEnrichmentWorker(): NodeJS.Timeout {
  void recoverInterruptedEnrichmentJobs();
  void processEnrichmentJobs();
  return setInterval(() => void processEnrichmentJobs(), 5_000);
}