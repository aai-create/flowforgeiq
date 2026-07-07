#!/usr/bin/env bash
# check-migrations.sh
#
# Verifies that the Drizzle schema is fully captured in the migration history.
# Runs `drizzle-kit generate` and fails if it produces any new SQL files,
# which would mean someone pushed schema changes without generating a migration.
#
# Usage: bash lib/db/check-migrations.sh
# Exit codes: 0 = in sync, 1 = schema drift detected

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MIGRATIONS_DIR="./migrations"

echo "=== Migration sync check ==="

# Count existing SQL migration files
BEFORE=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" | wc -l | tr -d ' ')
echo "Existing migrations: $BEFORE"

# drizzle-kit generate reads the TS schema and compares it to the last snapshot
# in migrations/meta/. It does NOT connect to the database, but drizzle.config.ts
# throws if DATABASE_URL is missing, so we supply a dummy value.
echo "Running drizzle-kit generate..."
DATABASE_URL="${DATABASE_URL:-postgres://check:check@localhost:5432/check}" \
  npx drizzle-kit generate --config ./drizzle.config.ts 2>&1

AFTER=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" | wc -l | tr -d ' ')
NEW_FILES=$((AFTER - BEFORE))

if [ "$NEW_FILES" -gt 0 ]; then
  echo ""
  echo "ERROR: drizzle-kit generate produced $NEW_FILES new migration file(s)."
  echo "The Drizzle schema has changes that are not yet captured in a migration."
  echo ""
  echo "To fix, run:"
  echo "  pnpm --filter @workspace/db run generate"
  echo "  pnpm --filter @workspace/db run migrate"
  echo "Then commit the new migration files."
  echo ""

  # Restore the migrations directory to its pre-check state so this check
  # is safe to run in CI without leaving behind uncommitted files.
  echo "Cleaning up generated files..."
  # Remove newly created SQL files (they are the last $NEW_FILES by sort order)
  find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" \
    | sort \
    | tail -"$NEW_FILES" \
    | xargs rm -f

  # Restore the meta snapshot that drizzle-kit also updated
  if git -C "$SCRIPT_DIR" rev-parse --git-dir > /dev/null 2>&1; then
    git -C "$SCRIPT_DIR" checkout HEAD -- "$MIGRATIONS_DIR/meta" 2>/dev/null || true
  fi

  echo "Cleanup complete."
  exit 1
else
  echo ""
  echo "OK: Schema is in sync with migration history. No new migrations needed."
  exit 0
fi
