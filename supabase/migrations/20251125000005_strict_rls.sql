-- Create helper function to check room status securely
CREATE OR REPLACE FUNCTION get_room_status(check_passphrase_hash TEXT)
RETURNS TABLE (room_id UUID, player_count BIGINT, last_updated TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id, 
    COUNT(p.id) FILTER (WHERE p.is_connected = true), 
    r.updated_at
  FROM rooms r
  LEFT JOIN players p ON r.id = p.room_id
  WHERE r.passphrase_hash = check_passphrase_hash
  GROUP BY r.id;
END;
$$;

-- Grant execute permission to anon and authenticated
GRANT EXECUTE ON FUNCTION get_room_status(TEXT) TO anon, authenticated, service_role;

-- Enable RLS on all tables (ensure)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON rooms;
DROP POLICY IF EXISTS "Enable insert for all users" ON rooms;
DROP POLICY IF EXISTS "Enable update for hosts" ON rooms;
DROP POLICY IF EXISTS "Enable read access for all users" ON players;
DROP POLICY IF EXISTS "Enable insert for all users" ON players;
DROP POLICY IF EXISTS "Enable update for users" ON players;
-- (Add other drops if necessary, or just use generic names)

-- Rooms Policies
-- Public read is needed for joinRoom (client-side query)? 
-- Wait, if we use RPC for status, do we still need public read?
-- joinRoom uses: .from('rooms').select().eq('passphrase_hash', passphrase).single()
-- So yes, we still need public read for rooms OR use RPC for joining too.
-- Let's keep rooms public read for now, but restrict players.
DROP POLICY IF EXISTS "Public read access" ON rooms;
CREATE POLICY "Public read access" ON rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert access" ON rooms;
CREATE POLICY "Public insert access" ON rooms FOR INSERT WITH CHECK (true);
-- Update/Delete only by host (or creator? host_id is set after creation)
-- For simplicity and to avoid locking out creator before host_id is set:
-- Allow update if you are the host.
DROP POLICY IF EXISTS "Host update access" ON rooms;
CREATE POLICY "Host update access" ON rooms FOR UPDATE USING (host_id = auth.uid());
DROP POLICY IF EXISTS "Host delete access" ON rooms;
CREATE POLICY "Host delete access" ON rooms FOR DELETE USING (host_id = auth.uid());

-- Players Policies
-- Only visible to members of the same room
DROP POLICY IF EXISTS "Read access for room members" ON players;
CREATE POLICY "Read access for room members" ON players
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE user_id = auth.uid()
    )
  );

-- Insert self
DROP POLICY IF EXISTS "Insert access for self" ON players;
CREATE POLICY "Insert access for self" ON players
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update self
DROP POLICY IF EXISTS "Update access for self" ON players;
CREATE POLICY "Update access for self" ON players
  FOR UPDATE USING (user_id = auth.uid());

-- Game Sessions Policies
-- Visible to room members
DROP POLICY IF EXISTS "Read access for room members" ON game_sessions;
CREATE POLICY "Read access for room members" ON game_sessions
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE user_id = auth.uid()
    )
  );

-- Insert/Update by Host (or anyone in room? Logic usually handled by API/Host)
-- Let's restrict to Host for starting game
DROP POLICY IF EXISTS "Host insert access" ON game_sessions;
CREATE POLICY "Host insert access" ON game_sessions
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM players WHERE user_id = auth.uid() AND is_host = true
    )
  );

DROP POLICY IF EXISTS "Host update access" ON game_sessions;
CREATE POLICY "Host update access" ON game_sessions
  FOR UPDATE USING (
    room_id IN (
      SELECT room_id FROM players WHERE user_id = auth.uid() AND is_host = true
    )
  );

-- Roles Policies
-- Already implemented in previous migration?
-- We should ensure they are correct.
-- "role_secrecy": Own role OR Result phase.
DROP POLICY IF EXISTS "role_secrecy" ON roles;
CREATE POLICY "role_secrecy" ON roles
  FOR SELECT USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE id = roles.session_id AND phase = 'RESULT'
    )
  );

-- Topics Policies
-- "topic_secrecy": Master/Insider OR Result phase.
DROP POLICY IF EXISTS "topic_secrecy" ON topics;
CREATE POLICY "topic_secrecy" ON topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.session_id = topics.session_id
        AND roles.player_id = auth.uid()
        AND roles.role IN ('MASTER', 'INSIDER')
    ) OR
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE id = topics.session_id AND phase = 'RESULT'
    )
  );

-- Votes Policies
-- Visible to room members (simplified for now)
DROP POLICY IF EXISTS "Read access for room members" ON votes;
CREATE POLICY "Read access for room members" ON votes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE room_id IN (
        SELECT room_id FROM players WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Insert access for self" ON votes;
CREATE POLICY "Insert access for self" ON votes
  FOR INSERT WITH CHECK (player_id = auth.uid());

-- Questions Policies
-- Visible to room members
DROP POLICY IF EXISTS "Read access for room members" ON questions;
CREATE POLICY "Read access for room members" ON questions
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM game_sessions 
      WHERE room_id IN (
        SELECT room_id FROM players WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Insert access for self" ON questions;
CREATE POLICY "Insert access for self" ON questions
  FOR INSERT WITH CHECK (player_id = auth.uid());

-- Master answer update
DROP POLICY IF EXISTS "Master update access" ON questions;
CREATE POLICY "Master update access" ON questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.session_id = questions.session_id
        AND roles.player_id = auth.uid()
        AND roles.role = 'MASTER'
    )
  );
