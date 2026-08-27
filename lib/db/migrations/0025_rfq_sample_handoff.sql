ALTER TABLE "rfq_quotes" ADD COLUMN IF NOT EXISTS "shortlisted" boolean NOT NULL DEFAULT false;
ALTER TABLE "sample_requests" ADD COLUMN IF NOT EXISTS "rfq_id" integer;
ALTER TABLE "sample_requests" ADD COLUMN IF NOT EXISTS "rfq_quote_id" integer;
ALTER TABLE "sample_requests" ADD COLUMN IF NOT EXISTS "approval_outcome" text;
ALTER TABLE "sample_requests" ADD COLUMN IF NOT EXISTS "written_approval" text;
ALTER TABLE "sample_requests" ADD COLUMN IF NOT EXISTS "written_approval_at" timestamptz;
ALTER TABLE "sample_requests" ADD COLUMN IF NOT EXISTS "written_approval_by" text;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "sample_request_id" integer;

DO $$ BEGIN
  ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_rfq_id_rfqs_id_fk"
    FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_rfq_quote_id_rfq_quotes_id_fk"
    FOREIGN KEY ("rfq_quote_id") REFERENCES "rfq_quotes"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_sample_request_id_sample_requests_id_fk"
    FOREIGN KEY ("sample_request_id") REFERENCES "sample_requests"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "sample_requests_rfq_id_idx" ON "sample_requests" ("rfq_id");
CREATE INDEX IF NOT EXISTS "sample_requests_rfq_quote_id_idx" ON "sample_requests" ("rfq_quote_id");
CREATE INDEX IF NOT EXISTS "documents_sample_request_id_idx" ON "documents" ("sample_request_id");