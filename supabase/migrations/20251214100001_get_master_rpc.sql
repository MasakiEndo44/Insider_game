-- Create RPC function to get master player ID for a session (bypasses RLS)
-- This is needed for VOTE2 phase where we need to exclude master from candidates

CREATE OR REPLACE FUNCTION get_master_for_session(p_session_id UUID)
RETURNS UUID AS $$
DECLARE
    v_master_id UUID;
BEGIN
    SELECT player_id INTO v_master_id
    FROM roles
    WHERE session_id = p_session_id AND role = 'MASTER'
    LIMIT 1;
    
    RETURN v_master_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
