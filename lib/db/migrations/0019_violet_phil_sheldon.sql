ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_name_unique";--> statement-breakpoint
ALTER TABLE "deals" DROP CONSTRAINT "deals_buyer_po_number_unique";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_po_number_unique";--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_name_uniq" UNIQUE("org_id","name");--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_org_buyer_po_uniq" UNIQUE("org_id","buyer_po_number");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_org_po_uniq" UNIQUE("org_id","po_number");