/**
 * seedFab4DemoOnce
 *
 * Called once at server startup (after migrations). If the Fab4Demo org
 * (slug="fab4demo") is absent from the database, it executes
 *   pnpm --filter @workspace/scripts seed-fab4demo
 * using the same DATABASE_URL and CLERK_SECRET_KEY that the running server
 * already has — so it targets the correct database (production or dev)
 * automatically.
 *
 * The function is intentionally fire-and-forget: a seeding failure is
 * logged but never prevents the server from starting.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

/** Resolve the monorepo root regardless of the server's cwd. */
function workspaceRoot(): string {
  // In both dev and production the monorepo is at /home/runner/workspace.
  return process.env.WORKSPACE_ROOT ?? "/home/runner/workspace";
}

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

    logger.info("seedFab4DemoOnce: Fab4Demo org not found — running seed script");

    const { stdout, stderr } = await execFileAsync(
      "pnpm",
      ["--filter", "@workspace/scripts", "seed-fab4demo"],
      {
        cwd: workspaceRoot(),
        env: process.env,
        timeout: 300_000, // 5 minutes
      },
    );

    if (stdout) logger.info({ output: stdout }, "seedFab4DemoOnce: seed stdout");
    if (stderr) logger.warn({ stderr }, "seedFab4DemoOnce: seed stderr");
    logger.info("seedFab4DemoOnce: seed complete");
  } catch (err) {
    // Seeding failure must never crash the server.
    logger.error({ err }, "seedFab4DemoOnce: seed failed (server will continue)");
  }
}
