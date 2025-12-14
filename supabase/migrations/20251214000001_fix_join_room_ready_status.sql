-- Fix: Set is_ready to false for new players joining a room
-- Previously, is_ready was set to true which caused players to appear as "準備完了" immediately

CREATE OR REPLACE FUNCTION join_room(
  p_passphrase_hash TEXT,
  p_nickname TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_room_id UUID;
  v_player_id UUID;
  v_player_data JSONB;
BEGIN
  -- 1. Find Room
  SELECT id INTO v_room_id
  FROM rooms
  WHERE passphrase_hash = p_passphrase_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  -- 2. Create Player (is_ready defaults to false, current_page to 'lobby')
  INSERT INTO players (room_id, nickname, is_host, is_ready, is_connected, user_id, current_page)
  VALUES (v_room_id, p_nickname, false, false, true, p_user_id, 'lobby')
  RETURNING id INTO v_player_id;

  -- 3. Return result
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
