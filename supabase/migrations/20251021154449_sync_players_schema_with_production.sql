-- ============================================================
-- Sync players table schema with production
-- ============================================================
-- Production database uses different column names than initial migration:
-- - joined_at instead of created_at
-- - Additional columns: user_id, last_heartbeat

-- Add user_id column (nullable, for future auth integration)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add last_heartbeat column (for connection monitoring)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Rename created_at to joined_at (only if created_at exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'players'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE players RENAME COLUMN created_at TO joined_at;
  END IF;
END $$;

-- Add index for heartbeat monitoring
CREATE INDEX IF NOT EXISTS idx_players_heartbeat ON players(last_heartbeat);

COMMENT ON COLUMN players.user_id IS 'Authenticated user ID (for future features)';
COMMENT ON COLUMN players.last_heartbeat IS 'Last heartbeat timestamp (for connection monitoring)';
COMMENT ON COLUMN players.joined_at IS 'Room join timestamp';
