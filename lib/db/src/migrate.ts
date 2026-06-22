import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const migrationsFolder = path.join(__dirname, "../migrations");

migrate(db, { migrationsFolder })
  .then(() => {
    console.log("Migrations applied successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
