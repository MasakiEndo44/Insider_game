-- Fix confirm_role_and_check_phase to only count connected players
-- This fixes the bug where disconnected players prevent phase transition

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

    -- Check if all CONNECTED players in the room have confirmed
    -- Only count players who are currently connected
    
    -- Get total CONNECTED players count in the room
    SELECT COUNT(*) INTO v_total_players
    FROM players
    WHERE room_id = p_room_id AND is_connected = TRUE;

    -- Get confirmed players count for this session
    SELECT COUNT(*) INTO v_confirmed_players
    FROM roles
    WHERE session_id = v_session_id AND is_confirmed = TRUE;

    -- If all connected players confirmed, update phase to TOPIC
    IF v_confirmed_players >= v_total_players AND v_total_players > 0 THEN
        -- Check current phase to avoid double update
        SELECT phase INTO v_current_phase FROM rooms WHERE id = p_room_id;
        
        IF v_current_phase = 'ROLE_ASSIGNMENT' THEN
            UPDATE rooms SET phase = 'TOPIC' WHERE id = p_room_id;
            UPDATE game_sessions SET phase = 'TOPIC' WHERE id = v_session_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
