CREATE TABLE "buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"region" text,
	"org_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "buyers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "buyer_id" integer;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_users" ADD COLUMN "inbound_handle" text;--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyers_org_id_idx" ON "buyers" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_inbound_handle_unique" UNIQUE("inbound_handle");