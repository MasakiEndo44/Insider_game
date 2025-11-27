-- Replace start_game_session with atomic version that includes role assignment
-- This eliminates the need for a separate Edge Function and ensures atomicity

CREATE OR REPLACE FUNCTION start_game_session(
  p_room_id UUID,
  p_category TEXT,
  p_time_limit INT
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_phase TEXT;
  v_player_ids UUID[];
  v_shuffled_ids UUID[];
  v_master_id UUID;
  v_insider_id UUID;
  i INT;
BEGIN
  -- Lock room to prevent concurrent starts
  SELECT phase INTO v_phase FROM rooms WHERE id = p_room_id FOR UPDATE;
  
  IF v_phase NOT IN ('LOBBY', 'RESULT') THEN
    RAISE EXCEPTION 'Game already started';
  END IF;

  -- Create session
  INSERT INTO game_sessions (room_id, category, time_limit, phase, start_time, deadline_epoch)
  VALUES (p_room_id, p_category, p_time_limit, 'DEAL', NOW(), (EXTRACT(EPOCH FROM NOW()) * 1000 + p_time_limit * 1000)::BIGINT)
  RETURNING id INTO v_session_id;

  -- Get connected players
  SELECT ARRAY_AGG(id) INTO v_player_ids
  FROM players
  WHERE room_id = p_room_id AND is_connected = true;

  IF ARRAY_LENGTH(v_player_ids, 1) < 3 THEN
    RAISE EXCEPTION 'Insufficient players (minimum 3 required)';
  END IF;

  -- Shuffle players using random()
  -- Unnest, order by random, and aggregate back
  SELECT ARRAY_AGG(x) INTO v_shuffled_ids
  FROM (SELECT UNNEST(v_player_ids) AS x ORDER BY random()) t;

  -- Assign Roles
  -- 1. Master (First player)
  v_master_id := v_shuffled_ids[1];
  INSERT INTO roles (session_id, player_id, role) VALUES (v_session_id, v_master_id, 'MASTER');
  
  -- 2. Insider (Second player)
  v_insider_id := v_shuffled_ids[2];
  INSERT INTO roles (session_id, player_id, role) VALUES (v_session_id, v_insider_id, 'INSIDER');
  
  -- 3. Citizens (Rest)
  FOR i IN 3..ARRAY_LENGTH(v_shuffled_ids, 1) LOOP
    INSERT INTO roles (session_id, player_id, role) VALUES (v_session_id, v_shuffled_ids[i], 'CITIZEN');
  END LOOP;

  -- Update room phase to trigger client transition
  UPDATE rooms SET phase = 'ROLE_ASSIGNMENT' WHERE id = p_room_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
