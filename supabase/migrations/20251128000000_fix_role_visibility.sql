-- Fix RLS policy to allow seeing own role during ROLE_ASSIGNMENT phase
-- The previous policy only allowed seeing answerer's role during VOTE phases,
-- but answerer_id is not set until after QUESTION phase

DROP POLICY IF EXISTS "role_secrecy" ON roles;

CREATE POLICY "role_secrecy" ON roles
  FOR SELECT USING (
    -- Can always see own role
    player_id = auth.uid() 
    OR
    -- Can see all roles during RESULT phase
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE id = roles.session_id AND phase = 'RESULT'
    )
    OR
    -- Can see answerer's role during VOTE1 and VOTE2 phases
    -- This allows all players to check if answerer is Master and skip VOTE1 if needed
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = roles.session_id 
        AND gs.phase IN ('VOTE1', 'VOTE2')
        AND gs.answerer_id = roles.player_id
    )
  );
