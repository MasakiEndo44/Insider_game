-- Migration: Add automatic room cleanup function and scheduled job
-- Date: 2025-10-22
-- Purpose: Clean up stale rooms to allow passphrase reuse

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cleanup function for stale rooms
CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS TABLE(
  deleted_count INTEGER,
  deleted_room_ids UUID[]
) AS $$
DECLARE
  v_deleted_count INTEGER;
  v_deleted_ids UUID[];
BEGIN
  -- Delete empty lobby rooms older than 24 hours
  WITH deleted_lobby AS (
    DELETE FROM rooms
    WHERE
      phase = 'LOBBY'
      AND created_at < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM players WHERE players.room_id = rooms.id
      )
    RETURNING id
  ),
  -- Delete inactive game rooms older than 7 days
  deleted_inactive AS (
    DELETE FROM rooms
    WHERE
      phase NOT IN ('LOBBY', 'RESULT')
      AND updated_at < NOW() - INTERVAL '7 days'
    RETURNING id
  ),
  -- Delete completed games older than 30 days
  deleted_completed AS (
    DELETE FROM rooms
    WHERE
      phase = 'RESULT'
      AND updated_at < NOW() - INTERVAL '30 days'
    RETURNING id
  ),
  -- Combine all deleted IDs
  all_deleted AS (
    SELECT id FROM deleted_lobby
    UNION ALL
    SELECT id FROM deleted_inactive
    UNION ALL
    SELECT id FROM deleted_completed
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(id)
  INTO v_deleted_count, v_deleted_ids
  FROM all_deleted;

  -- Log cleanup results
  RAISE NOTICE 'cleanup_stale_rooms: Deleted % rooms', COALESCE(v_deleted_count, 0);

  RETURN QUERY SELECT v_deleted_count, v_deleted_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION cleanup_stale_rooms IS
  'Cleans up stale game rooms:
   - Empty lobby rooms > 24 hours old
   - Inactive games > 7 days old
   - Completed games > 30 days old
   Returns count and IDs of deleted rooms';

-- Schedule cleanup job to run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-stale-rooms-daily',
  '0 3 * * *', -- Every day at 3:00 AM UTC
  $$SELECT cleanup_stale_rooms();$$
);

-- Add manual cleanup helper function (for testing/admin use)
CREATE OR REPLACE FUNCTION manual_room_cleanup(
  room_id_to_delete UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  IF room_id_to_delete IS NULL THEN
    -- Run full cleanup
    PERFORM cleanup_stale_rooms();
    RETURN QUERY SELECT TRUE, 'Full cleanup executed successfully';
  ELSE
    -- Delete specific room
    DELETE FROM rooms WHERE id = room_id_to_delete;
    IF FOUND THEN
      RETURN QUERY SELECT TRUE, 'Room deleted successfully';
    ELSE
      RETURN QUERY SELECT FALSE, 'Room not found';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION manual_room_cleanup IS
  'Manual cleanup helper:
   - Call with no args to run full cleanup immediately
   - Pass room_id to delete specific room
   Usage: SELECT * FROM manual_room_cleanup();
          SELECT * FROM manual_room_cleanup(''uuid-here'');';

-- Grant execute permissions to authenticated users (for API access)
GRANT EXECUTE ON FUNCTION manual_room_cleanup TO authenticated;

-- Note: cleanup_stale_rooms is SECURITY DEFINER and runs with elevated privileges
-- Do NOT grant direct execution to regular users for security
