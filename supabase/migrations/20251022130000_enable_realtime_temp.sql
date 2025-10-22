-- ================================================================
-- Migration: Enable Realtime for development/testing
-- Date: 2025-10-22
-- Purpose: Allow anonymous clients to subscribe to Realtime channels
-- ================================================================
--
-- CONTEXT:
-- Realtime WebSocket connections are failing with 403 Forbidden
-- because tables aren't added to the publication and RLS blocks access.
--
-- SOLUTION:
-- 1. Add tables to supabase_realtime publication
-- 2. Grant usage on realtime schema to anon role
--
-- NOTE: This is temporary for development. Production should use
-- proper authentication and RLS policies.
-- ================================================================

BEGIN;

-- Add tables to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- Grant necessary permissions to anon role for Realtime
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA realtime TO anon;

COMMENT ON TABLE public.rooms IS 'Realtime enabled for development. See migration 20251022130000.';
COMMENT ON TABLE public.players IS 'Realtime enabled for development. See migration 20251022130000.';

COMMIT;
