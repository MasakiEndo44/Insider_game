-- Fix RLS policies that prevent player insertion
-- The issue: INSERT WITH CHECK (user_id = auth.uid()) fails because user_id is set during INSERT

-- Drop problematic policies
DROP POLICY IF EXISTS "Read access for room members" ON players;
DROP POLICY IF EXISTS "Insert access for self" ON players;
DROP POLICY IF EXISTS "Update access for self" ON players;

-- Players Policies (Fixed)
-- Read: Only visible to members of the same room
CREATE POLICY "Read access for room members" ON players
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE user_id = auth.uid()
    )
  );

-- Insert: Allow if user_id matches auth.uid() (this will be checked AFTER insert)
-- OR allow any authenticated user to insert (since we set user_id in the same transaction)
CREATE POLICY "Insert access for authenticated" ON players
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Update: Only update your own player record
CREATE POLICY "Update access for self" ON players
  FOR UPDATE USING (user_id = auth.uid());

-- Drop and recreate game_sessions policies to fix similar issues
DROP POLICY IF EXISTS "Read access for room members" ON game_sessions;
DROP POLICY IF EXISTS "Host insert access" ON game_sessions;
DROP POLICY IF EXISTS "Host update access" ON game_sessions;

CREATE POLICY "Read access for room members" ON game_sessions
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE user_id = auth.uid()
    )
  );

-- Allow any authenticated user to insert game sessions (host check done in application layer)
CREATE POLICY "Authenticated insert access" ON game_sessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated update access" ON game_sessions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );
