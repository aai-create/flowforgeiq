CREATE TABLE IF NOT EXISTS "legal_acceptances" (
  "clerk_user_id" text PRIMARY KEY NOT NULL,
  "privacy_version" text NOT NULL,
  "terms_version" text NOT NULL,
  "accepted_at" timestamptz NOT NULL DEFAULT now()
);