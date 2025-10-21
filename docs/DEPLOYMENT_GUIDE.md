# インサイダーゲーム - デプロイガイド

**最終更新**: 2025-10-21
**対象**: Phase 1 MVP (Week 4完了版)

---

## 📊 現在の実装状況

### ✅ 完了済み機能 (Week 1-4)

#### Week 1: プロジェクト基盤
- Next.js 14 + TypeScript + Tailwind CSS
- shadcn/ui コンポーネント統合
- ESLint + Prettier設定
- WCAG 2.1 AA/AAA準拠UI

#### Week 2: データベース実装
- PostgreSQL 15スキーマ (9テーブル)
- Row Level Security (RLS) 19ポリシー
- マイグレーションファイル (2ファイル)
- トピックシードデータ (130件)

#### Week 3: 状態管理
- XState 5.x ゲーム状態機械 (9フェーズ)
- Zustand グローバル状態管理
- Supabase Realtime統合

#### Week 4: ゲームロジック & API
- 9 API Routes (rooms, games, voting, results)
- Argon2id パスフレーズハッシング
- 役職割り当てロジック
- 投票・結果計算ロジック
- 型安全APIクライアント

### ⚠️ 未実装機能

#### UI統合 (Week 5予定)
- ルーム作成/参加ダイアログのAPI接続
- ゲーム開始ボタンのAPI接続
- 投票UIのAPI接続
- 結果表示のAPI接続

#### テスト (Week 5予定)
- E2Eテスト (Playwright)
- マルチプレイヤーテスト
- 統合テスト

---

## 🚀 デプロイ方法

### 推奨スタック
- **Frontend/Backend**: Vercel (Next.js最適化)
- **Database**: Supabase Production
- **Auth**: Supabase Anonymous Auth
- **Realtime**: Supabase Realtime

---

## 📋 デプロイ手順

### Phase 1: Supabase Production セットアップ

#### 1. Supabaseプロジェクト作成
```bash
# Supabaseダッシュボードにアクセス
# https://app.supabase.com

# 新規プロジェクト作成
- Project name: insider-game-prod
- Database Password: (強力なパスワード生成)
- Region: Northeast Asia (ap-northeast-1) - 東京
```

#### 2. データベース接続確認
```bash
# プロジェクトURLを確認
# https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

#### 3. マイグレーション実行
```bash
# Supabase CLIでProductionに接続
supabase link --project-ref YOUR_PROJECT_ID

# パスワード入力
# Enter your database password: [YOUR_DB_PASSWORD]

# マイグレーション実行
supabase db push

# 確認
# Are you sure you want to push these migrations to the remote database? [y/N]
# y
```

#### 4. トピックデータ確認
```bash
# Supabase Studioで確認
# https://app.supabase.com/project/YOUR_PROJECT_ID/editor

# master_topics テーブルを開く
# 130件のトピックが登録されているか確認
# - Easy: 50件
# - Normal: 50件
# - Hard: 30件
```

#### 5. RLS ポリシー確認
```bash
# Supabase Studioで確認
# https://app.supabase.com/project/YOUR_PROJECT_ID/auth/policies

# 9テーブルすべてでRLS有効化を確認
# 19のポリシーが存在するか確認
```

---

### Phase 2: Vercel デプロイ準備

#### 1. GitHubリポジトリ作成（未作成の場合）
```bash
# GitHubで新規リポジトリ作成
# https://github.com/new

# リポジトリ名: insider-game-online
# Visibility: Private (推奨)

# ローカルからプッシュ
git remote add origin https://github.com/YOUR_USERNAME/insider-game-online.git
git branch -M main
git push -u origin main
```

#### 2. Vercelプロジェクト作成
```bash
# Vercelダッシュボードにアクセス
# https://vercel.com/new

# Import Git Repository
# - Select GitHub repository: insider-game-online
# - Framework Preset: Next.js
# - Root Directory: ./
```

#### 3. 環境変数設定
```bash
# Vercel Project Settings → Environment Variables

# 以下の環境変数を追加：

# Supabase Production URL
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# Supabase Production Anon Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PRODUCTION_ANON_KEY

# HMAC Secret (新規生成)
PASSPHRASE_HMAC_SECRET=YOUR_GENERATED_SECRET
```

#### 4. HMAC Secret生成
```bash
# ローカルで新しいシークレット生成
openssl rand -base64 32

# 出力例:
# 8xK9vL2mN3pQ4rS5tU6vW7xY8zA9bC0dE1fG2hH3iI4=

# この値をVercelの PASSPHRASE_HMAC_SECRET に設定
```

#### 5. Build設定確認
```bash
# Vercel Project Settings → Build & Development Settings

Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 20.x (推奨)
```

---

### Phase 3: デプロイ実行

#### 1. デプロイ開始
```bash
# Vercel Dashboardから "Deploy" ボタンをクリック
# または、CLIから：

npx vercel --prod
```

#### 2. ビルドログ確認
```bash
# デプロイ中のログを確認：
# - ✓ Compiled successfully
# - ✓ Linting and checking validity of types
# - ✓ Generating static pages (9/9)
# - ✓ Finalizing page optimization

# エラーがある場合はログを確認し、修正
```

#### 3. デプロイURL確認
```bash
# デプロイ成功後、Vercel URLが表示される
# https://insider-game-online-xxxxx.vercel.app

# ブラウザでアクセスして動作確認
```

---

### Phase 4: 動作確認

#### 1. 基本動作確認
```bash
# メインロビーページにアクセス
# https://YOUR_VERCEL_URL/

# 確認項目：
# ✓ ページが正常に表示される
# ✓ UIコンポーネントが読み込まれる
# ✓ コンソールエラーがない
```

#### 2. Supabase接続確認
```bash
# ブラウザのDevToolsコンソールで確認：
# ✓ Supabase clientが初期化される
# ✓ WebSocketエラーがない

# Supabase Studioで確認：
# ✓ Auth → Users に匿名ユーザーが作成される
```

#### 3. API動作確認
```bash
# ルーム作成テスト
# - メインロビーで "Create Room" をクリック
# - パスフレーズを入力
# - エラーがないか確認

# Supabase Studioで確認：
# - rooms テーブルに新しいレコードが追加される
# - passphrase_hash が保存される
```

---

## 🔧 トラブルシューティング

### ビルドエラー

#### エラー: "Module not found: @node-rs/argon2"
```bash
# next.config.mjsで外部化されているか確認
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push('@node-rs/argon2');
  }
  return config;
}
```

#### エラー: "Environment variable is not defined"
```bash
# Vercelの環境変数を確認
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - PASSPHRASE_HMAC_SECRET

# すべて設定されているか確認し、再デプロイ
```

### Supabase接続エラー

#### エラー: "Invalid API key"
```bash
# Supabase ダッシュボードでAPI Keyを確認
# Settings → API → Project API keys

# Anon keyを再取得し、Vercelの環境変数を更新
```

#### エラー: "Connection refused"
```bash
# SupabaseプロジェクトのStatusを確認
# https://app.supabase.com/project/YOUR_PROJECT_ID

# プロジェクトが "Active" になっているか確認
# "Paused" の場合は再開する
```

### RLS (Row Level Security) エラー

#### エラー: "new row violates row-level security policy"
```bash
# Anonymous Authが有効になっているか確認
# Supabase Dashboard → Authentication → Providers
# - Anonymous sign-ins: Enabled

# RLSポリシーを確認
# - rooms_insert: WITH CHECK (true)  // 誰でも作成可能
# - players_insert: WITH CHECK (id = auth.uid())  // 自分を追加
```

---

## 📈 デプロイ後のチェックリスト

### セキュリティ
- [ ] HTTPS強制 (Vercel自動設定)
- [ ] CSP ヘッダー設定済み
- [ ] RLS 有効化済み (9テーブル)
- [ ] Argon2id パスフレーズハッシング
- [ ] 環境変数の秘匿化

### パフォーマンス
- [ ] 初回ロード < 150 kB (現在: 108-162 kB)
- [ ] Lighthouse Score > 90 (確認予定)
- [ ] WebSocket接続プーリング
- [ ] 画像最適化 (該当なし)

### 機能
- [ ] ルーム作成機能
- [ ] ルーム参加機能
- [ ] ゲーム開始機能
- [ ] 役職割り当て
- [ ] 投票機能
- [ ] 結果計算

### モニタリング
- [ ] Vercel Analytics有効化
- [ ] エラートラッキング設定
- [ ] Supabase ログ確認

---

## 🎯 次のステップ

### Week 5: UI統合 & テスト (推奨)
1. **UI-API統合** (2-3日)
   - ルーム作成/参加ダイアログのAPI接続
   - ゲーム開始ボタンのAPI接続
   - 投票UIのAPI接続

2. **E2Eテスト** (1-2日)
   - Playwright テスト作成
   - マルチプレイヤーテスト
   - エラーケーステスト

3. **最終デプロイ** (1日)
   - UI統合版をデプロイ
   - 本番環境でテスト
   - ドキュメント更新

### カスタムドメイン設定 (オプション)
```bash
# Vercel Dashboard → Settings → Domains

# カスタムドメインを追加
# - Domain: yourdomain.com
# - DNS設定: Aレコード/CNAMEレコード追加

# SSL証明書は自動発行
```

---

## 📞 サポート

### 技術スタック
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs

### コミュニティ
- GitHub Issues: (リポジトリ作成後)
- Discord: (設定後)

---

**デプロイガイド作成日**: 2025-10-21
**対象バージョン**: Phase 1 Week 4完了版
**次回更新予定**: Week 5完了時
