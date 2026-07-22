ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "suppliers_name_unique";--> statement-breakpoint
ALTER TABLE "deals" DROP CONSTRAINT IF EXISTS "deals_buyer_po_number_unique";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_po_number_unique";--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_org_name_uniq') THEN ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_name_uniq" UNIQUE("org_id","name"); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_org_buyer_po_uniq') THEN ALTER TABLE "deals" ADD CONSTRAINT "deals_org_buyer_po_uniq" UNIQUE("org_id","buyer_po_number"); END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_org_po_uniq') THEN ALTER TABLE "shipments" ADD CONSTRAINT "shipments_org_po_uniq" UNIQUE("org_id","po_number"); END IF; END $$;
