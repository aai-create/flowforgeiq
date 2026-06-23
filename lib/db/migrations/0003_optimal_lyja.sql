ALTER TABLE "buyers" DROP CONSTRAINT "buyers_name_unique";--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_name_org_id_uniq" UNIQUE("name","org_id");