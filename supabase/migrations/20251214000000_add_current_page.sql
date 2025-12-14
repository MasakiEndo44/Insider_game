-- 20251214000000_add_current_page.sql
-- プレイヤーの現在のページを追跡するカラムを追加

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS current_page TEXT DEFAULT 'lobby';

-- ロビー遷移時にis_readyもリセットするため、ロビーにいる=準備完了をクリア
COMMENT ON COLUMN players.current_page IS 'プレイヤーの現在のページ（lobby, result等）';
