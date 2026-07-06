CREATE TABLE "copilot_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sparse_thread_min_messages" integer DEFAULT 5 NOT NULL,
	"sparse_thread_min_days" integer DEFAULT 14 NOT NULL,
	"org_id" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD COLUMN "sparse_thread_warning" boolean;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD COLUMN "sparse_message_count" integer;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD COLUMN "sparse_days_in_stage" integer;--> statement-breakpoint
ALTER TABLE "copilot_settings" ADD CONSTRAINT "copilot_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copilot_settings_org_id_idx" ON "copilot_settings" USING btree ("org_id");