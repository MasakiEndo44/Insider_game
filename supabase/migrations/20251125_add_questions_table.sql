-- 20251125_add_questions_table.sql

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  answer TEXT DEFAULT 'pending' CHECK (answer IN ('pending', 'yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Read: Everyone in the room (or public for MVP simplicity)
CREATE POLICY "public_read_questions" ON questions FOR SELECT USING (true);

-- Insert: Authenticated users (players)
CREATE POLICY "anon_insert_questions" ON questions FOR INSERT WITH CHECK (true);

-- Update: Master only (but for MVP allowing public update for answer)
-- Ideally should check if user is Master, but since we use anonymous auth and role logic is complex in RLS without helper functions,
-- we'll allow update for now and handle logic in client/API.
CREATE POLICY "anon_update_questions" ON questions FOR UPDATE USING (true);
