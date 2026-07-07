CREATE TABLE "device_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"org_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "device_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_tokens_clerk_user_id_idx" ON "device_tokens" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "device_tokens_org_id_idx" ON "device_tokens" USING btree ("org_id");
