-- 20251123_initial_schema.sql

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passphrase_hash TEXT NOT NULL UNIQUE,
  host_id UUID, -- FK added later
  phase TEXT NOT NULL DEFAULT 'LOBBY',
  is_suspended BOOLEAN DEFAULT false,
  suspended_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  is_ready BOOLEAN DEFAULT false,
  user_id UUID, -- For RLS mapping to auth.users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, nickname)
);

-- Add host_id FK to rooms
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_rooms_host') THEN
        ALTER TABLE rooms ADD CONSTRAINT fk_rooms_host FOREIGN KEY (host_id) REFERENCES players(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  time_limit INT NOT NULL,
  category TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  deadline_epoch BIGINT,
  answerer_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phase TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('MASTER', 'INSIDER', 'CITIZEN')),
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, player_id)
);

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  topic_text TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Master Topics (Master Data)
CREATE TABLE IF NOT EXISTS master_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_text TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('VOTE1', 'VOTE2', 'RUNOFF')),
  vote_value TEXT,
  round INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Results
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('CITIZENS_WIN', 'INSIDER_WIN', 'ALL_LOSE')),
  revealed_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Role Secrecy: Only see your own role, or everyone sees if phase is RESULT
-- Note: This requires game_sessions phase to be updated correctly.
DROP POLICY IF EXISTS "role_secrecy" ON roles;
CREATE POLICY "role_secrecy" ON roles
  FOR SELECT
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE game_sessions.id = roles.session_id 
      AND game_sessions.phase = 'RESULT'
    )
  );

-- Topic Secrecy: Master and Insider see topic, or everyone if phase is RESULT
DROP POLICY IF EXISTS "topic_secrecy" ON topics;
CREATE POLICY "topic_secrecy" ON topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.session_id = topics.session_id
        AND roles.player_id = auth.uid()
        AND roles.role IN ('MASTER', 'INSIDER')
    ) OR
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE game_sessions.id = topics.session_id 
      AND game_sessions.phase = 'RESULT'
    )
  );

-- General Access Policies (Permissive for now to allow development, tighten later)
-- Allow reading everything for now
DROP POLICY IF EXISTS "public_read_rooms" ON rooms;
CREATE POLICY "public_read_rooms" ON rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_players" ON players;
CREATE POLICY "public_read_players" ON players FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_sessions" ON game_sessions;
CREATE POLICY "public_read_sessions" ON game_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_votes" ON votes;
CREATE POLICY "public_read_votes" ON votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_results" ON results;
CREATE POLICY "public_read_results" ON results FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_master_topics" ON master_topics;
CREATE POLICY "public_read_master_topics" ON master_topics FOR SELECT USING (true);

-- Allow insert/update for authenticated (anon) users
DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "anon_insert_players" ON players;
CREATE POLICY "anon_insert_players" ON players FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_players" ON players;
CREATE POLICY "anon_update_players" ON players FOR UPDATE USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON game_sessions;
CREATE POLICY "anon_insert_sessions" ON game_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sessions" ON game_sessions;
CREATE POLICY "anon_update_sessions" ON game_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "anon_insert_votes" ON votes;
CREATE POLICY "anon_insert_votes" ON votes FOR INSERT WITH CHECK (true);

-- Roles and Topics are inserted by Edge Functions (Service Role), so no public insert needed usually.
-- But for testing without Edge Functions initially, we might need it.
-- Keeping it strict for now: Service Role bypasses RLS, so Edge Functions are fine.
