-- ============================================================
-- Add missing 'phase' column to game_sessions table
-- ============================================================
-- Date: 2025-10-24
-- Issue: Production database missing 'phase' column from initial schema
-- This column is required for game phase management (LOBBY/DEAL/TOPIC/QUESTION/DEBATE/VOTE1/VOTE2/RESULT)
-- ============================================================

BEGIN;

-- Add phase column with NOT NULL constraint
-- Default to 'LOBBY' for any existing sessions (should be none in production)
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'LOBBY';

-- Remove default after adding column (we want explicit phase specification going forward)
ALTER TABLE public.game_sessions
  ALTER COLUMN phase DROP DEFAULT;

-- Add comment for documentation
COMMENT ON COLUMN public.game_sessions.phase IS 'ゲームフェーズ (LOBBY/DEAL/TOPIC/QUESTION/DEBATE/VOTE1/VOTE2/RESULT)';

COMMIT;
