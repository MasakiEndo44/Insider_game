# Insider Game Online - Setup Guide

## Week 1 Day 1: プロジェクト初期化 ✅ 完了

### 完了タスク

1. **Next.js 14プロジェクト初期化**
   - TypeScript、Tailwind CSS、App Router設定済み
   - カスタムテーマ（プライマリカラー: #E50012）
   - 最小タップ領域: 44px（アクセシビリティ対応）

2. **依存関係インストール**
   - Core: Next.js 14.2.18、React 18、TypeScript 5
   - Supabase: @supabase/supabase-js、@supabase/ssr
   - State: XState v5、Zustand
   - Security: @node-rs/argon2、Zod
   - Dev Tools: Prettier、ESLint、Playwright

3. **セキュリティヘッダー設定**
   - CSP (Content Security Policy)
   - HSTS (HTTP Strict Transport Security)
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff

4. **CI/CD パイプライン**
   - GitHub Actions設定（lint、typecheck、build、test）

## Week 1 Day 2: Supabase環境構築 🔄 進行中

### 完了タスク

1. **Supabase CLI インストール** ✅
   - バージョン: v2.51.0
   - インストール方法: Homebrew (ARM版)

2. **Supabase プロジェクト初期化** ✅
   - PostgreSQL 15設定
   - Anonymous認証有効化
   - config.toml生成完了

3. **Supabaseクライアント作成** ✅
   - `lib/supabase/client.ts` - ブラウザ用クライアント
   - `lib/supabase/server.ts` - サーバーコンポーネント用クライアント
   - Cookie管理対応（@supabase/ssr使用）

4. **環境変数テンプレート更新** ✅
   - `.env.example` 詳細コメント追加

### 保留中（ブロッカー）

⚠️ **Docker Desktop未インストール**

Supabase Localの起動にはDocker Desktopが必要です。

#### 対応方法

1. **Docker Desktopインストール:**
   ```bash
   # 公式サイトからダウンロード
   https://www.docker.com/products/docker-desktop

   # またはHomebrew経由（sudo権限必要）
   brew install --cask docker
   ```

2. **Docker Desktop起動:**
   ```bash
   open -a Docker
   ```

   初回起動は数分かかります。メニューバーにDockerアイコンが表示され、"Docker Desktop is running"と表示されるまで待機してください。

3. **Docker起動確認:**
   ```bash
   docker --version
   docker ps
   ```

### 次のステップ（Docker起動後）

1. **Supabase Local起動:**
   ```bash
   cd /Users/masaki/Documents/Projects/Insider_game
   supabase start
   ```

   出力される情報をメモ：
   - API URL: `http://localhost:54321`
   - DB URL: `postgresql://postgres:postgres@localhost:54322/postgres`
   - Studio URL: `http://localhost:54323`
   - anon key: `eyJ...`
   - service_role key: `eyJ...`

2. **環境変数設定:**
   ```bash
   # .env.exampleをコピー
   cp .env.example .env.local

   # .env.localを編集（supabase startの出力から値を設定）
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
   PASSPHRASE_HMAC_SECRET=<generate with: openssl rand -base64 32>
   ```

3. **Supabase Studio確認:**
   - ブラウザで http://localhost:54323 を開く
   - データベーステーブルが空であることを確認

4. **開発サーバー起動:**
   ```bash
   npm run dev
   ```

   http://localhost:3000 でアプリケーションにアクセス

## プロジェクト構成

```
Insider_game/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   └── globals.css        # グローバルスタイル
├── lib/
│   └── supabase/          # Supabaseクライアント
│       ├── client.ts      # ブラウザ用
│       └── server.ts      # サーバーコンポーネント用
├── supabase/              # Supabase設定
│   ├── config.toml        # Supabase CLI設定
│   └── .gitignore
├── docs/                  # ドキュメント
│   └── SETUP.md          # このファイル
├── .github/
│   └── workflows/
│       └── ci.yml         # CI/CDパイプライン
├── next.config.mjs        # Next.js設定（セキュリティヘッダー）
├── tailwind.config.ts     # Tailwind設定
├── tsconfig.json          # TypeScript設定
├── .eslintrc.json         # ESLint設定
├── .prettierrc            # Prettier設定
├── .env.example           # 環境変数テンプレート
└── package.json           # 依存関係
```

## 技術スタック

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5
- **Styling:** Tailwind CSS 3.4
- **Database:** Supabase (PostgreSQL 15)
- **Realtime:** Supabase Realtime (WebSocket)
- **Auth:** Supabase Auth (Anonymous)
- **State:** XState v5, Zustand
- **Security:** Argon2id, HMAC-SHA256, Zod
- **Testing:** Playwright
- **CI/CD:** GitHub Actions

## Phase 1 計画

- **Week 1:**
  - Day 1: ✅ プロジェクト初期化
  - Day 2: 🔄 Supabase環境構築（Docker待ち）
  - Day 3-5: データベースマイグレーション、UIコンポーネント、XState早期プロトタイプ

- **Week 2:** 匿名認証・Room CRUD（パスフレーズ検証含む）
- **Week 3:** Realtime同期・ゲームフェーズ管理
- **Week 4:** 性能測定・デプロイ準備

## トラブルシューティング

### Docker起動エラー
```bash
# Dockerプロセス確認
ps aux | grep -i docker

# Docker Desktop完全再起動
pkill -9 Docker && open -a Docker
```

### Supabase起動エラー
```bash
# Supabase停止
supabase stop

# Dockerコンテナ削除
docker system prune -a

# 再起動
supabase start
```

### ポート競合
もしポート54322がPostgres.appと競合する場合:
```toml
# supabase/config.toml
[db]
port = 54350  # 別のポートに変更
```
