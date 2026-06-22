---
name: drizzle-kit push TTY limitation & migrate solution
description: drizzle-kit push requires interactive TTY; use generate + migrate instead (now set up)
---

## Rule

**Prefer `generate` + `migrate` over `push` for all schema changes.** `drizzle-kit push` requires an interactive TTY when resolving column conflicts and cannot run in agent/CI contexts.

## Recommended workflow

```bash
# 1. Edit lib/db/src/schema/*.ts
# 2. Generate a migration file:
pnpm --filter @workspace/db run generate
# 3. Apply it (non-interactive):
pnpm --filter @workspace/db run migrate
# 4. Reseed if needed:
pnpm --filter @workspace/db run seed
```

`generate` is `drizzle-kit generate --config ./drizzle.config.ts`.
`migrate` runs `drizzle-orm/node-postgres/migrator` via `lib/db/src/migrate.ts`.

## Bootstrapping a fresh DB

Run `migrate` — it applies all SQL from `lib/db/migrations/` not yet recorded in `drizzle.__drizzle_migrations`.

## Switching an already-synced DB from push to migrate (one-time)

Run `stamp` (`lib/db/src/stamp.ts`). It inserts journal entries into `drizzle.__drizzle_migrations` without executing the SQL, so `migrate` skips them on the next run. Already done for the baseline migration.

## Migration tracking internals

Drizzle stores applied migration records in the `drizzle` Postgres schema:
`drizzle.__drizzle_migrations (id, hash, created_at)`.
`hash` = sha256 of the raw SQL file content. `created_at` = journal `when` (ms timestamp).
The migrator skips any migration whose `folderMillis <= last recorded created_at`.

## Fallback (last resort only)

If neither generate+migrate nor stamp is usable, apply schema changes via raw psql:

```bash
psql "$DATABASE_URL" << 'EOF'
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col type NOT NULL DEFAULT val;
EOF
```

**Why:** drizzle-kit push calls interactive prompts (via `@clack/prompts`) for column conflict resolution; no `--yes`/`--force` flag exists in drizzle-kit 0.31.x.
