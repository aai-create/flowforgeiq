ALTER TABLE "copilot_proposals" ALTER COLUMN "shipment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "signal_status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD COLUMN "source" text DEFAULT 'copilot_trigger' NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_signal_status_org_idx" ON "messages" USING btree ("org_id","signal_status");