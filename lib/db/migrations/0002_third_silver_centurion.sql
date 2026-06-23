ALTER TABLE "shipments" ADD COLUMN "buyer_id" integer;--> statement-breakpoint
ALTER TABLE "team_users" ADD COLUMN "inbound_handle" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_inbound_handle_unique" UNIQUE("inbound_handle");