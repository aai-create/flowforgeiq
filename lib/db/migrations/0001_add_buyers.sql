CREATE TABLE IF NOT EXISTS "buyers" (
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
DO $$ BEGIN
 ALTER TABLE "buyers" ADD CONSTRAINT "buyers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "buyers_org_id_idx" ON "buyers" USING btree ("org_id");
--> statement-breakpoint
INSERT INTO buyers (name, org_id)
SELECT DISTINCT customer_name, org_id
FROM shipments
WHERE customer_name IS NOT NULL AND customer_name != ''
ON CONFLICT (name) DO NOTHING;
