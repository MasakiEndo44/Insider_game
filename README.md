# インサイダーゲーム - オンライン対戦版

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Private-red)]()

5〜8人でプレイする、リアルタイムオンライン多人数対戦の正体隠匿ゲームです。人気ボードゲーム「インサイダーゲーム」をブラウザで遊べるようにし、Discord の音声チャットと連携して楽しめます。

🎮 **デモサイト**: [https://insider-game-self.vercel.app](https://insider-game-self.vercel.app)
📖 **English Version**: [README.en.md](README.en.md)

---

## 📋 目次

- [ゲームコンセプト](#-ゲームコンセプト)
- [機能](#-機能)
- [技術スタック](#-技術スタック)
- [はじめに](#-はじめに)
- [データベーススキーマ](#-データベーススキーマ)
- [開発](#-開発)
- [テスト](#-テスト)
- [デプロイ](#-デプロイ)
- [トラブルシューティング](#-トラブルシューティング)
- [プロジェクトステータス](#-プロジェクトステータス)
- [ドキュメント](#-ドキュメント)

---

## 🎯 ゲームコンセプト

**インサイダーゲーム**は、プレイヤーの中に隠れた「インサイダー」を見つけ出す正体隠匿ゲームです。

### 役職
- **マスター**: 1人 - お題を知っている進行役
- **インサイダー**: 1人 - お題を知っているが、市民のフリをする
- **市民**: 残りのプレイヤー - 質問をしてお題を当てる

### ゲームの流れ
1. **役職配布** - プレイヤーに秘密の役職が割り当てられる
2. **お題確認** - マスターとインサイダーがお題を確認（5秒間）
3. **質問フェーズ** - 市民がYes/No質問をしてお題を推理（5分間）
4. **議論フェーズ** - インサイダーを探すための議論
5. **投票** - インサイダーを見つける投票（最大2回）
6. **結果発表** - インサイダーが見つかれば市民の勝ち、見つからなければインサイダーの勝ち

---

## ✨ 機能

### 実装済み（Phase 1 完了）
- ✅ **ルーム管理**
  - 合言葉でルーム作成・参加（3〜10文字、日本語対応）
  - Argon2id 暗号化 + HMAC-SHA256 ルックアップハッシュによるセキュリティ
  - ニックネーム重複時の自動リネーム（"-2" サフィックス付加）
  - 最大12人までのプレイヤー制限

- ✅ **リアルタイムアーキテクチャ**
  - Supabase Realtime によるリアルタイム同期
  - Row Level Security (RLS) による PostgreSQL セキュリティ
  - サーバー主導のゲームステート管理

- ✅ **セキュリティ**
  - Content Security Policy (CSP)
  - HSTS (HTTP Strict Transport Security)
  - Service Role Key による信頼された操作
  - Zod による環境変数バリデーション

- ✅ **開発者体験**
  - TypeScript strict mode
  - ESLint + Prettier
  - Playwright による E2E テスト
  - Artillery によるロードテスト（30同時接続）
  - Axe によるアクセシビリティテスト
  - Lighthouse によるパフォーマンス監視

### 予定（Phase 2 以降）
- ⏳ XState v5 によるゲーム状態管理
- ⏳ 役職割り当てロジック
- ⏳ エポックベースのタイマー同期
- ⏳ タイブレーク付き投票システム
- ⏳ 中断・再開機能
- ⏳ 再接続処理

---

## 🛠 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15.2.4 (App Router)
- **言語**: TypeScript 5.0 (strict mode)
- **UI コンポーネント**: Radix UI + Tailwind CSS 4.1.9
- **状態管理**: XState v5 + Zustand
- **リアルタイム**: Supabase Realtime クライアント

### バックエンド
- **プラットフォーム**: Supabase (PostgreSQL 15 + Realtime)
- **データベース**: Row Level Security (RLS) 付き PostgreSQL
- **認証**: 匿名認証 + Server Actions 用 Service Role
- **セキュリティ**: Argon2id (@node-rs/argon2)、HMAC-SHA256

### インフラストラクチャ
- **ホスティング**: Vercel (Edge Runtime)
- **データベース**: Supabase (マネージド PostgreSQL)
- **CI/CD**: GitHub Actions
- **テスト**: Playwright (E2E)、Artillery (負荷)、Axe (a11y)、Lighthouse (性能)

---

## 🚀 はじめに

### 前提条件

- **Node.js**: 20 以上（LTS 推奨）
- **パッケージマネージャー**: npm、pnpm、または yarn
- **Docker Desktop**: ローカル Supabase に必要
- **Supabase CLI**: `brew install supabase/tap/supabase` (macOS)

### 1. クローン & インストール

```bash
git clone https://github.com/<your-username>/insider-game.git
cd insider-game
npm install
```

### 2. Docker Desktop の起動

```bash
open -a Docker
# Docker が完全に起動するまで待つ
```

### 3. Supabase Local の起動

```bash
supabase start
# 以下の情報が出力されます:
# - API URL: http://localhost:54321
# - anon key: eyJ...
# - service_role key: eyJ...
```

**重要**: 出力された `anon key` と `service_role key` をコピーしてください。

### 4. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集し、`supabase start` の出力からキーを追加します：

```env
# Supabase 設定（`supabase start` の出力から）
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# セキュリティ（`openssl rand -base64 32` で生成）
PASSPHRASE_HMAC_SECRET=your-random-32-byte-secret-here
```

### 5. 開発サーバーの起動

```bash
npm run dev
# http://localhost:3000 を開く
```

### 6. ローカルテスト

1. ブラウザで2つのタブを開く: `http://localhost:3000`
2. タブ1: **"PLAY"** をクリック → 合言葉 `test123` を入力 → ルーム作成
3. タブ2: **"PLAY"** をクリック → 同じ合言葉 `test123` を入力 → ルーム参加
4. 両方のプレイヤーがロビーに表示されることを確認

---

## 🗄 データベーススキーマ

### 主要テーブル

```sql
-- Rooms: ゲームルーム管理
rooms
  - id (UUID, PK)
  - passphrase_hash (TEXT) -- 検証用 Argon2id ハッシュ
  - passphrase_lookup_hash (TEXT, UNIQUE) -- 高速クエリ用 HMAC-SHA256
  - host_id (UUID, FK → players)
  - phase (TEXT) -- LOBBY/DEAL/TOPIC/QUESTION/DEBATE/VOTE1/VOTE2/RESULT
  - is_suspended (BOOLEAN)
  - suspended_state (JSONB) -- 再開用スナップショット

-- Players: プレイヤー管理
players
  - id (UUID, PK)
  - room_id (UUID, FK → rooms)
  - nickname (TEXT)
  - is_host (BOOLEAN)
  - is_connected (BOOLEAN) -- Realtime 接続状態
  - confirmed (BOOLEAN) -- フェーズ確認フラグ

-- Game Sessions: アクティブなゲーム状態
game_sessions
  - id (UUID, PK)
  - room_id (UUID, FK → rooms)
  - difficulty (TEXT) -- Easy/Normal/Hard
  - start_time (TIMESTAMP)
  - deadline_epoch (BIGINT) -- タイマー同期用 Unix タイムスタンプ
  - answerer_id (UUID) -- 正解したプレイヤー
  - prev_master_id (UUID) -- マスター交代ロジック用

-- Roles: 秘密の役職割り当て（RLS 保護）
roles
  - session_id (UUID, FK → game_sessions)
  - player_id (UUID, FK → players)
  - role (TEXT) -- MASTER/INSIDER/CITIZEN
  - RLS: SELECT は (player_id = auth.uid() OR session.phase = 'RESULT') のみ

-- Topics: ゲームのお題（RLS 保護）
topics
  - session_id (UUID, FK → game_sessions)
  - topic_text (TEXT)
  - difficulty (TEXT)
  - RLS: SELECT は (role = 'MASTER' OR role = 'INSIDER') のみ

-- Votes: 投票記録
votes
  - session_id (UUID, FK → game_sessions)
  - player_id (UUID, FK → players)
  - vote_type (TEXT) -- VOTE1/VOTE2/RUNOFF
  - vote_value (TEXT) -- yes/no または player_id
  - round (INT) -- 決選投票ラウンド番号
```

### マイグレーション

```bash
supabase/migrations/
  ├── 20250101000000_initial_schema.sql      # コアテーブル + RLS
  ├── 20250101000001_seed_topics.sql         # 100以上のゲームお題
  ├── 20251021154449_sync_players_schema.sql # Players テーブル同期
  ├── 20251021154733_add_master_topics.sql   # マスターお題テーブル
  └── 20251022000000_add_passphrase_lookup_hash.sql # 高速合言葉検索
```

マイグレーションの適用:
```bash
supabase db reset  # ローカル DB をリセットし、すべてのマイグレーションを適用
```

---

## 💻 開発

### ファイル構造

```
insider-game/
├── app/                    # Next.js 15 App Router
│   ├── actions/           # Server Actions（ルーム管理）
│   ├── game/              # ゲームページ（予定）
│   ├── lobby/             # ロビーページ（予定）
│   └── page.tsx           # ホームページ
├── components/            # React コンポーネント
│   ├── ui/                # Shadcn UI コンポーネント（60以上）
│   ├── create-room-modal.tsx
│   ├── join-room-modal.tsx
│   └── player-chip.tsx
├── hooks/                 # カスタム React フック
├── lib/                   # ユーティリティ関数
│   ├── game/              # ゲームロジック（合言葉など）
│   ├── supabase/          # Supabase クライアント
│   └── env.ts             # 環境変数バリデーション
├── supabase/              # データベースマイグレーション
├── e2e/                   # Playwright E2E テスト
├── load-tests/            # Artillery 負荷テスト
└── docs/                  # 日本語仕様書
```

### よく使うコマンド

```bash
# 開発
npm run dev                # 開発サーバー起動（http://localhost:3000）
npm run build              # 本番ビルド
npm run start              # 本番サーバー起動

# コード品質
npm run lint               # ESLint
npm run format             # Prettier

# テスト
npm run test:e2e           # Playwright E2E テスト
npm run test:e2e:ui        # Playwright UI モード（インタラクティブ）
npm run test:e2e:headed    # Playwright ヘッドモード（ブラウザ表示）
npm run test:load          # Artillery 負荷テスト（30同時接続）
npm run lhci               # Lighthouse CI（パフォーマンス監査）

# データベース
supabase start             # ローカル Supabase 起動
supabase stop              # ローカル Supabase 停止
supabase db reset          # DB リセット & マイグレーション適用
supabase db diff           # 変更から マイグレーション生成
supabase gen types typescript --local > lib/supabase/database.types.ts
```

### 環境変数

| 変数 | 必須 | 説明 |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名キー（公開可） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role キー（秘密） |
| `PASSPHRASE_HMAC_SECRET` | ✅ | HMAC-SHA256 用の32バイト秘密鍵 |

**セキュリティ注意事項**:
- `.env.local` は絶対に Git にコミットしない
- `SUPABASE_SERVICE_ROLE_KEY` はすべての RLS ポリシーをバイパスします - 秘密に保つこと！
- `PASSPHRASE_HMAC_SECRET` は `openssl rand -base64 32` で生成してください

---

## 🧪 テスト

### E2E テスト（Playwright）

```bash
# すべてのテストを実行
npm run test:e2e

# インタラクティブ UI モード（推奨）
npm run test:e2e:ui

# ヘッドモード（ブラウザ表示）
npm run test:e2e:headed

# 単一テストファイル
npx playwright test e2e/room-creation.spec.ts
```

**テストカバレッジ**:
- ✅ 有効/無効な合言葉でのルーム作成
- ✅ 正しい/誤った合言葉でのルーム参加
- ✅ ニックネーム重複処理（自動 "-2" サフィックス）
- ✅ 最大プレイヤー数制限（12人）
- ✅ アクセシビリティ（Axe 違反検出）

### 負荷テスト（Artillery）

```bash
# フル負荷テスト（30同時ユーザー、5分間）
npm run test:load

# クイックテスト（10ユーザー、50リクエスト）
npm run test:load:quick
```

**負荷テストシナリオ**:
- ルーム作成レート: 10 req/秒
- ルーム参加レート: 20 req/秒
- 期待成功率: >95%
- p95 レイテンシ: <500ms

### パフォーマンステスト（Lighthouse）

```bash
# Lighthouse CI 実行
npm run lhci

# 収集のみ（アサーションをスキップ）
npm run lhci:collect
```

**パフォーマンス目標**:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

---

## 🚀 デプロイ

### 本番環境（Vercel）

#### 1. 初期セットアップ

```bash
# Vercel CLI インストール
npm i -g vercel

# ログイン
vercel login

# プロジェクトをリンク
vercel link
```

#### 2. 環境変数の設定

[Vercel Dashboard](https://vercel.com/dashboard) → プロジェクト → Settings → Environment Variables

**Production**、**Preview**、**Development** の3環境すべてに以下の変数を追加:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qqvxtmjyrjbzemxnfdwy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PASSPHRASE_HMAC_SECRET=<your-32-byte-secret>
```

**🚨 重要**: `SUPABASE_SERVICE_ROLE_KEY` はルーム作成に**必須**です。設定しないと RLS 無限再帰エラーが発生します。詳細は [DEPLOYMENT_REQUIRED.md](DEPLOYMENT_REQUIRED.md) を参照してください。

#### 3. デプロイ

```bash
# 本番デプロイ
vercel --prod

# または GitHub にプッシュ（自動デプロイ）
git push origin main
```

#### 4. デプロイ検証

1. https://insider-game-self.vercel.app を開く
2. **"PLAY"** をクリック
3. 合言葉 `productiontest` でルーム作成
4. **期待結果**: `/lobby?roomId=<UUID>&...` に遷移
5. **確認事項**: URL に有効な UUID（36文字、ハイフン入り）が含まれている

**失敗の兆候**:
- ❌ エラー: "invalid input syntax for type uuid"
- ❌ エラー: "infinite recursion detected"
- ❌ エラー: "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY"

### Supabase 本番環境セットアップ

#### 1. 本番プロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. **"New Project"** をクリック
3. 入力:
   - 名前: `insider-game-production`
   - データベースパスワード:（安全なパスワードを生成）
   - リージョン: Tokyo (ap-northeast-1)

#### 2. マイグレーションの適用

```bash
# 本番プロジェクトにリンク
supabase link --project-ref qqvxtmjyrjbzemxnfdwy

# マイグレーションをプッシュ
supabase db push
```

#### 3. Realtime の有効化

1. Dashboard → Database → Replication
2. 以下のテーブルで Realtime を有効化:
   - ✅ `rooms`
   - ✅ `players`
   - ✅ `game_sessions`

#### 4. RLS ポリシーの検証

```bash
# RLS ポリシーをテスト
supabase db remote exec "SELECT * FROM rooms LIMIT 1;"
```

---

## 🔧 トラブルシューティング

### よくある問題

#### "Realtime がローカルで動作しない"
**解決策**: テーブルで Realtime が有効になっているか確認
```bash
# Supabase を再起動
supabase stop
supabase start

# Dashboard で Realtime 設定を確認
```

#### "マイグレーション後に型が一致しない"
**解決策**: TypeScript 型を再生成
```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

#### "ポート競合（54321/54322）"
**解決策**: 他の Supabase インスタンスを停止
```bash
supabase stop
# スタックしたプロセスを終了
lsof -ti:54321,54322 | xargs kill
```

#### "RLS エラーでルーム作成が失敗する"
**解決策**: `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認
```bash
# .env.local を確認
grep SUPABASE_SERVICE_ROLE_KEY .env.local

# `supabase start` の出力と一致するか検証
supabase status
```

#### "Playwright テストが失敗する"
**解決策**: ブラウザをインストール
```bash
npx playwright install
```

### デバッグモード

```bash
# デバッグログを有効化
DEBUG=supabase:* npm run dev

# Supabase ログ
supabase logs
```

---

## 📊 プロジェクトステータス

### 現在のフェーズ: **Phase 1 - 基盤構築** ✅

| コンポーネント | ステータス | 備考 |
|-----------|--------|-------|
| ルーム管理 | ✅ 完了 | 合言葉による作成・参加 |
| データベーススキーマ | ✅ 完了 | 5つのマイグレーション適用済み |
| リアルタイムセットアップ | ✅ 完了 | Supabase Realtime 設定済み |
| セキュリティ | ✅ 完了 | Argon2id + HMAC-SHA256 + RLS |
| UI コンポーネント | ✅ 完了 | 60以上の Shadcn UI コンポーネント |
| テスト | ✅ 完了 | E2E、負荷、a11y、性能 |
| CI/CD | ✅ 完了 | GitHub Actions + Vercel |

### 次のフェーズ: **Phase 2 - ゲームロジック** 🚧

- ⏳ XState ステートマシン（役職割り当て → 投票）
- ⏳ タイマー同期（エポックベース）
- ⏳ 役職割り当てロジック（前回のマスターを除外）
- ⏳ お題選択と表示
- ⏳ 質問フェーズ UI
- ⏳ タイブレーク付き投票システム
- ⏳ 結果計算

### 今後のフェーズ

- **Phase 3**: 中断・再開、再接続
- **Phase 4**: 高度な機能（メモ、履歴、交代制）

詳細は [docs/Phase_1_implementation_plan_v2.0.md](docs/Phase_1_implementation_plan_v2.0.md) を参照してください。

---

## 📚 ドキュメント

### 主要ドキュメント（日本語）

- [プロジェクト概要](docs/インサイダー_オンライン対戦アプリ概要（実装図ベース）.md) - 製品概要
- [実装図一覧](docs/20251019_インサイダー実装図一覧.md) - 完全なフローチャートと図
- [Phase 1 実装計画](docs/Phase_1_implementation_plan_v2.0.md) - Phase 1 実装計画
- [セットアップ手順](docs/SETUP.md) - 詳細なセットアップ手順
- [デプロイメント必須事項](DEPLOYMENT_REQUIRED.md) - 重要なデプロイガイド

### 技術リファレンス（英語）

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [XState v5 Docs](https://stately.ai/docs/xstate)
- [Playwright Docs](https://playwright.dev/)

---

## 📄 ライセンス

**Private Project** - All rights reserved.

---

## 🙏 謝辞

- 原作ボードゲーム: [インサイダーゲーム by Oink Games](https://www.oinkgames.com/ja/games/analog/insider/)
- UI コンポーネント: [Shadcn UI](https://ui.shadcn.com/)
- リアルタイムインフラ: [Supabase](https://supabase.com/)
- フレームワーク: [Next.js by Vercel](https://nextjs.org/)

---

## 📞 お問い合わせ

質問や問題がある場合は、GitHub リポジトリで Issue を作成してください。

**更新日**: 2025-10-22
**バージョン**: 0.1.0 (Phase 1 完了)
