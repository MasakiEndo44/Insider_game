-- Add is_confirmed column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;

-- Create RPC function to confirm role and check if all players have confirmed
CREATE OR REPLACE FUNCTION confirm_role_and_check_phase(p_room_id UUID, p_player_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session_id UUID;
    v_total_players INT;
    v_confirmed_players INT;
    v_current_phase TEXT;
BEGIN
    -- Get the latest session for the room
    SELECT id INTO v_session_id
    FROM game_sessions
    WHERE room_id = p_room_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'No active session found for room %', p_room_id;
    END IF;

    -- Update the player's role confirmation status
    UPDATE roles
    SET is_confirmed = TRUE
    WHERE session_id = v_session_id AND player_id = p_player_id;

    -- Check if all players in the room have confirmed
    -- We count players in the room, and check if they have a confirmed role in the current session
    
    -- Get total players count in the room
    SELECT COUNT(*) INTO v_total_players
    FROM players
    WHERE room_id = p_room_id;

    -- Get confirmed players count for this session
    SELECT COUNT(*) INTO v_confirmed_players
    FROM roles
    WHERE session_id = v_session_id AND is_confirmed = TRUE;

    -- If all players confirmed, update phase to TOPIC
    IF v_confirmed_players >= v_total_players THEN
        -- Check current phase to avoid double update
        SELECT phase INTO v_current_phase FROM rooms WHERE id = p_room_id;
        
        IF v_current_phase = 'ROLE_ASSIGNMENT' THEN
            UPDATE rooms SET phase = 'TOPIC' WHERE id = p_room_id;
            UPDATE game_sessions SET phase = 'TOPIC' WHERE id = v_session_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
