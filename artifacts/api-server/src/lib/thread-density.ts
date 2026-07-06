import { db, stageEventsTable, copilotSettingsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";

function today(): Date { return new Date(); }

export interface ThreadDensityResult {
  sparse: boolean;
  messageCount: number;
  daysInStage: number;
}

export interface CopilotThresholds {
  sparseThreadMinMessages: number;
  sparseThreadMinDays: number;
}

export async function getCopilotThresholds(orgId: number): Promise<CopilotThresholds> {
  const [cfg] = await db
    .select()
    .from(copilotSettingsTable)
    .where(eq(copilotSettingsTable.orgId, orgId))
    .limit(1);
  if (cfg) {
    return {
      sparseThreadMinMessages: cfg.sparseThreadMinMessages,
      sparseThreadMinDays: cfg.sparseThreadMinDays,
    };
  }
  const [inserted] = await db
    .insert(copilotSettingsTable)
    .values({ orgId, sparseThreadMinMessages: 5, sparseThreadMinDays: 14 })
    .returning();
  return {
    sparseThreadMinMessages: inserted!.sparseThreadMinMessages,
    sparseThreadMinDays: inserted!.sparseThreadMinDays,
  };
}

export async function computeThreadDensity(
  shipmentId: number,
  currentStageId: string,
  messageCount: number,
  orgId: number,
): Promise<ThreadDensityResult> {
  if (messageCount === 0) {
    return { sparse: false, messageCount: 0, daysInStage: 0 };
  }

  const thresholds = await getCopilotThresholds(orgId);

  const [latestStageEntry] = await db
    .select({ createdAt: stageEventsTable.createdAt })
    .from(stageEventsTable)
    .where(
      and(
        eq(stageEventsTable.shipmentId, shipmentId),
        eq(stageEventsTable.toStageId, currentStageId),
      ),
    )
    .orderBy(desc(stageEventsTable.createdAt))
    .limit(1);

  const now = today();
  const stageStartedAt = latestStageEntry ? new Date(latestStageEntry.createdAt) : now;
  const daysInStage = Math.max(
    0,
    Math.floor((now.getTime() - stageStartedAt.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const sparse =
    messageCount < thresholds.sparseThreadMinMessages &&
    daysInStage > thresholds.sparseThreadMinDays;

  return { sparse, messageCount, daysInStage };
}
