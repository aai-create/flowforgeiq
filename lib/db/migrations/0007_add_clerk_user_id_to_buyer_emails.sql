-- Add clerk_user_id to buyer_emails if it was never created.
-- The baseline migration used CREATE TABLE IF NOT EXISTS which silently skipped
-- this column in production databases bootstrapped before the baseline ran.
ALTER TABLE "buyer_emails" ADD COLUMN IF NOT EXISTS "clerk_user_id" text;
