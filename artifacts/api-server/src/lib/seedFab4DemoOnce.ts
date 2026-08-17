/**
 * seedFab4DemoOnce
 *
 * Called once at server startup (after migrations). If the Fab4Demo org
 * (slug="fab4demo") is absent from the database, it calls seedFab4Demo()
 * directly — no subprocess, no PATH dependency.
 *
 * The function is intentionally fire-and-forget: a seeding failure is
 * logged but never prevents the server from starting.
 */

import { db, messagesTable, organizationsTable, shipmentsTable, stagesTable } from "@workspace/db";
import { count, eq, and, inArray, isNull } from "drizzle-orm";
// Static import so esbuild bundles the seed function directly into the server
// bundle. This avoids the subprocess approach (pnpm) which fails in production
// because pnpm is not on PATH in the deployed container.
import {
  seedFab4Demo,
  EXPECTED_MESSAGE_COUNTS,
  EXPECTED_STAGE_COUNT,
  EXPECTED_UNROUTED_MESSAGE_COUNT,
} from "@workspace/scripts/src/seed-fab4demo.js";
import { logger } from "./logger";

/** PO numbers expected in a fully-seeded Fab4Demo org. */
const EXPECTED_PO_NUMBERS = Object.keys(EXPECTED_MESSAGE_COUNTS);

/**
 * Returns true only when every expected PO exists as a shipment AND each
 * shipment's message count exactly matches the static seed definition.
 * An aggregate threshold is not sufficient — it can pass even when individual
 * shipments are missing messages.
 */
async function isFullySeeded(orgId: number): Promise<boolean> {
  // 1. Per-PO message counts — must all match exactly.
  const rows = await db
    .select({
      poNumber: shipmentsTable.poNumber,
      msgCount: count(messagesTable.id),
    })
    .from(shipmentsTable)
    .leftJoin(
      messagesTable,
      and(
        eq(messagesTable.shipmentId, shipmentsTable.id),
        eq(messagesTable.orgId, orgId),
      ),
    )
    .where(
      and(
        eq(shipmentsTable.orgId, orgId),
        inArray(shipmentsTable.poNumber, EXPECTED_PO_NUMBERS),
      ),
    )
    .groupBy(shipmentsTable.poNumber);

  if (rows.length !== EXPECTED_PO_NUMBERS.length) return false;
  if (!rows.every(r => r.msgCount === EXPECTED_MESSAGE_COUNTS[r.poNumber])) return false;

  // 2. Pipeline stages — all 11 must exist for this org.
  const [{ stageCount }] = await db
    .select({ stageCount: count(stagesTable.id) })
    .from(stagesTable)
    .where(eq(stagesTable.orgId, orgId));
  if (stageCount < EXPECTED_STAGE_COUNT) return false;

  // 3. Unrouted inbox messages — at least the expected number must exist.
  const [{ unroutedCount }] = await db
    .select({ unroutedCount: count(messagesTable.id) })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.orgId, orgId),
        eq(messagesTable.routingStatus, "needs_review"),
        isNull(messagesTable.shipmentId),
      ),
    );
  if (unroutedCount < EXPECTED_UNROUTED_MESSAGE_COUNT) return false;

  return true;
}

export async function seedFab4DemoOnce(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, "fab4demo"))
      .limit(1);

    if (existing) {
      // Org exists but may be partially seeded (e.g. seed crashed mid-run).
      // Verify every expected PO shipment exists AND has its exact message count
      // before skipping — an aggregate threshold would pass even when individual
      // shipments are missing messages from a previous partial run.
      if (await isFullySeeded(existing.id)) {
        logger.info(
          { orgId: existing.id },
          "seedFab4DemoOnce: Fab4Demo org fully seeded — skipping",
        );
        return;
      }
      logger.info(
        { orgId: existing.id },
        "seedFab4DemoOnce: Fab4Demo org partially seeded — resuming",
      );
    } else {
      logger.info("seedFab4DemoOnce: Fab4Demo org not found — running seed");
    }

    await seedFab4Demo();
    logger.info("seedFab4DemoOnce: seed complete");
  } catch (err) {
    // Seeding failure must never crash the server.
    logger.error({ err }, "seedFab4DemoOnce: seed failed (server will continue)");
  }
}
