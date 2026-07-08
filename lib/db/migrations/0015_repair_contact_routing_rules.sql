-- Repair migration: contact_routing_rules was stamped in production without
-- the SQL ever running. This is a full idempotent re-creation using IF NOT
-- EXISTS guards so it is safe to apply to both dev (table already exists →
-- no-op) and production (table missing → created).

CREATE TABLE IF NOT EXISTS "contact_routing_rules" (
        "id" serial PRIMARY KEY NOT NULL,
        "org_id" integer NOT NULL,
        "from_email" text,
        "shipment_id" integer NOT NULL,
        "created_by" text,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "channel" text DEFAULT 'email' NOT NULL,
        "sender_id" text NOT NULL,
        "deactivation_reason" text,
        CONSTRAINT "contact_routing_rules_org_channel_sender_unique" UNIQUE("org_id","channel","sender_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_routing_rules" ADD CONSTRAINT "contact_routing_rules_created_by_team_users_clerk_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."team_users"("clerk_user_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_routing_rules_org_id_idx" ON "contact_routing_rules" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_routing_rules_sender_idx" ON "contact_routing_rules" USING btree ("sender_id","channel","org_id");
