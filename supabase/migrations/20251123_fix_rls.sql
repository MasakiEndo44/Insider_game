-- Fix RLS policies to correctly map player_id to auth.uid()

DROP POLICY IF EXISTS "role_secrecy" ON roles;

CREATE POLICY "role_secrecy" ON roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = roles.player_id
    AND players.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM game_sessions
    WHERE game_sessions.id = roles.session_id
    AND game_sessions.phase = 'RESULT'
  )
);

DROP POLICY IF EXISTS "topic_secrecy" ON topics;

CREATE POLICY "topic_secrecy" ON topics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM roles
    JOIN players ON roles.player_id = players.id
    WHERE roles.session_id = topics.session_id
      AND players.user_id = auth.uid()
      AND roles.role IN ('MASTER', 'INSIDER')
  ) OR
  EXISTS (
    SELECT 1 FROM game_sessions
    WHERE game_sessions.id = topics.session_id
    AND game_sessions.phase = 'RESULT'
  )
);
