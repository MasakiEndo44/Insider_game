# Vercel デプロイエラー修正ガイド

## 🔴 エラー概要

### 発生したエラー
```
Error: ❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL

Please check your .env.local file or Vercel environment settings.
For local development, copy .env.example to .env.local and fill in the values.
For Vercel deployment, add the variable in Project Settings → Environment Variables.
```

### 発生箇所
- **フェーズ**: `Collecting page data` (ビルドプロセス)
- **ファイル**: `/api/games/result/route.js`
- **原因**: Vercelの環境変数が未設定

## 🎯 根本原因

### コード分析
[lib/env.ts](../lib/env.ts:24-42) で環境変数をモジュールロード時に検証しています：

```typescript
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  PASSPHRASE_HMAC_SECRET: getEnvVar('PASSPHRASE_HMAC_SECRET'),
} as const;
```

この`getEnvVar()`関数は環境変数が存在しない場合、即座にエラーをスローします。

### 問題の流れ
1. Next.js ビルドプロセスが`Collecting page data`フェーズに到達
2. API Route (`/api/games/result`) がビルド時に評価される
3. `lib/env.ts`がインポートされ、環境変数を検証
4. Vercelに環境変数が設定されていないため、**エラーで停止**

## ✅ 解決方法（3ステップ）

### ステップ1: Vercelプロジェクト設定を開く

1. Vercelダッシュボードにアクセス: https://vercel.com/dashboard
2. 「Insider_game」プロジェクトを選択
3. 上部タブから「Settings」をクリック
4. 左サイドバーから「Environment Variables」を選択

### ステップ2: 環境変数を追加

以下の3つの環境変数を追加します：

#### 1. NEXT_PUBLIC_SUPABASE_URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://qqvxtmjyrjbzemxnfdwy.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```

#### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdnh0bWp5cmpiemVteG5mZHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4OTA2NDksImV4cCI6MjA3NjQ2NjY0OX0.N0dDr8VNHpmzwGl1mQrBeuM2dZ4Nt-7UGxElfXCsocQ
Environments: ✅ Production ✅ Preview ✅ Development
```

#### 3. PASSPHRASE_HMAC_SECRET
```
Name: PASSPHRASE_HMAC_SECRET
Value: 8xdgxCkZUsWoq1MEgKhzwT3bUFOSTDsPt8ZbiNzSOOw=
Environments: ✅ Production ✅ Preview ✅ Development
```

**重要**: 各環境変数で「Production」「Preview」「Development」すべてにチェックを入れてください。

### ステップ3: 再デプロイ

環境変数の追加後、**必ず再デプロイが必要**です：

#### 方法A: 最新コミットから再デプロイ
1. Vercel ダッシュボードの「Deployments」タブ
2. 最新の失敗したデプロイメントを探す
3. 右側の「...」メニューをクリック
4. 「Redeploy」を選択
5. 「Use existing Build Cache」の**チェックを外す**（重要！）
6. 「Redeploy」ボタンをクリック

#### 方法B: Gitから新しいコミットをプッシュ
```bash
# 空コミットでも再デプロイトリガーになります
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push origin main
```

## 🔍 検証方法

### デプロイログで確認
再デプロイ後、ビルドログで以下を確認：

```
✓ Compiled successfully
  Linting and checking validity of types ...
  Collecting page data ...
✓ Generating static pages (0/7)    # ← ここでエラーが出なければ成功
  Finalizing page optimization ...
```

### デプロイ後の動作確認
1. デプロイされたURLにアクセス
2. ブラウザのDevToolsを開く（F12）
3. Console に「✅ Environment variables validated successfully」が表示されることを確認（開発モードのみ）

## 📋 追加の非推奨パッケージ警告

ビルドログに以下の警告が表示されています：

```
npm warn deprecated @supabase/auth-helpers-nextjs@0.10.0:
This package is now deprecated - please use the @supabase/ssr package instead.
```

### 推奨: パッケージの更新（オプション）

非推奨パッケージを最新版に更新することを推奨します：

```bash
# 現在の非推奨パッケージをアンインストール
npm uninstall @supabase/auth-helpers-nextjs @supabase/auth-helpers-shared

# 推奨パッケージをインストール
npm install @supabase/ssr @supabase/supabase-js@latest

# package.json の更新を確認
git diff package.json
```

更新後、Supabaseクライアントの初期化コードを修正する必要があります：

#### Before (非推奨):
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
const supabase = createClientComponentClient();
```

#### After (推奨):
```typescript
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**注意**: この更新は現在のエラー修正には必須ではありません。時間があるときに対応してください。

## 🛡️ セキュリティ注意事項

### 公開しても安全な情報
- ✅ `NEXT_PUBLIC_SUPABASE_URL`: プロジェクトURL（公開情報）
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 匿名キー（RLSで保護されているため安全）

### 絶対に公開してはいけない情報
- ❌ `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（現在未使用だが、将来追加時は注意）
- ❌ `PASSPHRASE_HMAC_SECRET`: HMACシークレット（サーバーサイドのみ使用）

**確認事項**:
- `PASSPHRASE_HMAC_SECRET`に`NEXT_PUBLIC_`プレフィックスが**ついていない**ことを確認
- サーバーサイド専用の変数はクライアントバンドルに含まれません

## 🔄 今後のベストプラクティス

### 1. ローカル環境での確認
新しい環境変数を追加する際は、まずローカルで動作確認：

```bash
# .env.example を更新
echo "NEW_VARIABLE=example-value" >> .env.example

# .env.local にも追加
echo "NEW_VARIABLE=your-actual-value" >> .env.local

# ビルドが通るか確認
npm run build
```

### 2. Vercelへの同期
```bash
# Vercel CLI で環境変数を一括設定（オプション）
npx vercel env add NEW_VARIABLE production
npx vercel env add NEW_VARIABLE preview
npx vercel env add NEW_VARIABLE development
```

### 3. チーム共有
新しい環境変数を追加したら：
1. `.env.example`を更新してコミット
2. チームメンバーに通知
3. ドキュメント（このファイル）を更新

## 📊 トラブルシューティングチェックリスト

デプロイが失敗した場合、以下を確認：

- [ ] 環境変数が3つすべて設定されているか
- [ ] 環境変数名のスペルミスがないか
- [ ] Production/Preview/Development すべてにチェックが入っているか
- [ ] 再デプロイ時に「Use existing Build Cache」のチェックを外したか
- [ ] Supabase プロジェクトが稼働しているか（https://qqvxtmjyrjbzemxnfdwy.supabase.co）
- [ ] 匿名キーの有効期限が切れていないか（2035年まで有効）

## 🎉 完了確認

以下が表示されればデプロイ成功です：

```
✓ Compiled successfully
  Linting and checking validity of types ...
  Collecting page data ...
✓ Generating static pages (7/7)
  Finalizing page optimization ...
✓ Build completed in XXs
```

Vercelダッシュボードで「Ready」状態になったら、デプロイされたURLにアクセスして動作を確認してください！

---

## 📞 サポート情報

問題が解決しない場合：

1. **Vercelのビルドログを確認**:
   - Vercel ダッシュボード → Deployments → 失敗したデプロイ → View Function Logs

2. **環境変数の確認**:
   - Settings → Environment Variables で値が正しく設定されているか確認

3. **Supabaseの接続テスト**:
   ```bash
   curl https://qqvxtmjyrjbzemxnfdwy.supabase.co/rest/v1/
   ```
   レスポンスが返ってくればSupabaseは正常に稼働中

4. **このドキュメントの更新が必要な場合**:
   - 新しい環境変数を追加した場合は、このファイルも更新してください
