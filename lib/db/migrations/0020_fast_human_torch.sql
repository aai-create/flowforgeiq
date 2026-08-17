DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'copilot_proposals'
    AND column_name = 'shipment_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "copilot_proposals" ALTER COLUMN "shipment_id" DROP NOT NULL;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "signal_status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'copilot_trigger' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_signal_status_org_idx" ON "messages" USING btree ("org_id","signal_status");
