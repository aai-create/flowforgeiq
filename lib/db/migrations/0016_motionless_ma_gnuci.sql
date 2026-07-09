ALTER TABLE "organizations" ADD COLUMN "visibility_mode" text DEFAULT 'shared' NOT NULL;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "assignee_id" text;