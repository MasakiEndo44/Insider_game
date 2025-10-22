-- ================================================================
-- Migration: Temporarily Disable Players RLS for Anonymous Access
-- Date: 2025-10-22
-- Purpose: Fix infinite recursion in players table RLS policy
-- ================================================================
--
-- CONTEXT:
-- The current RLS policy on `players` causes infinite recursion because
-- it references the `players` table within itself:
--
--   CREATE POLICY "players_visibility" ON players
--     USING (EXISTS (SELECT 1 FROM players AS p WHERE ...))
--
-- Additionally, this project does NOT have an authentication system.
-- All requests use the anonymous Supabase key, meaning auth.uid() is
-- always NULL, making RLS policies ineffective.
--
-- SOLUTION:
-- Temporarily disable RLS on the `players` table to allow E2E tests
-- and development to proceed. This is acceptable for development/testing
-- because:
-- 1. Server Actions use service role key (bypassing RLS anyway)
-- 2. Room IDs are UUIDs (hard to guess)
-- 3. Production deployment should implement proper authentication
--
-- FUTURE WORK:
-- Before production deployment, implement ONE of these solutions:
-- A) Supabase Auth (email/password or OAuth)
-- B) Custom JWT tokens issued by Server Actions
-- C) Session tokens stored in separate table with SECURITY DEFINER function
--
-- See: https://supabase.com/docs/guides/auth/row-level-security
-- ================================================================

BEGIN;

-- ================================================================
-- ENVIRONMENT GUARD: Only run in development/testing
-- ================================================================
-- This migration should NEVER run in production.
-- If you're deploying to production, either:
-- 1. Remove this migration file from your deployment
-- 2. Implement proper authentication first (see FUTURE WORK section above)
-- 3. Use a feature flag to skip this migration in production
--
-- Uncomment the following check if you have a way to detect production:
-- DO $$
-- BEGIN
--   IF current_setting('app.environment', true) = 'production' THEN
--     RAISE EXCEPTION 'BLOCKED: This migration disables RLS and must not run in production. See migration 20251022120000.';
--   END IF;
-- END $$;
-- ================================================================

-- Drop all existing RLS policies on players table
DROP POLICY IF EXISTS "players_visibility" ON public.players;
DROP POLICY IF EXISTS "players_insert" ON public.players;
DROP POLICY IF EXISTS "players_update" ON public.players;
DROP POLICY IF EXISTS "players_delete" ON public.players;

-- Disable RLS on players table
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;

-- Add comment explaining this is temporary
COMMENT ON TABLE public.players IS 'RLS disabled temporarily due to lack of authentication. See migration 20251022120000 for details.';

COMMIT;

-- ================================================================
-- DEPLOYMENT NOTES:
-- ================================================================
--
-- ✅ What this fixes:
-- - Eliminates "infinite recursion detected in policy" error
-- - Allows anonymous clients to read/write players data
-- - Enables Realtime subscriptions to work correctly
-- - Permits E2E tests to function
--
-- ⚠️ Security implications:
-- - Anyone with a room_id can read all players in that room
-- - Anyone can create/update/delete player records (if they know the player_id)
-- - Acceptable for development/testing with UUID-based room IDs
-- - NOT acceptable for production without additional security measures
--
-- 🔐 Recommended production security:
-- 1. Implement Supabase Auth for user identity
-- 2. Re-enable RLS with proper policies using auth.uid()
-- 3. Use SECURITY DEFINER functions to avoid recursion
-- 4. Add server-side validation in Server Actions
--
-- 📝 Example future migration (when auth is implemented):
-- ```sql
-- ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
--
-- CREATE FUNCTION public.is_player_in_room(p_room uuid)
-- RETURNS boolean LANGUAGE sql SECURITY DEFINER
-- SET search_path = public
-- AS $$ SELECT exists(SELECT 1 FROM players WHERE room_id = p_room AND id = auth.uid()); $$;
--
-- CREATE POLICY "players_visibility" ON public.players
--   FOR SELECT USING (public.is_player_in_room(room_id));
-- ```
-- ================================================================
