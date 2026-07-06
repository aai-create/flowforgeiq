ALTER TABLE "contact_routing_rules" DROP CONSTRAINT "contact_routing_rules_org_email_unique";--> statement-breakpoint
DROP INDEX "contact_routing_rules_from_email_idx";--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ALTER COLUMN "from_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ADD COLUMN "channel" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ADD COLUMN "sender_id" text;--> statement-breakpoint
UPDATE "contact_routing_rules" SET "sender_id" = "from_email" WHERE "sender_id" IS NULL AND "from_email" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ALTER COLUMN "sender_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "contact_routing_rules_sender_idx" ON "contact_routing_rules" USING btree ("sender_id","channel","org_id");--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_org_channel_sender_unique" UNIQUE("org_id","channel","sender_id");
