-- Debug: Allow all updates to rooms to verify RLS is the blocker
DROP POLICY IF EXISTS "Host update access" ON rooms;

CREATE POLICY "Debug update access" ON rooms FOR UPDATE USING (true);
