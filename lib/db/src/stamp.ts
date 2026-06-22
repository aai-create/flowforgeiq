/**
 * Stamp: marks all generated migrations as already applied without running their SQL.
 *
 * Use this once on an existing database that is already in sync with the Drizzle
 * schema (e.g. after switching from drizzle-kit push to drizzle-kit migrate).
 * Running `migrate` after `stamp` will only apply migrations created after the stamp.
 *
 * Drizzle's migrator stores records in the `drizzle.__drizzle_migrations` table
 * and skips any migration whose `folderMillis` (journal `when`) is ≤ the last
 * recorded `created_at`. This script inserts those records without executing the SQL.
 */
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function stamp() {
  const migrationsFolder = path.join(__dirname, "../migrations");
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    throw new Error(`Journal not found at ${journalPath}. Run drizzle-kit generate first.`);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };

  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const { rows: existing } = await client.query<{ hash: string }>(
      `SELECT hash FROM drizzle."__drizzle_migrations"`
    );
    const existingHashes = new Set(existing.map((r) => r.hash));

    for (const entry of journal.entries) {
      const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
      if (!fs.existsSync(sqlPath)) {
        console.warn(`SQL file not found for entry ${entry.tag}, skipping`);
        continue;
      }
      const sql = fs.readFileSync(sqlPath, "utf-8");
      const hash = crypto.createHash("sha256").update(sql).digest("hex");

      if (existingHashes.has(hash)) {
        console.log(`Already stamped: ${entry.tag}`);
        continue;
      }

      await client.query(
        `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        [hash, entry.when]
      );
      console.log(`Stamped: ${entry.tag}`);
    }

    console.log("Stamp complete — all migrations marked as applied.");
  } finally {
    client.release();
    await pool.end();
  }
}

stamp().catch((err) => {
  console.error("Stamp failed:", err);
  process.exit(1);
});
