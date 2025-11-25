-- Add RPC function to safely clean up old/empty rooms
CREATE OR REPLACE FUNCTION cleanup_room(check_passphrase_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_to_delete UUID;
  active_players BIGINT;
  room_updated_at TIMESTAMPTZ;
BEGIN
  -- Find the room
  SELECT id, updated_at INTO room_to_delete, room_updated_at
  FROM rooms
  WHERE passphrase_hash = check_passphrase_hash;

  IF room_to_delete IS NULL THEN
    RETURN FALSE; -- No room found
  END IF;

  -- Count active players
  SELECT COUNT(*) INTO active_players
  FROM players
  WHERE room_id = room_to_delete AND is_connected = true;

  -- Check if room is expired (older than 2 hours)
  IF active_players = 0 OR room_updated_at < NOW() - INTERVAL '2 hours' THEN
    -- Delete the room (CASCADE will handle related records)
    DELETE FROM rooms WHERE id = room_to_delete;
    RETURN TRUE;
  END IF;

  RETURN FALSE; -- Room is still active
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_room(TEXT) TO anon, authenticated, service_role;
