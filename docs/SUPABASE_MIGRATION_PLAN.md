# Supabase 移行計画書

## 1. 概要
本ドキュメントは、現在ローカル環境（Mock API）で動作している「Insider Game V2」を、Supabase 統合環境へ移行するための詳細計画です。
`docs/IMPLEMENTATION_PLAN.md` の Phase 4 〜 Phase 6 に相当する作業を、現在のコードベースの状態に合わせて具体化しました。

## 2. 現状分析 (Current State)

### 2.1 フロントエンド
- **UI/UX**: 実装完了。
- **状態管理**: `RoomContext`, `GameContext` により管理されているが、現在は `mock-api.ts` 経由でオンメモリデータを操作している。
- **API通信**: `lib/mock-api.ts` に集約されている。一部 Supabase のコードが含まれているが、完全ではない。

### 2.2 バックエンド (Supabase)
- **プロジェクト**: 作成済み（想定）。
- **Edge Functions**: `supabase/functions/assign-roles` と `select-topic` の雛形が存在する。
- **データベース**: マイグレーションファイルが存在せず、スキーマが適用されていない。

## 3. 移行における課題と変更点

### 3.1 データベーススキーマの適用
**課題**: データの永続化と整合性確保。
**変更点**:
- `rooms`, `players`, `game_sessions`, `roles`, `topics`, `votes`, `results` テーブルの作成。
- RLS (Row Level Security) の設定により、プレイヤー間のデータアクセス制御（特に役職とお題の秘匿）を行う。

### 3.2 リアルタイム同期の実装
**課題**: 複数クライアント間での状態同期。現在はローカルのメモリ内でのみ完結している。
**変更点**:
- `mock-api.ts` のポーリングや即時応答を廃止。
- `RoomContext` および `GameContext` に `supabase.channel` を導入し、DB の変更（INSERT/UPDATE）を検知してステートを更新する仕組みに変更する。

### 3.3 サーバーサイドロジックの移行
**課題**: クライアントサイドで行っていた「役職のランダム割り当て」や「お題の選択」をセキュアに行う。
**変更点**:
- クライアントから直接 DB を更新するのではなく、Edge Functions を呼び出す形に変更。
- `assign-roles`: サーバー側でランダムに役職を決定し、`roles` テーブルに保存。
- `select-topic`: サーバー側でお題を選択し、`topics` テーブルに保存。

### 3.4 認証フローの確立
**課題**: ユーザー識別。
**変更点**:
- Supabase Auth の「匿名認証 (Anonymous Sign-in)」を正式に組み込み、`user_id` を用いて RLS を機能させる。

## 4. 実装ステップ

### Step 1: データベース構築 (Migration)
1.  `supabase/migrations` ディレクトリを作成。
2.  初期スキーマ定義ファイルを作成（`docs/IMPLEMENTATION_PLAN.md` 4.2節参照）。
3.  Supabase プロジェクトへマイグレーションを適用。
4.  マスターデータ（お題）の投入。

### Step 2: Edge Functions のデプロイと検証
1.  `supabase/functions/assign-roles/index.ts` の実装確認と修正。
2.  `supabase/functions/select-topic/index.ts` の実装確認と修正。
3.  Functions のデプロイと `curl` 等による動作確認。

### Step 3: クライアントサイド認証の実装
1.  `lib/supabase/client.ts` の確認。
2.  アプリ起動時（またはルーム作成/参加時）に匿名認証を完了させるロジックの保証。

### Step 4: リアルタイム同期の実装 (Context修正)
1.  `RoomContext` に `supabase.channel` リスナーを追加。
    - `players` テーブルの変更 → 参加者リスト更新。
    - `rooms` テーブルの変更 → フェーズ遷移検知。
2.  `GameContext` に `supabase.channel` リスナーを追加。
    - `game_sessions` テーブルの変更 → ゲーム開始検知。
    - `roles`, `topics` 等の変更検知。

### Step 5: API クライアントの差し替え
1.  `lib/api.ts` (または `client-api.ts`) を新規作成し、Supabase を直接叩くロジックを実装。
2.  `mock-api.ts` を廃止し、新しい API クライアントを使用するようにコンポーネント/Context を修正。

## 5. 検証計画
- **マルチブラウザ検証**: 異なるブラウザ（またはシークレットウィンドウ）で複数のプレイヤーとしてログインし、同期を確認する。
- **RLS検証**: インサイダー以外のプレイヤーがお題を見られないこと、他人の役職が見られないことを確認する。
