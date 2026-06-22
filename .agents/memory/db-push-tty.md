---
name: drizzle-kit push TTY limitation
description: drizzle-kit push requires interactive TTY when resolving column conflicts; workaround is raw psql SQL
---

## Rule

Never run `pnpm --filter @workspace/db run push` in non-interactive automation (CI, agent bash). It will always fail with "Interactive prompts require a TTY terminal" when the schema has column additions that drizzle-kit suspects might be renames.

## Workaround

Apply schema changes directly via `psql "$DATABASE_URL"` with a heredoc:

```bash
psql "$DATABASE_URL" << 'EOF'
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col type NOT NULL DEFAULT val;
CREATE INDEX IF NOT EXISTS my_table_new_col_idx ON my_table(new_col);
EOF
```

For seeding, use `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` to clear all dependent tables in one shot rather than deleting in FK order.

**Why:** drizzle-kit's `push` command calls interactive prompts (renders with `@clack/prompts`) for column conflict resolution and has no `--yes` / `--force` flag as of drizzle-kit 0.31.x.

**How to apply:** Any time you need to apply a schema change in a bash agent step, use psql directly. The Drizzle schema files remain the source of truth for TypeScript types; they just need to be reconciled manually with the DB.
