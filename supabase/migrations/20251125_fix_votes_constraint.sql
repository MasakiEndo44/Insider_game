-- 20251125_fix_votes_constraint.sql

-- まず重複データを削除（最新の投票を残すか、古い方を残すか... IDが新しい方を残すのが一般的だが、ここでは単純にID比較で重複排除）
DELETE FROM votes a USING votes b
WHERE a.id < b.id 
  AND a.session_id = b.session_id 
  AND a.player_id = b.player_id 
  AND a.vote_type = b.vote_type;

-- ユニーク制約を追加
ALTER TABLE votes 
ADD CONSTRAINT votes_session_player_type_key 
UNIQUE (session_id, player_id, vote_type);
