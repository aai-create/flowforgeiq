ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "gmail_thread_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "gmail_message_id" text;