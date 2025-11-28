-- Create atomic RPC for room creation to reduce API requests and prevent 429 errors
-- This replaces the multi-step client-side logic with a single database transaction

CREATE OR REPLACE FUNCTION create_room_with_host(
  p_passphrase_hash TEXT,
  p_nickname TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_existing_room RECORD;
  v_player_count INT;
  v_room_id UUID;
  v_player_id UUID;
  v_player_data JSONB;
BEGIN
  -- 1. Check for existing room
  SELECT id, updated_at INTO v_existing_room
  FROM rooms
  WHERE passphrase_hash = p_passphrase_hash;

  IF FOUND THEN
    -- Count connected players
    SELECT COUNT(*) INTO v_player_count
    FROM players
    WHERE room_id = v_existing_room.id AND is_connected = true;

    -- Check if expired (older than 2 hours) or empty
    IF v_existing_room.updated_at < NOW() - INTERVAL '2 hours' OR v_player_count = 0 THEN
      -- Delete old room (CASCADE will handle players)
      DELETE FROM rooms WHERE id = v_existing_room.id;
    ELSE
      RAISE EXCEPTION 'DUPLICATE_ROOM';
    END IF;
  END IF;

  -- 2. Create Room
  INSERT INTO rooms (passphrase_hash, phase)
  VALUES (p_passphrase_hash, 'LOBBY')
  RETURNING id INTO v_room_id;

  -- 3. Create Host Player
  INSERT INTO players (room_id, nickname, is_host, is_ready, is_connected, user_id)
  VALUES (v_room_id, p_nickname, true, true, true, p_user_id)
  RETURNING id INTO v_player_id;

  -- 4. Update Room with host_id
  UPDATE rooms SET host_id = v_player_id WHERE id = v_room_id;

  -- 5. Return result
  SELECT jsonb_build_object(
    'roomId', v_room_id,
    'player', jsonb_build_object(
      'id', id,
      'nickname', nickname,
      'isHost', is_host,
      'isReady', is_ready,
      'isConnected', is_connected,
      'userId', user_id
    )
  ) INTO v_player_data
  FROM players WHERE id = v_player_id;

  RETURN v_player_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
