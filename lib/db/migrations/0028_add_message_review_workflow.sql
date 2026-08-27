ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "review_status" text NOT NULL DEFAULT 'not_required';
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "review_decision" jsonb;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "review_audit" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_org_review_status_idx"
ON "messages" USING btree ("org_id", "review_status");