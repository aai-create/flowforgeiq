-- Add org_id column to stage_events if it does not already exist.
-- The DB may have been bootstrapped before this column was introduced.
ALTER TABLE "stage_events" ADD COLUMN IF NOT EXISTS "org_id" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
-- Rename actor_name to created_by if the old column name still exists.
-- The schema uses created_by but early DB snapshots used actor_name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stage_events' AND column_name = 'actor_name'
  ) THEN
    ALTER TABLE stage_events RENAME COLUMN actor_name TO created_by;
  END IF;
END
$$;
--> statement-breakpoint
-- Add FK from stage_events.org_id to organizations if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stage_events_org_id_organizations_id_fk'
      AND table_name = 'stage_events'
  ) THEN
    ALTER TABLE "stage_events"
      ADD CONSTRAINT "stage_events_org_id_organizations_id_fk"
      FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stage_events_org_id_idx" ON "stage_events" USING btree ("org_id");
