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

import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
// Static import so esbuild bundles the seed function directly into the server
// bundle. This avoids the subprocess approach (pnpm) which fails in production
// because pnpm is not on PATH in the deployed container.
import { seedFab4Demo } from "@workspace/scripts/src/seed-fab4demo.js";
import { logger } from "./logger";

export async function seedFab4DemoOnce(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, "fab4demo"))
      .limit(1);

    if (existing) {
      logger.info("seedFab4DemoOnce: Fab4Demo org already exists — skipping seed");
      return;
    }

    logger.info("seedFab4DemoOnce: Fab4Demo org not found — running seed");
    await seedFab4Demo();
    logger.info("seedFab4DemoOnce: seed complete");
  } catch (err) {
    // Seeding failure must never crash the server.
    logger.error({ err }, "seedFab4DemoOnce: seed failed (server will continue)");
  }
}
