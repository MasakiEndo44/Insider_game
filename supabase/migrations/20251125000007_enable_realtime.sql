-- 20251125_enable_realtime.sql
-- Enable Realtime publication for all tables

-- Add tables to supabase_realtime publication
-- This is required for Supabase Realtime to broadcast changes

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'players') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'game_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE roles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'topics') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE topics;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'votes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'results') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE results;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'questions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE questions;
  END IF;
END $$;
