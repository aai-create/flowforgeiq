CREATE TABLE "contact_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"from_email" text NOT NULL,
	"shipment_id" integer NOT NULL,
	"created_by" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_routing_rules_org_email_unique" UNIQUE("org_id","from_email")
);
--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_created_by_team_users_clerk_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."team_users"("clerk_user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_routing_rules_org_id_idx" ON "contact_routing_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "contact_routing_rules_from_email_idx" ON "contact_routing_rules" USING btree ("from_email","org_id");