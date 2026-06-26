CREATE TABLE "deal_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'flat' NOT NULL,
	"value" double precision NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "target_spread_pct" double precision;--> statement-breakpoint
ALTER TABLE "deal_adjustments" ADD CONSTRAINT "deal_adjustments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_adjustments" ADD CONSTRAINT "deal_adjustments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_adjustments_deal_id_idx" ON "deal_adjustments" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_adjustments_org_id_idx" ON "deal_adjustments" USING btree ("org_id");