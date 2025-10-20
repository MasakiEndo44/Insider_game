-- ============================================================
-- インサイダーゲーム オンライン版 - 初期スキーマ
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. rooms テーブル
-- ============================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passphrase_hash TEXT NOT NULL UNIQUE,
  host_id UUID,
  phase TEXT NOT NULL DEFAULT 'LOBBY' CHECK (phase IN (
    'LOBBY', 'DEAL', 'TOPIC', 'QUESTION', 'DEBATE',
    'VOTE1', 'VOTE2', 'VOTE2_RUNOFF', 'RESULT'
  )),
  is_suspended BOOLEAN DEFAULT false,
  suspended_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE rooms IS 'ゲームルーム情報';
COMMENT ON COLUMN rooms.passphrase_hash IS '合言葉（Argon2idハッシュ化）';
COMMENT ON COLUMN rooms.host_id IS 'ホストプレイヤーID（playersへの外部キー、後で設定）';
COMMENT ON COLUMN rooms.phase IS '現在のゲームフェーズ';
COMMENT ON COLUMN rooms.is_suspended IS '中断フラグ';
COMMENT ON COLUMN rooms.suspended_state IS '中断時の状態スナップショット（JSONB）';

-- インデックス
CREATE INDEX idx_rooms_passphrase ON rooms(passphrase_hash);
CREATE INDEX idx_rooms_phase ON rooms(phase);
CREATE INDEX idx_rooms_suspended ON rooms(is_suspended, updated_at) WHERE is_suspended = true;

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. players テーブル
-- ============================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_nickname_per_room UNIQUE(room_id, nickname)
);

COMMENT ON TABLE players IS 'プレイヤー情報';
COMMENT ON COLUMN players.nickname IS 'ニックネーム（ルーム内でユニーク）';
COMMENT ON COLUMN players.is_host IS 'ホストフラグ';
COMMENT ON COLUMN players.is_connected IS '接続状態（Heartbeat監視）';
COMMENT ON COLUMN players.confirmed IS 'フェーズ確認フラグ（役職・お題確認など）';

-- インデックス
CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_players_connected ON players(is_connected);

-- roomsテーブルへの外部キー制約を追加
ALTER TABLE rooms
  ADD CONSTRAINT fk_rooms_host
  FOREIGN KEY (host_id) REFERENCES players(id) ON DELETE SET NULL;

-- ============================================================
-- 3. game_sessions テーブル
-- ============================================================
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Normal', 'Hard')),
  start_time TIMESTAMP WITH TIME ZONE,
  deadline_epoch BIGINT,
  answerer_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phase TEXT NOT NULL,
  prev_master_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE game_sessions IS 'ゲームセッション（ラウンド単位）';
COMMENT ON COLUMN game_sessions.difficulty IS 'お題難易度';
COMMENT ON COLUMN game_sessions.start_time IS 'フェーズ開始時刻';
COMMENT ON COLUMN game_sessions.deadline_epoch IS 'タイマー締切（Unixエポック秒）';
COMMENT ON COLUMN game_sessions.answerer_id IS '正解者ID';
COMMENT ON COLUMN game_sessions.prev_master_id IS '前回マスターID（役職配布ロジックで使用）';

-- インデックス
CREATE INDEX idx_sessions_room ON game_sessions(room_id);
CREATE INDEX idx_sessions_phase ON game_sessions(phase);

-- ============================================================
-- 4. roles テーブル
-- ============================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('MASTER', 'INSIDER', 'CITIZEN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_role_per_session UNIQUE(session_id, player_id)
);

COMMENT ON TABLE roles IS '役職割り当て';
COMMENT ON COLUMN roles.role IS 'プレイヤーの役職';

-- インデックス
CREATE INDEX idx_roles_session ON roles(session_id);
CREATE INDEX idx_roles_player ON roles(player_id);
CREATE INDEX idx_roles_session_role ON roles(session_id, role);

-- ============================================================
-- 5. master_topics テーブル（お題マスターデータ）
-- ============================================================
CREATE TABLE master_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_text TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Normal', 'Hard')),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE master_topics IS 'お題マスターデータ';
COMMENT ON COLUMN master_topics.topic_text IS 'お題テキスト（ユニーク）';
COMMENT ON COLUMN master_topics.difficulty IS '難易度';
COMMENT ON COLUMN master_topics.category IS 'カテゴリ（将来の拡張用、現状NULL）';

-- インデックス
CREATE INDEX idx_master_topics_difficulty ON master_topics(difficulty);

-- ============================================================
-- 6. topics テーブル（セッションで使用されたお題）
-- ============================================================
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  topic_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Normal', 'Hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE topics IS 'セッションで使用されたお題';

-- インデックス
CREATE INDEX idx_topics_session ON topics(session_id);

-- ============================================================
-- 7. used_topics テーブル（セッション内重複防止）
-- ============================================================
CREATE TABLE used_topics (
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  PRIMARY KEY(session_id, topic_id)
);

COMMENT ON TABLE used_topics IS 'セッション内で使用済みのお題ID';

-- ============================================================
-- 8. votes テーブル
-- ============================================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('VOTE1', 'VOTE2', 'RUNOFF')),
  vote_value TEXT,
  round INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE votes IS '投票データ';
COMMENT ON COLUMN votes.vote_type IS '投票種別（第一投票/第二投票/決選投票）';
COMMENT ON COLUMN votes.vote_value IS '投票内容（VOTE1: yes/no, VOTE2/RUNOFF: 候補プレイヤーID）';
COMMENT ON COLUMN votes.round IS '決選投票の回数';

-- インデックス
CREATE INDEX idx_votes_session ON votes(session_id);
CREATE INDEX idx_votes_player ON votes(player_id);
CREATE INDEX idx_votes_type_round ON votes(vote_type, round);

-- ============================================================
-- 9. results テーブル
-- ============================================================
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('CITIZENS_WIN', 'INSIDER_WIN', 'ALL_LOSE')),
  revealed_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE results IS 'ゲーム結果';
COMMENT ON COLUMN results.outcome IS '勝敗結果';
COMMENT ON COLUMN results.revealed_player_id IS '公開されたプレイヤーID（正解者またはインサイダー容疑者）';

-- インデックス
CREATE INDEX idx_results_session ON results(session_id);

-- ============================================================
-- Row Level Security (RLS) 有効化
-- ============================================================

-- すべてのテーブルでRLSを有効化
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLSポリシー定義
-- ============================================================

-- ------------------------------------------------------------
-- rooms: 参加者全員が見える
-- ------------------------------------------------------------
CREATE POLICY "rooms_visibility" ON rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.room_id = rooms.id
        AND players.id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT
  WITH CHECK (true); -- ルーム作成は誰でも可能

CREATE POLICY "rooms_update" ON rooms
  FOR UPDATE
  USING (host_id = auth.uid()) -- ホストのみ更新可能
  WITH CHECK (host_id = auth.uid());

-- ------------------------------------------------------------
-- players: 同じルームの人全員が見える
-- ------------------------------------------------------------
CREATE POLICY "players_visibility" ON players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM players AS p
      WHERE p.room_id = players.room_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY "players_insert" ON players
  FOR INSERT
  WITH CHECK (id = auth.uid()); -- 自分で自分を追加

CREATE POLICY "players_update" ON players
  FOR UPDATE
  USING (id = auth.uid()) -- 自分の情報のみ更新
  WITH CHECK (id = auth.uid());

CREATE POLICY "players_delete" ON players
  FOR DELETE
  USING (id = auth.uid()); -- 自分で自分を削除（退室）

-- ------------------------------------------------------------
-- game_sessions: 同じルームの人全員が見える
-- ------------------------------------------------------------
CREATE POLICY "sessions_visibility" ON game_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM players
      WHERE players.room_id = game_sessions.room_id
        AND players.id = auth.uid()
    )
  );

CREATE POLICY "sessions_insert" ON game_sessions
  FOR INSERT
  WITH CHECK (true); -- Edge Functionから挿入

-- ------------------------------------------------------------
-- roles: 自分の役職のみ見える（結果フェーズは全員見える）
-- ------------------------------------------------------------
CREATE POLICY "role_secrecy" ON roles
  FOR SELECT
  USING (
    player_id = auth.uid() OR
    (SELECT phase FROM game_sessions WHERE id = session_id) = 'RESULT'
  );

CREATE POLICY "role_insert" ON roles
  FOR INSERT
  WITH CHECK (true); -- Edge Functionから挿入

-- ------------------------------------------------------------
-- master_topics: 全員が読み取り可能（お題選択用）
-- ------------------------------------------------------------
CREATE POLICY "master_topics_visibility" ON master_topics
  FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- topics: マスターとインサイダーのみ見える
-- ------------------------------------------------------------
CREATE POLICY "topic_secrecy" ON topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM roles
      WHERE session_id = topics.session_id
        AND player_id = auth.uid()
        AND role IN ('MASTER', 'INSIDER')
    )
  );

CREATE POLICY "topic_insert" ON topics
  FOR INSERT
  WITH CHECK (true); -- Edge Functionから挿入

-- ------------------------------------------------------------
-- used_topics: Edge Functionのみがアクセス
-- ------------------------------------------------------------
CREATE POLICY "used_topics_insert" ON used_topics
  FOR INSERT
  WITH CHECK (true);

-- ------------------------------------------------------------
-- votes: 投票中は自分の票のみ、結果フェーズで全員見える
-- ------------------------------------------------------------
CREATE POLICY "vote_secrecy" ON votes
  FOR SELECT
  USING (
    player_id = auth.uid() OR
    (SELECT phase FROM game_sessions WHERE id = session_id) = 'RESULT'
  );

CREATE POLICY "vote_insert" ON votes
  FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- ------------------------------------------------------------
-- results: 同じセッションの人全員が見える
-- ------------------------------------------------------------
CREATE POLICY "results_visibility" ON results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM game_sessions
      JOIN players ON players.room_id = game_sessions.room_id
      WHERE game_sessions.id = results.session_id
        AND players.id = auth.uid()
    )
  );

CREATE POLICY "results_insert" ON results
  FOR INSERT
  WITH CHECK (true); -- Edge Functionから挿入

-- ============================================================
-- 完了
-- ============================================================
COMMENT ON SCHEMA public IS 'インサイダーゲーム オンライン版 - 初期スキーマ';
