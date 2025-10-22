-- Temporary: Disable RLS on game_sessions and roles tables for E2E testing
-- NOTE: This should be re-enabled with proper policies before production deployment

-- Disable RLS on game_sessions table
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on roles table
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Comment explaining this is temporary
COMMENT ON TABLE game_sessions IS 'RLS temporarily disabled for E2E testing. Must create proper policies before production.';
COMMENT ON TABLE roles IS 'RLS temporarily disabled for E2E testing. Must create proper policies before production.';
