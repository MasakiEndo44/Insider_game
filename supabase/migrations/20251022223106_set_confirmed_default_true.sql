-- ================================================================
-- Migration: Set confirmed default to true (auto-ready on join)
-- Date: 2025-10-22
-- Purpose: Players are automatically ready when joining room
-- ================================================================
--
-- DESIGN DECISION:
-- Players should NOT need to click a Ready button after joining.
-- Joining a room implies readiness to play.
--
-- This migration:
-- 1. Changes DEFAULT value from false to true
-- 2. Updates existing players to confirmed = true
-- 3. Aligns with simplified UX (no ready button needed)
--
-- Related Changes:
-- - gameMachine.ts: allPlayersReady guard updated to 3+ players
-- - lobby/page.tsx: Button logic already checks readyCount correctly
-- ================================================================

BEGIN;

-- ================================================================
-- Step 1: Change DEFAULT value for new players
-- ================================================================
ALTER TABLE public.players
ALTER COLUMN confirmed
SET DEFAULT true;

-- ================================================================
-- Step 2: Update existing players to ready status
-- ================================================================
-- This ensures all current players in rooms are marked as ready
UPDATE public.players
SET confirmed = true
WHERE confirmed = false;

-- ================================================================
-- Step 3: Add helpful comment
-- ================================================================
COMMENT ON COLUMN public.players.confirmed IS
'Auto-set to true on join. Players are ready by default. Updated 2025-10-22.';

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ================================================================
--
-- 1. Check default value changed:
-- SELECT column_default
-- FROM information_schema.columns
-- WHERE table_name = 'players' AND column_name = 'confirmed';
-- Expected: true
--
-- 2. Check all players are ready:
-- SELECT room_id, nickname, confirmed
-- FROM players
-- ORDER BY joined_at DESC;
-- Expected: All rows have confirmed = true
--
-- 3. Test new player join:
-- INSERT INTO players (room_id, nickname) VALUES ('<test-room>', 'Test Player');
-- SELECT confirmed FROM players WHERE nickname = 'Test Player';
-- Expected: true (auto-set by DEFAULT)
-- ================================================================
