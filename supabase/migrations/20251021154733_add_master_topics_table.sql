-- ============================================================
-- Add master_topics table (missing from production)
-- ============================================================
-- This table stores the master list of topics for the game.
-- It was defined in the initial migration but wasn't created in production.

CREATE TABLE IF NOT EXISTS master_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_text TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Normal', 'Hard')),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE master_topics IS 'Master topic data';
COMMENT ON COLUMN master_topics.topic_text IS 'Topic text (unique)';
COMMENT ON COLUMN master_topics.difficulty IS 'Difficulty level';
COMMENT ON COLUMN master_topics.category IS 'Category (for future expansion, currently NULL)';

-- Index for efficient difficulty-based queries
CREATE INDEX IF NOT EXISTS idx_master_topics_difficulty ON master_topics(difficulty);

-- Enable Row Level Security
ALTER TABLE master_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all users to read topics (for topic selection)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'master_topics'
    AND policyname = 'master_topics_visibility'
  ) THEN
    CREATE POLICY "master_topics_visibility" ON master_topics
      FOR SELECT
      USING (true);
  END IF;
END $$;
