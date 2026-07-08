import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep pool small so we don't exhaust the server's connection limit
  max: 5,
  // Drop idle connections after 20s — shorter than most server-side idle
  // timeouts (Neon: 300s, standard PG: varies). Prevents "Authentication
  // timed out" errors caused by the server closing connections the pool
  // still thinks are alive.
  idleTimeoutMillis: 20_000,
  // Give new connections up to 10s to establish (handles Neon cold-starts)
  connectionTimeoutMillis: 10_000,
});

// Prevent unhandled 'error' events on the pool from crashing the process.
// Individual query errors are still thrown at the call site as normal.
pool.on("error", (err) => {
  console.error("[db] pool error (connection evicted or server closed it):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
