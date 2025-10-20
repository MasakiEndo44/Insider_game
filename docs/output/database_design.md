# データベース設計書

最終更新: 2025-10-20
バージョン: 1.0

---

## 目次

1. [概要](#概要)
2. [Migrationファイル](#migrationファイル)
3. [シードデータ](#シードデータ)
4. [インデックス戦略](#インデックス戦略)
5. [パフォーマンス最適化](#パフォーマンス最適化)

---

## 概要

本データベース設計は、Supabase PostgreSQL 15.xを対象とし、以下の原則に基づいています：

- **正規化**: 第三正規形（3NF）を基本とし、パフォーマンス要件に応じて非正規化
- **セキュリティ**: Row Level Security (RLS) による役職・お題の秘匿
- **スケーラビリティ**: インデックス最適化とパーティショニング（将来）
- **トランザクション**: ACID特性による投票集計の整合性保証

**使用するデータ型**:
- `UUID`: 主キー、外部キー（gen_random_uuid()でサーバー生成）
- `TEXT`: 可変長文字列（合言葉、ニックネーム、お題など）
- `TIMESTAMP WITH TIME ZONE`: タイムスタンプ（UTC保存）
- `BIGINT`: Unixエポック秒（タイマー締切）
- `JSONB`: 構造化データ（中断時スナップショット）
- `BOOLEAN`: フラグ（is_host, is_connectedなど）

---

## Migrationファイル

### 初期スキーマ作成

**ファイル名**: `supabase/migrations/20250101000000_initial_schema.sql`

```sql
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
```

---

## シードデータ

### お題データ挿入

**ファイル名**: `supabase/migrations/20250101000001_seed_topics.sql`

```sql
-- ============================================================
-- お題マスターデータ - シード
-- ============================================================

-- Easy難易度（50問）
INSERT INTO master_topics (topic_text, difficulty) VALUES
  ('りんご', 'Easy'),
  ('犬', 'Easy'),
  ('本', 'Easy'),
  ('車', 'Easy'),
  ('コーヒー', 'Easy'),
  ('ピザ', 'Easy'),
  ('テレビ', 'Easy'),
  ('スマホ', 'Easy'),
  ('傘', 'Easy'),
  ('靴', 'Easy'),
  ('時計', 'Easy'),
  ('冷蔵庫', 'Easy'),
  ('自転車', 'Easy'),
  ('椅子', 'Easy'),
  ('机', 'Easy'),
  ('ペン', 'Easy'),
  ('ノート', 'Easy'),
  ('眼鏡', 'Easy'),
  ('バッグ', 'Easy'),
  ('カメラ', 'Easy'),
  ('音楽', 'Easy'),
  ('映画', 'Easy'),
  ('ゲーム', 'Easy'),
  ('野球', 'Easy'),
  ('サッカー', 'Easy'),
  ('水', 'Easy'),
  ('米', 'Easy'),
  ('パン', 'Easy'),
  ('卵', 'Easy'),
  ('魚', 'Easy'),
  ('肉', 'Easy'),
  ('野菜', 'Easy'),
  ('果物', 'Easy'),
  ('お茶', 'Easy'),
  ('ジュース', 'Easy'),
  ('学校', 'Easy'),
  ('会社', 'Easy'),
  ('病院', 'Easy'),
  ('駅', 'Easy'),
  ('空港', 'Easy'),
  ('公園', 'Easy'),
  ('海', 'Easy'),
  ('山', 'Easy'),
  ('川', 'Easy'),
  ('天気', 'Easy'),
  ('春', 'Easy'),
  ('夏', 'Easy'),
  ('秋', 'Easy'),
  ('冬', 'Easy'),
  ('猫', 'Easy');

-- Normal難易度（50問）
INSERT INTO master_topics (topic_text, difficulty) VALUES
  ('寿司', 'Normal'),
  ('ラーメン', 'Normal'),
  ('カレー', 'Normal'),
  ('おにぎり', 'Normal'),
  ('天ぷら', 'Normal'),
  ('焼き鳥', 'Normal'),
  ('餃子', 'Normal'),
  ('刺身', 'Normal'),
  ('うどん', 'Normal'),
  ('そば', 'Normal'),
  ('東京タワー', 'Normal'),
  ('富士山', 'Normal'),
  ('京都', 'Normal'),
  ('沖縄', 'Normal'),
  ('北海道', 'Normal'),
  ('桜', 'Normal'),
  ('紅葉', 'Normal'),
  ('花火', 'Normal'),
  ('温泉', 'Normal'),
  ('祭り', 'Normal'),
  ('野球場', 'Normal'),
  ('サッカー場', 'Normal'),
  ('ジム', 'Normal'),
  ('プール', 'Normal'),
  ('図書館', 'Normal'),
  ('美術館', 'Normal'),
  ('水族館', 'Normal'),
  ('動物園', 'Normal'),
  ('遊園地', 'Normal'),
  ('カラオケ', 'Normal'),
  ('ボーリング', 'Normal'),
  ('キャンプ', 'Normal'),
  ('バーベキュー', 'Normal'),
  ('登山', 'Normal'),
  ('釣り', 'Normal'),
  ('スキー', 'Normal'),
  ('スノーボード', 'Normal'),
  ('サーフィン', 'Normal'),
  ('ダイビング', 'Normal'),
  ('ヨガ', 'Normal'),
  ('マラソン', 'Normal'),
  ('テニス', 'Normal'),
  ('バスケットボール', 'Normal'),
  ('バレーボール', 'Normal'),
  ('卓球', 'Normal'),
  ('バドミントン', 'Normal'),
  ('ゴルフ', 'Normal'),
  ('ビリヤード', 'Normal'),
  ('ダーツ', 'Normal'),
  ('将棋', 'Normal');

-- Hard難易度（30問）
INSERT INTO master_topics (topic_text, difficulty) VALUES
  ('量子コンピュータ', 'Hard'),
  ('ブロックチェーン', 'Hard'),
  ('人工知能', 'Hard'),
  ('機械学習', 'Hard'),
  ('遺伝子編集', 'Hard'),
  ('クローン技術', 'Hard'),
  ('再生医療', 'Hard'),
  ('核融合', 'Hard'),
  ('相対性理論', 'Hard'),
  ('量子力学', 'Hard'),
  ('暗号通貨', 'Hard'),
  ('メタバース', 'Hard'),
  ('ニューラルネットワーク', 'Hard'),
  ('ディープラーニング', 'Hard'),
  ('量子もつれ', 'Hard'),
  ('超伝導', 'Hard'),
  ('ナノテクノロジー', 'Hard'),
  ('バイオインフォマティクス', 'Hard'),
  ('プロテオミクス', 'Hard'),
  ('エピジェネティクス', 'Hard'),
  ('シンギュラリティ', 'Hard'),
  ('ビッグバン理論', 'Hard'),
  ('ダークマター', 'Hard'),
  ('ワームホール', 'Hard'),
  ('タキオン', 'Hard'),
  ('超ひも理論', 'Hard'),
  ('多世界解釈', 'Hard'),
  ('シュレディンガーの猫', 'Hard'),
  ('ハイゼンベルクの不確定性原理', 'Hard'),
  ('プランク定数', 'Hard');

-- 合計130問確認
SELECT difficulty, COUNT(*) as count
FROM master_topics
GROUP BY difficulty
ORDER BY difficulty;

COMMENT ON TABLE master_topics IS 'お題マスターデータ（Easy 50問、Normal 50問、Hard 30問）';
```

---

## インデックス戦略

### 既存インデックスの説明

| テーブル | インデックス | カラム | 用途 |
|---------|------------|--------|------|
| rooms | idx_rooms_passphrase | passphrase_hash | ルーム検索（参加時） |
| rooms | idx_rooms_phase | phase | フェーズ別ルーム集計 |
| rooms | idx_rooms_suspended | is_suspended, updated_at | 中断ルーム自動削除クエリ |
| players | idx_players_room | room_id | ルーム内プレイヤー一覧 |
| players | idx_players_connected | is_connected | 接続状態監視 |
| game_sessions | idx_sessions_room | room_id | ルーム内セッション一覧 |
| game_sessions | idx_sessions_phase | phase | フェーズ別セッション集計 |
| roles | idx_roles_session | session_id | セッション内役職一覧 |
| roles | idx_roles_player | player_id | プレイヤーの役職取得 |
| roles | idx_roles_session_role | session_id, role | 役職別フィルタ（マスター・インサイダー検索） |
| master_topics | idx_master_topics_difficulty | difficulty | 難易度別お題抽出 |
| topics | idx_topics_session | session_id | セッションのお題取得 |
| votes | idx_votes_session | session_id | セッション内投票一覧 |
| votes | idx_votes_player | player_id | プレイヤーの投票履歴 |
| votes | idx_votes_type_round | vote_type, round | 投票種別・回数別集計 |
| results | idx_results_session | session_id | セッション結果取得 |

### パフォーマンス検証クエリ

```sql
-- インデックスの使用状況確認
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- テーブルサイズ確認
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## パフォーマンス最適化

### 1. クエリ最適化例

#### ルーム参加時の合言葉検証
```sql
-- 最適化前（フルスキャン）
SELECT * FROM rooms WHERE passphrase_hash = $1;

-- 最適化後（インデックス使用、必要カラムのみ）
SELECT id, phase, is_suspended
FROM rooms
WHERE passphrase_hash = $1
LIMIT 1;
```

**Explain Analyze**:
```
Index Scan using idx_rooms_passphrase on rooms (cost=0.15..8.17 rows=1 width=120)
  Index Cond: (passphrase_hash = '...')
```

#### セッション内の役職取得
```sql
-- 最適化前
SELECT r.* FROM roles r
JOIN game_sessions s ON r.session_id = s.id
WHERE s.room_id = $1;

-- 最適化後（サブクエリ排除）
SELECT r.*
FROM roles r
WHERE r.session_id = (
  SELECT id FROM game_sessions
  WHERE room_id = $1
  ORDER BY created_at DESC
  LIMIT 1
);
```

### 2. トランザクション例

#### 投票集計（ACID保証）
```sql
BEGIN;

-- 全員投票完了確認
SELECT COUNT(*) FROM votes
WHERE session_id = $1 AND vote_type = $2;

-- 集計処理
INSERT INTO results (session_id, outcome, revealed_player_id)
VALUES ($1, $2, $3);

-- フェーズ更新
UPDATE game_sessions
SET phase = 'RESULT'
WHERE id = $1;

COMMIT;
```

### 3. N+1クエリ防止

#### プレイヤー一覧と役職の取得
```sql
-- ❌ N+1クエリ（悪い例）
SELECT * FROM players WHERE room_id = $1;
-- 各プレイヤーごとに
SELECT * FROM roles WHERE player_id = $player_id;

-- ✅ JOINで一括取得（良い例）
SELECT
  p.id,
  p.nickname,
  p.is_host,
  p.is_connected,
  r.role
FROM players p
LEFT JOIN roles r ON r.player_id = p.id
WHERE p.room_id = $1
AND (r.session_id = $2 OR r.session_id IS NULL);
```

### 4. パーティショニング（将来の拡張）

**100万ルーム超えた場合のパーティショニング案**:

```sql
-- 月別パーティショニング（将来）
CREATE TABLE rooms_2025_01 PARTITION OF rooms
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE rooms_2025_02 PARTITION OF rooms
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 5. バキューム戦略

```sql
-- 自動バキューム設定確認
SELECT relname, n_tup_ins, n_tup_upd, n_tup_del, last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_upd + n_tup_del DESC;

-- 手動バキューム（メンテナンス時）
VACUUM ANALYZE rooms;
VACUUM ANALYZE players;
VACUUM ANALYZE votes;
```

---

## まとめ

本データベース設計書は、実装時に以下のファイルとして使用されます：

1. **Migration SQL**: `supabase/migrations/` 配下に配置
2. **RLSポリシー**: Supabase Dashboardで検証可能
3. **シードデータ**: 開発環境・本番環境で実行

**次のステップ**:
- Supabase Local Development環境でMigration実行
- RLSポリシーのE2Eテスト
- シードデータの投入と検証

**参考資料**:
- Supabase Migrations: https://supabase.com/docs/guides/cli/local-development#database-migrations
- PostgreSQL Indexing: https://www.postgresql.org/docs/15/indexes.html
- RLS Performance: https://supabase.com/docs/guides/database/postgres/row-level-security#performance
