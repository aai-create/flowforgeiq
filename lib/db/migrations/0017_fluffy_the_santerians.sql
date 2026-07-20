ALTER TABLE "contact_routing_rules" DROP CONSTRAINT IF EXISTS "contact_routing_rules_created_by_team_users_clerk_user_id_fk";--> statement-breakpoint
ALTER TABLE "team_users" DROP CONSTRAINT IF EXISTS "team_users_pkey";--> statement-breakpoint
ALTER TABLE "team_users" ADD CONSTRAINT "team_users_clerk_user_id_org_id_pk" PRIMARY KEY("clerk_user_id","org_id");
