-- Data repair: update abid.a.imam's org_id from 1 → 2 (Fab4Demo).
-- Background: the team_users INSERT in accept-invite used ON CONFLICT DO NOTHING,
-- which silently dropped the new-org row when clerk_user_id was already taken.
-- His invite for org_id=2 was marked accepted but the row was never created.
-- This UPDATE is a no-op in dev (where his org_id is already correct) and
-- idempotent (WHERE org_id = 1 only matches the pre-repair state).
UPDATE "team_users"
SET org_id = 2
WHERE clerk_user_id = 'user_3EzzWF7H8wscfEc8lzB8bX49sOg'
  AND org_id = 1
  AND EXISTS (SELECT 1 FROM organizations WHERE id = 2 AND slug = 'fab4demo');
