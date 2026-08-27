CREATE TABLE IF NOT EXISTS "ai_enrichment_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer NOT NULL REFERENCES "organizations"("id"),
  "message_id" integer NOT NULL REFERENCES "messages"("id"),
  "job_type" text NOT NULL DEFAULT 'message_enrichment',
  "idempotency_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 4,
  "run_at" timestamp with time zone NOT NULL DEFAULT now(),
  "locked_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "last_error" text,
  "result" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_enrichment_jobs_org_idempotency_unique" ON "ai_enrichment_jobs" ("org_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_enrichment_jobs_claim_idx" ON "ai_enrichment_jobs" ("status","run_at");