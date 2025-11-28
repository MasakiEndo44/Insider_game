-- Fix RLS policy logic error
-- roles.player_id references players.id, NOT auth.users.id
-- We need to check if the role belongs to a player owned by the current user

DROP POLICY IF EXISTS "role_secrecy" ON roles;

CREATE POLICY "role_secrecy" ON roles
  FOR SELECT USING (
    -- Can always see own role (correctly checking via players table)
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
    OR
    -- Can see all roles during RESULT phase
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE id = roles.session_id AND phase = 'RESULT'
    )
    OR
    -- Can see answerer's role during VOTE1 and VOTE2 phases
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = roles.session_id 
        AND gs.phase IN ('VOTE1', 'VOTE2')
        AND gs.answerer_id = roles.player_id
    )
  );
