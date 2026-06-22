CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"org_id" integer DEFAULT 1 NOT NULL,
	"id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "stages_org_id_id_pk" PRIMARY KEY("org_id","id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'CN' NOT NULL,
	"contact_email" text,
	"contact_name" text,
	"whats_app_number" text,
	"payment_terms" text,
	"org_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_po_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"buyer_total_usd" double precision NOT NULL,
	"buyer_unit_price" double precision NOT NULL,
	"buyer_quantity" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_buyer_po_number_unique" UNIQUE("buyer_po_number")
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_number" text NOT NULL,
	"product" text NOT NULL,
	"category" text NOT NULL,
	"supplier_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"deal_id" integer,
	"status" text NOT NULL,
	"current_stage_id" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"ex_factory_date" timestamp with time zone NOT NULL,
	"destination" text DEFAULT '' NOT NULL,
	"via" text DEFAULT 'OCEAN' NOT NULL,
	"notes" text,
	"quantity" integer,
	"unit_cost_usd" integer,
	"assignee_id" text,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"label" text NOT NULL,
	"percent" integer NOT NULL,
	"amount_usd" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"reference_number" text,
	"method" text,
	"buyer_share_pct" integer,
	"intermediary_advance_usd" integer,
	"intermediary_recovered_usd" integer,
	"intermediary_recovered_at" timestamp with time zone,
	"invoice_number" text,
	"intermediary_supplier_paid_usd" integer,
	"intermediary_supplier_paid_at" timestamp with time zone,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"factory" text NOT NULL,
	"country" text DEFAULT 'CN' NOT NULL,
	"unit_price" double precision NOT NULL,
	"lead_days" integer NOT NULL,
	"moq" integer NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"validity_date" text,
	"notes" text,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer,
	"supplier_id" integer,
	"sender" text NOT NULL,
	"recipient" text,
	"channel" text NOT NULL,
	"subject" text,
	"direction" text DEFAULT 'inbound' NOT NULL,
	"snippet" text NOT NULL,
	"full_body" text NOT NULL,
	"ai_draft" text DEFAULT '' NOT NULL,
	"ai_action" text DEFAULT '' NOT NULL,
	"ai_tags" text[] DEFAULT '{}' NOT NULL,
	"unread" boolean DEFAULT true NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"routing_status" text DEFAULT 'routed' NOT NULL,
	"routing_confidence" real,
	"match_method" text,
	"raw_sender_email" text,
	"ai_routing_guess" jsonb,
	"pending_extraction_fields" jsonb,
	"raw_chat_text" text,
	"routed_to_clerk_user_id" text,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"message_id" integer,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"source_age" text NOT NULL,
	"urgency" text NOT NULL,
	"action" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text DEFAULT '' NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"storage_data" text,
	"source_channel" text DEFAULT 'upload' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_corrections" (
	"id" serial PRIMARY KEY NOT NULL,
	"extraction_id" integer NOT NULL,
	"supplier_id" integer,
	"document_type" text NOT NULL,
	"field_path" text NOT NULL,
	"original_value" text,
	"corrected_value" text NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"shipment_match_id" integer,
	"extracted_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"field_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reconciliation_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transcript_text" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"predicted_eta_min" timestamp with time zone NOT NULL,
	"predicted_eta_max" timestamp with time zone NOT NULL,
	"confidence" real NOT NULL,
	"contributing_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_mitigations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autonomy_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_name" text,
	"action_type" text,
	"policy" text DEFAULT 'always_ask' NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copilot_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_ref" text,
	"action_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reasoning" text DEFAULT '' NOT NULL,
	"confidence" real DEFAULT 0.8 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"snoozed_until" timestamp with time zone,
	"edited_payload" jsonb,
	"user_edited_content" text,
	"edit_distance" real,
	"audit_trail" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"from_stage_id" text NOT NULL,
	"to_stage_id" text NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_numbering_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" text DEFAULT 'PO-' NOT NULL,
	"sequence_format" text DEFAULT '{seq}' NOT NULL,
	"supplier_suffix" text DEFAULT 'S' NOT NULL,
	"next_seq" integer DEFAULT 1 NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"shipment_id" integer NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_email" text NOT NULL,
	"buyer_name" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"clerk_user_id" text,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_emails_org_sender_unique" UNIQUE("org_id","sender_email")
);
--> statement-breakpoint
CREATE TABLE "gmail_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_address" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" timestamp with time zone,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"buyer_name" text NOT NULL,
	"target_price_usd" double precision NOT NULL,
	"quantity" integer NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text,
	"converted_shipment_id" integer,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" integer NOT NULL,
	"supplier_id" integer,
	"factory_name" text NOT NULL,
	"country" text DEFAULT 'CN' NOT NULL,
	"unit_price_usd" double precision NOT NULL,
	"lead_time_days" integer NOT NULL,
	"moq" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'received' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"inbound_token" text NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_users_inbound_token_unique" UNIQUE("inbound_token")
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" text NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_quotes" ADD CONSTRAINT "factory_quotes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_corrections" ADD CONSTRAINT "extraction_corrections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_predictions" ADD CONSTRAINT "shipment_predictions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomy_policies" ADD CONSTRAINT "autonomy_policies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_events" ADD CONSTRAINT "stage_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_events" ADD CONSTRAINT "stage_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_numbering_config" ADD CONSTRAINT "po_numbering_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_emails" ADD CONSTRAINT "buyer_emails_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_credentials" ADD CONSTRAINT "gmail_credentials_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stages_org_id_idx" ON "stages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "suppliers_org_id_idx" ON "suppliers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "deals_org_id_idx" ON "deals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "shipments_org_id_idx" ON "shipments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "payments_org_id_idx" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "factory_quotes_org_id_idx" ON "factory_quotes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "messages_org_id_idx" ON "messages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tasks_org_id_idx" ON "tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "documents_org_id_idx" ON "documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "extraction_corrections_org_id_idx" ON "extraction_corrections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "extractions_org_id_idx" ON "extractions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "shipment_predictions_org_id_idx" ON "shipment_predictions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "autonomy_policies_org_id_idx" ON "autonomy_policies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "copilot_proposals_org_id_idx" ON "copilot_proposals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stage_events_org_id_idx" ON "stage_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "po_numbering_config_org_id_idx" ON "po_numbering_config" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_shipments_deal_shipment_uniq" ON "deal_shipments" USING btree ("deal_id","shipment_id");--> statement-breakpoint
CREATE INDEX "deal_shipments_org_id_idx" ON "deal_shipments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "buyer_emails_org_id_idx" ON "buyer_emails" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "gmail_credentials_org_id_idx" ON "gmail_credentials" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "rfqs_org_id_idx" ON "rfqs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "rfq_quotes_org_id_idx" ON "rfq_quotes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "team_users_org_id_idx" ON "team_users" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "team_invitations_org_id_idx" ON "team_invitations" USING btree ("org_id");