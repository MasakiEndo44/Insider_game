# Phase 4 実装計画: Supabase MCP 活用編

本ドキュメントは、Phase 4 (Supabase統合) を Supabase MCP サーバーを活用して効率的に進めるための具体的な手順書です。

## 前提条件
- **Supabase プロジェクト**: `supabase-insider-game` (ID: `qqvxtmjyrjbzemxnfdwy`) が存在することを確認済み。
- **MCP サーバー**: `supabase-mcp-server` が利用可能であること。

---

## 1. データベース構築 (Week 5)

MCP の `mcp0_execute_sql` および `mcp0_apply_migration` ツールを使用して、データベーススキーマを構築します。

### 1.1 スキーマ適用
`docs/IMPLEMENTATION_PLAN.md` の 4.2 節で定義されたスキーマを適用します。

**使用ツール**: `mcp0_execute_sql`
**実行内容**:
1. `rooms`, `players`, `game_sessions`, `roles`, `topics`, `votes`, `results` テーブルの作成。
2. `master_topics` テーブルの作成。

### 1.2 RLS (Row Level Security) 設定
データの安全性を確保するため、RLS ポリシーを適用します。

**使用ツール**: `mcp0_execute_sql`
**実行内容**:
1. 各テーブルの RLS 有効化 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
2. `roles` テーブルへの「自分のみ参照可能」ポリシー適用。
3. `topics` テーブルへの「マスター/インサイダーのみ参照可能」ポリシー適用。

### 1.3 マスターデータ投入
お題のマスターデータを投入します。

**使用ツール**: `mcp0_execute_sql`
**実行内容**:
- `master_topics` テーブルへの初期データ (食べ物, 動物, 場所など) の INSERT。

---

## 2. Edge Functions 実装 (Week 6)

サーバーサイドロジックを Edge Functions として実装・デプロイします。

### 2.1 役職割り当て (`assign-roles`)
ゲーム開始時に役職をランダムに割り当てる関数。

**使用ツール**: `mcp0_deploy_edge_function`
**手順**:
1. ローカルで `supabase/functions/assign-roles/index.ts` を作成。
2. `mcp0_deploy_edge_function` を呼び出し、コードをデプロイ。
   - **依存関係**: `supabase-js`
   - **ロジック**: プレイヤーリスト取得 -> シャッフル -> 役職割り当て -> DB保存。

### 2.2 お題選択 (`select-topic`)
カテゴリに基づいてお題をランダムに選択する関数。

**使用ツール**: `mcp0_deploy_edge_function`
**手順**:
1. ローカルで `supabase/functions/select-topic/index.ts` を作成。
2. `mcp0_deploy_edge_function` を呼び出し、コードをデプロイ。

---

## 3. クライアント統合 (Week 7)

フロントエンド (`app-v2`) を Supabase に接続します。ここは通常のコーディング作業が中心ですが、確認に MCP を使用します。

### 3.1 環境変数設定
`.env.local` に Supabase URL と Anon Key を設定します。

**使用ツール**: `mcp0_get_project` (URL取得), `mcp0_get_publishable_keys` (Anon Key取得)

### 3.2 Mock API の置き換え
`lib/mock-api.ts` の内容を、実際の Supabase クライアント呼び出しに置き換えます。

- `createRoom` -> `supabase.from('rooms').insert(...)`
- `joinRoom` -> `supabase.from('rooms').select(...)`
- `startGame` -> `supabase.functions.invoke('assign-roles')` 等

### 3.3 Realtime 実装
`RoomContext` と `GameContext` 内で `supabase.channel` を使用し、DB の変更をリアルタイムに反映させます。

---

## 4. 検証とデバッグ

実装後の動作確認に MCP ツールを活用します。

- **ログ確認**: `mcp0_get_logs` を使用して、Edge Functions の実行ログや Auth ログを確認し、エラーをデバッグする。
- **データ確認**: `mcp0_execute_sql` でテーブルの中身を直接確認し、データが正しく保存されているか検証する。
- **アドバイザー**: `mcp0_get_advisors` を実行し、インデックス不足やセキュリティリスクがないかチェックする。
