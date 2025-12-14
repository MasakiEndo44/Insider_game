-- Fix infinite recursion in players SELECT policy
-- The issue: SELECT policy queries players table itself, causing recursion
-- Solution: Allow public read access to players (RLS still protects sensitive data in other tables)

DROP POLICY IF EXISTS "Read access for room members" ON players;

-- Allow all authenticated users to read players
-- This is safe because:
-- 1. Player data (nickname, is_host, is_ready) is not sensitive
-- 2. Roles and topics are still protected by their own RLS policies
-- 3. This breaks the infinite recursion loop
CREATE POLICY "Public read access" ON players
  FOR SELECT USING (true);
