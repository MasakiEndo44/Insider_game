-- ============================================================
-- Disable RLS on game tables for Server Actions
-- ============================================================
-- Date: 2025-10-24
-- Issue: Server Actions run in unauthenticated context, RLS blocks INSERT operations
-- This is a temporary workaround until proper service role authentication is implemented
-- ============================================================

BEGIN;

-- Disable RLS on game_sessions table
ALTER TABLE public.game_sessions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on roles table
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on topics table
ALTER TABLE public.topics DISABLE ROW LEVEL SECURITY;

-- Add comments documenting this is temporary
COMMENT ON TABLE public.game_sessions IS 'RLS temporarily disabled for Server Actions. Must implement service role auth before production.';
COMMENT ON TABLE public.roles IS 'RLS temporarily disabled for Server Actions. Must implement service role auth before production.';
COMMENT ON TABLE public.topics IS 'RLS temporarily disabled for Server Actions. Must implement service role auth before production.';

COMMIT;
