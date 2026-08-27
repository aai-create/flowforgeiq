-- Repair databases where 0023 was recorded without its Gmail threading columns.
-- The statements are intentionally idempotent: existing message history is untouched.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "gmail_thread_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "gmail_message_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "messages_org_gmail_message_id_unique"
  ON "messages" USING btree ("org_id", "gmail_message_id");