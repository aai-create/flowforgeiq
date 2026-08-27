CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer DEFAULT 1 NOT NULL REFERENCES "organizations"("id"),
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "workflow" text NOT NULL,
  "event" text NOT NULL,
  "conversation_id" text,
  "correlation_id" text,
  "outcome" text NOT NULL,
  "error_category" text,
  "latency_ms" integer,
  "input_tokens" integer,
  "output_tokens" integer,
  "total_tokens" integer,
  "estimated_cost_microusd" integer,
  "cost_estimate_status" text DEFAULT 'unavailable' NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_org_created_idx" ON "ai_usage" USING btree ("org_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_workflow_created_idx" ON "ai_usage" USING btree ("workflow", "created_at");