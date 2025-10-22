-- Migration: Add automatic empty room deletion trigger
-- Date: 2025-10-22
-- Purpose: Delete rooms automatically when last player leaves

-- Create function to delete empty rooms
CREATE OR REPLACE FUNCTION delete_empty_room()
RETURNS TRIGGER AS $$
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
  IF v_player_count = 0 THEN
    DELETE FROM rooms WHERE id = v_room_id;

    RAISE NOTICE 'Empty room deleted: %', v_room_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION delete_empty_room IS
  'Automatically deletes a room when the last player leaves.
   Triggered AFTER DELETE on players table.
   Enables passphrase reuse by cleaning up empty rooms immediately.';

-- Create trigger on players table
CREATE TRIGGER trigger_delete_empty_room
  AFTER DELETE ON players
  FOR EACH ROW
  EXECUTE FUNCTION delete_empty_room();

COMMENT ON TRIGGER trigger_delete_empty_room ON players IS
  'Triggers automatic room deletion when player count reaches 0.
   Runs after player is deleted from database.
   Works as backup to application-level cleanup logic.';

-- Grant necessary permissions
-- Note: Trigger runs with SECURITY DEFINER, so it has elevated privileges
-- No additional grants needed for trigger execution

-- Create index to optimize player count queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_players_room_id
  ON players(room_id);

COMMENT ON INDEX idx_players_room_id IS
  'Optimizes player count queries for empty room detection.
   Used by delete_empty_room() trigger function.';
