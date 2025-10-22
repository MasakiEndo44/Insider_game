-- Migration: Fix trigger to bypass RLS for room deletion
-- Date: 2025-10-22
-- Purpose: Ensure trigger can delete rooms even with RLS enabled

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_delete_empty_room ON players;
DROP FUNCTION IF EXISTS delete_empty_room();

-- Recreate function with explicit RLS bypass
CREATE OR REPLACE FUNCTION delete_empty_room()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_player_count INTEGER;
BEGIN
  -- Get the room_id from the deleted player
  v_room_id := OLD.room_id;

  -- Count remaining players in the room
  SELECT COUNT(*) INTO v_player_count
  FROM players
  WHERE room_id = v_room_id;

  -- If no players left, delete the room
  -- SECURITY DEFINER ensures this runs with elevated privileges,
  -- bypassing RLS policies on the rooms table
  IF v_player_count = 0 THEN
    -- Use DELETE with explicit schema qualification
    DELETE FROM public.rooms WHERE id = v_room_id;

    RAISE NOTICE 'Empty room deleted: %', v_room_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comment
COMMENT ON FUNCTION delete_empty_room IS
  'Automatically deletes a room when the last player leaves.
   Triggered AFTER DELETE on players table.
   Runs with SECURITY DEFINER to bypass RLS policies.
   Enables passphrase reuse by cleaning up empty rooms immediately.';

-- Recreate trigger on players table
CREATE TRIGGER trigger_delete_empty_room
  AFTER DELETE ON players
  FOR EACH ROW
  EXECUTE FUNCTION delete_empty_room();

COMMENT ON TRIGGER trigger_delete_empty_room ON players IS
  'Triggers automatic room deletion when player count reaches 0.
   Runs after player is deleted from database.
   Works as backup to application-level cleanup logic.';

-- Ensure the function is owned by postgres (service role)
-- This is critical for SECURITY DEFINER to work correctly
ALTER FUNCTION delete_empty_room() OWNER TO postgres;

-- Grant execute permission to authenticated users (for application-level calls)
-- Note: The trigger itself runs with postgres permissions due to SECURITY DEFINER
GRANT EXECUTE ON FUNCTION delete_empty_room() TO authenticated;
