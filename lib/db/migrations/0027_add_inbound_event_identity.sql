ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "inbound_event_key" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "normalized_body" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "normalization_version" text;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "suppression_reason" text;
--> statement-breakpoint
UPDATE "messages"
SET "inbound_event_key" = 'email:provider:' || lower(trim(both '<>' from trim("gmail_message_id")))
WHERE "gmail_message_id" IS NOT NULL
  AND "inbound_event_key" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "messages_org_inbound_event_key_unique"
ON "messages" USING btree ("org_id", "inbound_event_key");