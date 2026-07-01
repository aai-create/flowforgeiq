import path from "node:path";
import { pool } from "@workspace/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set — skipping migrations");
    return;
  }

  // __dirname is set by the esbuild banner to the dist directory in both dev and production.
  // Three levels up from dist/ lands at the workspace root; migrations live in lib/db/migrations.
  const migrationsFolder = path.join(__dirname, "../../../lib/db/migrations");

  const db = drizzle(pool);

  logger.info({ migrationsFolder }, "Running database migrations");
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations complete");
}
