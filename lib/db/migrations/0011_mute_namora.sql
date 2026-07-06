CREATE TABLE "sample_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"supplier_id" integer,
	"buyer_id" integer,
	"product" text NOT NULL,
	"quantity" integer,
	"notes" text,
	"milestone" text DEFAULT 'sample_requested' NOT NULL,
	"tracking_code" text,
	"carrier_name" text,
	"converted_shipment_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_converted_shipment_id_shipments_id_fk" FOREIGN KEY ("converted_shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sample_requests_org_id_idx" ON "sample_requests" USING btree ("org_id");