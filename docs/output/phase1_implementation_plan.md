# Phase 1 実装計画書

プロジェクト名: インサイダーゲーム オンライン版
Phase: Phase 1 - 基盤構築（4週間）
最終更新: 2025-10-20
バージョン: 2.0（検証フィードバック反映版）

---

## 変更履歴

**v2.0 (2025-10-20)**:
- Gemini MCP + O3 MCP 検証フィードバック反映
- スケジュール延長: 3週間 → 4週間（20人日）
- ルーム参加API: HMAC-SHA256インデックス最適化追加
- ルーム作成API: RPC関数によるトランザクション化
- Week 1: CI/CD環境構築、Realtimeレイテンシ早期スパイク追加
- Week 2: 監視・アラート、セキュリティヘッダー追加
- Week 4: 統合テスト、バグ修正、本番リリース準備追加

**v1.0 (2025-10-20)**: 初版作成

---

## 目次

1. [Phase 1 目標](#phase-1-目標)
2. [実装戦略](#実装戦略)
3. [Week 1: 環境構築・DB設計](#week-1-環境構築db設計)
4. [Week 2: ルーム管理・認証](#week-2-ルーム管理認証)
5. [Week 3: Realtime統合・XState設計](#week-3-realtime統合xstate設計)
6. [Week 4: 統合テスト・本番準備](#week-4-統合テスト本番準備)
7. [リスク管理](#リスク管理)
8. [完了基準](#完了基準)
9. [次フェーズへの引継ぎ](#次フェーズへの引継ぎ)

---

## Phase 1 目標

### 主要成果物

1. **動作する基盤システム**
   - ルーム作成・参加機能
   - リアルタイム同期（入退室反映）
   - 認証システム（匿名認証）
   - データベース基盤（RLS完全実装）

2. **技術検証の完了**
   - Supabase Realtime レイテンシ測定（目標: <500ms）
   - RLS ポリシーのセキュリティテスト
   - XState ステートマシンの動作確認
   - 30名同時接続の負荷テスト

3. **開発基盤の確立**
   - ローカル開発環境（Supabase Local + Next.js Dev Server）
   - CI/CD パイプライン（Vercel自動デプロイ）
   - テスト環境（E2Eテスト基盤）

### スコープ内・外の明確化

#### ✅ Phase 1 スコープ内
- ルーム作成・参加
- ロビー画面（参加者一覧、リアルタイム反映）
- 匿名認証
- データベース全テーブル作成
- RLS ポリシー実装
- XState ステートマシン設計（全フェーズ定義）
- 基本的なエラーハンドリング

#### ❌ Phase 1 スコープ外（Phase 2以降）
- ゲームフェーズ実装（役職配布、お題配信、投票）
- タイマー機能
- 中断・再開機能
- モバイル最適化（Phase 3）
- アクセシビリティ対応（Phase 3）

---

## 実装戦略

### 技術スタック確認

| レイヤー | 技術 | バージョン | 役割 |
|---------|------|-----------|------|
| **フロントエンド** | Next.js | 14.x (App Router) | SSR/CSR統合、ルーティング |
| | TypeScript | 5.x | 型安全性 |
| | XState | 5.x | ステートマシン管理 |
| | Tailwind CSS | 3.x | スタイリング |
| | Headless UI | 2.x | アクセシブルUIコンポーネント |
| **バックエンド** | Supabase | PostgreSQL 15.x | データベース |
| | Supabase Realtime | - | WebSocket通信 |
| | Supabase Auth | - | 匿名認証 |
| **インフラ** | Vercel | Hobby plan | ホスティング |
| | GitHub | - | バージョン管理 |

### アーキテクチャ方針

#### 1. サーバー主導の状態管理
**原則**: クライアント側のXStateは「表示用」、サーバー側（DB）が「信頼できる唯一の情報源（Single Source of Truth）」

```
サーバー（DB）     クライアント（XState）
    ↓                    ↓
  phase: LOBBY    →   [LOBBY State]
  phase: DEAL     →   [DEAL State]
```

**理由**:
- 不正プレイ防止（クライアント側で勝手にフェーズ遷移できない）
- 再接続時の状態復元が容易
- Realtime経由で全員が同じ状態を共有

#### 2. Realtime最適化戦略
**ルーム単位のチャネル購読**:
```typescript
const channel = supabase.channel(`room:${roomId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rooms',
    filter: `id=eq.${roomId}`,
  }, handleRoomUpdate)
  .subscribe();
```

**最適化ポイント**:
- 購読スコープを最小化（ルーム単位、テーブル単位）
- 不要なカラムはフィルタリング
- デバウンス処理（100ms）で過剰な再レンダリング防止

#### 3. RLS セキュリティ設計
**多層防御**:
```
Layer 1: RLS ポリシー（DB層）
  → 自分の役職のみ SELECT 可能

Layer 2: API バリデーション（Application層）
  → Zod によるリクエスト検証

Layer 3: 認証（Auth層）
  → auth.uid() による本人確認
```

### O3フィードバック反映

#### 追加タスク（O3指摘）

| 項目 | 優先度 | 実装タイミング | 内容 |
|------|-------|-------------|------|
| **RLSテスト自動化** | 高 | Week 1 Day 4 | 他人の役職が取得できないことをE2Eテスト |
| **XState早期プロトタイプ** | 高 | Week 1 Day 5 | 全フェーズ状態遷移図を作成、テーブル設計に反映 |
| **タイマー同期設計** | 中 | Week 3 Day 1 | サーバーepoch基準の設計ドキュメント作成 |
| **レートリミット** | 中 | Week 2 Day 5 | API Routes に簡易レートリミット実装 |
| **モバイル互換検証** | 低 | Week 3 Day 5 | iPhone/Androidブラウザで動作確認 |
| **E2Eテスト基盤** | 高 | Week 3 Day 4 | Playwright環境構築、1シナリオ実装 |

---

## Week 1: 環境構築・DB設計

### 目標
ローカル開発環境の完全稼働とデータベース基盤の構築

### Day 1: プロジェクト初期化

#### タスク詳細

**1.1 Next.js プロジェクト作成**
```bash
# プロジェクトルートで実行
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --no-src-dir \
  --import-alias "@/*"

# ディレクトリ構成確認
tree -L 2 -I 'node_modules'
```

**期待されるディレクトリ構造**:
```
.
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── .eslintrc.json
```

**1.2 追加パッケージインストール**
```bash
# Supabase関連
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# 状態管理・バリデーション
npm install xstate zustand zod

# セキュリティ
npm install @node-rs/argon2

# 開発ツール
npm install -D \
  prettier \
  eslint-config-prettier \
  husky \
  lint-staged \
  @types/node
```

**1.3 設定ファイル作成**

**.prettierrc**:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**.eslintrc.json**:
```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**package.json（scripts追加）**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "prepare": "husky install"
  }
}
```

**1.4 Git初期化**
```bash
git init
git add .
git commit -m "chore: initial Next.js project setup"
```

**1.5 CI/CDパイプライン構築（v2.0追加）**

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  push:
    branches: ['main', 'develop']
  pull_request:
    branches: ['main', 'develop']

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

**Vercel自動デプロイ設定**:
```bash
# Vercelプロジェクト作成（初回のみ）
npx vercel link

# プロダクション環境変数設定
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add PASSPHRASE_HMAC_SECRET production

# GitHub連携でmainブランチへのpushで自動デプロイ
```

#### 成果物
- ✅ Next.js 14 プロジェクト初期化完了
- ✅ package.json に全依存関係追加
- ✅ ESLint + Prettier 設定完了
- ✅ Git リポジトリ初期化
- ✅ GitHub Actions CI/CD パイプライン構築（v2.0追加）
- ✅ Vercel自動デプロイ設定完了（v2.0追加）

#### 確認方法
```bash
npm run dev
# http://localhost:3000 でNext.jsデフォルト画面が表示される

npm run lint
# エラーが出ないことを確認

# GitHub Actionsの確認
git push origin main
# https://github.com/{org}/{repo}/actions で CI パイプライン実行確認
```

---

### Day 2: Supabase環境構築

#### タスク詳細

**2.1 Supabase CLI インストール**
```bash
# macOS
brew install supabase/tap/supabase

# バージョン確認
supabase --version
```

**2.2 Supabaseプロジェクト初期化**
```bash
# プロジェクトルートで実行
supabase init

# 生成されるファイル確認
ls -la supabase/
# config.toml, seed.sql などが生成される
```

**2.3 Local Development 起動**
```bash
# Docker起動確認
docker --version

# Supabase Local 起動
supabase start

# 出力例:
# API URL: http://localhost:54321
# GraphQL URL: http://localhost:54321/graphql/v1
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# Inbucket URL: http://localhost:54324
# JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
# anon key: eyJh...
# service_role key: eyJh...
```

**2.4 環境変数設定**

**.env.local**:
```env
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>

# 本番環境（後で設定）
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<production anon key>
```

**.env.example**（Gitコミット用）:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**.gitignore** に追加:
```
.env.local
```

**2.5 Supabase クライアント初期化**

**lib/supabase/client.ts**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**lib/supabase/server.ts** (Server Components用):
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

#### 成果物
- ✅ Supabase Local 環境起動
- ✅ supabase/config.toml 設定完了
- ✅ .env.local に環境変数設定
- ✅ Supabaseクライアント初期化

#### 確認方法
```bash
# Supabase Studio にアクセス
open http://localhost:54323

# PostgreSQL 接続テスト
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT version();"
```

---

### Day 3-4: データベースマイグレーション

#### タスク詳細

**3.1 Migrationファイル作成**
```bash
supabase migration new initial_schema
# supabase/migrations/20250101000000_initial_schema.sql が生成される
```

**3.2 スキーマSQL記述**

`database_design.md` の Migration SQL をコピー:
```bash
# database_design.md の内容を貼り付け
code supabase/migrations/20250101000000_initial_schema.sql
```

**主要テーブル**:
1. `rooms` - ルーム情報
2. `players` - プレイヤー情報
3. `game_sessions` - ゲームセッション
4. `roles` - 役職割り当て
5. `master_topics` - お題マスターデータ
6. `topics` - セッションで使用されたお題
7. `used_topics` - セッション内重複防止
8. `votes` - 投票データ
9. `results` - ゲーム結果

**3.3 RLSポリシー実装**

**重要なRLSポリシー**:

1. **役職秘匿ポリシー** (`roles` テーブル):
```sql
CREATE POLICY "role_secrecy" ON roles
  FOR SELECT
  USING (
    player_id = auth.uid() OR
    (SELECT phase FROM game_sessions WHERE id = session_id) = 'RESULT'
  );
```

2. **お題秘匿ポリシー** (`topics` テーブル):
```sql
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
```

**3.4 Migration実行**
```bash
# Migrationを適用
supabase db reset

# テーブル作成確認
psql postgresql://postgres:postgres@localhost:54322/postgres -c "\dt"
```

**3.5 お題シードデータ作成**
```bash
supabase migration new seed_topics
```

`database_design.md` のシードSQLをコピー:
```sql
-- Easy 50問、Normal 50問、Hard 30問
INSERT INTO master_topics (topic_text, difficulty) VALUES
  ('りんご', 'Easy'),
  ('犬', 'Easy'),
  -- ... (全130問)
```

**3.6 シード実行**
```bash
# シード実行
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20250101000001_seed_topics.sql

# 確認
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT difficulty, COUNT(*) FROM master_topics GROUP BY difficulty;"
```

**期待される出力**:
```
 difficulty | count
------------+-------
 Easy       |    50
 Hard       |    30
 Normal     |    50
```

#### 成果物
- ✅ 全テーブル作成完了
- ✅ RLSポリシー有効化
- ✅ お題データ130問投入
- ✅ インデックス作成完了

#### 確認方法
```bash
# Supabase Studioでテーブル確認
open http://localhost:54323

# RLS有効確認
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

### Day 4: RLSテスト自動化（O3追加タスク）

#### タスク詳細

**4.1 テストデータ準備**
```sql
-- テスト用ルーム・プレイヤー作成
INSERT INTO rooms (id, passphrase_hash, phase) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test_hash', 'LOBBY');

INSERT INTO players (id, room_id, nickname, is_host) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Player A', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Player B', false);

INSERT INTO game_sessions (id, room_id, difficulty, phase) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Easy', 'LOBBY');

INSERT INTO roles (session_id, player_id, role) VALUES
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MASTER'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'INSIDER');
```

**4.2 RLSテストスクリプト作成**

**tests/rls-security.test.ts**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

describe('RLS Security Tests', () => {
  test('Player A cannot see Player B role', async () => {
    // Player A のクライアント（匿名認証）
    const playerA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Player A として認証（auth.uid() = Player A ID）
    // ※ 実際の実装では signInAnonymously() で取得したUIDを使用

    // Player B の役職取得を試みる
    const { data, error } = await playerA
      .from('roles')
      .select('*')
      .eq('player_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
      .single();

    // Player B の役職は取得できないはず
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  test('Player can see own role', async () => {
    const playerA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data, error } = await playerA
      .from('roles')
      .select('*')
      .eq('player_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      .single();

    expect(data).not.toBeNull();
    expect(data?.role).toBe('MASTER');
    expect(error).toBeNull();
  });

  test('CITIZEN cannot see topics', async () => {
    // 庶民プレイヤーのクライアント
    const citizen = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    const { data, error } = await citizen
      .from('topics')
      .select('*')
      .eq('session_id', '22222222-2222-2222-2222-222222222222');

    expect(data).toEqual([]);
  });
});
```

**4.3 テスト実行**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom

# jest.config.js 作成
npx jest --init

npm test
```

#### 成果物
- ✅ RLSポリシーE2Eテスト3シナリオ実装
- ✅ テスト全パス確認

---

### Day 5: Tailwind + UI設定、XState早期プロトタイプ

#### タスク詳細（前半: Tailwind UI）

**5.1 Tailwind設定カスタマイズ**

**tailwind.config.ts**:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E50012', // ゲームレッド
        'gray-900': '#111827',
        'gray-100': '#F3F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'Hiragino Sans', 'sans-serif'],
      },
      spacing: {
        // 4-pt grid system
        '11': '2.75rem', // 44px（最小タップ領域）
      },
    },
  },
  plugins: [],
};
export default config;
```

**5.2 ベースコンポーネント作成**

**components/ui/Button.tsx**:
```typescript
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-semibold transition-colors';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-red-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeStyles = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

**components/ui/Card.tsx**:
```typescript
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
}
```

**components/ui/Modal.tsx**:
```typescript
'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

#### タスク詳細（後半: XState早期プロトタイプ）

**5.3 XState状態遷移図作成**

**lib/state-machine/game-machine.ts**:
```typescript
import { createMachine } from 'xstate';

export const gameMachine = createMachine({
  id: 'game',
  initial: 'lobby',
  context: {
    roomId: null as string | null,
    sessionId: null as string | null,
    playerId: null as string | null,
    role: null as 'MASTER' | 'INSIDER' | 'CITIZEN' | null,
    phase: 'lobby' as string,
  },
  states: {
    lobby: {
      on: {
        START_GAME: 'deal',
      },
    },
    deal: {
      on: {
        ROLE_CONFIRMED: 'topic',
      },
    },
    topic: {
      on: {
        TOPIC_CONFIRMED: 'question',
      },
    },
    question: {
      on: {
        CORRECT_REPORTED: 'debate',
        TIMEOUT: 'result',
      },
    },
    debate: {
      on: {
        DEBATE_END: 'vote1',
      },
    },
    vote1: {
      on: {
        VOTE1_COMPLETE: [
          { target: 'result', cond: 'yesOverHalf' },
          { target: 'vote2', cond: 'noOverHalf' },
        ],
      },
    },
    vote2: {
      on: {
        VOTE2_COMPLETE: [
          { target: 'result', cond: 'oneTopCandidate' },
          { target: 'runoff', cond: 'multipleTied' },
        ],
      },
    },
    runoff: {
      on: {
        RUNOFF_COMPLETE: [
          { target: 'result', cond: 'oneTopCandidate' },
          { target: 'runoff', cond: 'multipleTied' },
          { target: 'result', cond: 'thirdTie' },
        ],
      },
    },
    result: {
      on: {
        NEXT_ROUND: 'lobby',
        BACK_TO_LOBBY: 'lobby',
      },
    },
  },
});
```

**5.4 状態遷移図のドキュメント化**

**docs/state-machine-diagram.md**:
```markdown
# XState ステートマシン図

## フェーズ遷移フロー

```mermaid
stateDiagram-v2
    [*] --> lobby
    lobby --> deal: START_GAME
    deal --> topic: ROLE_CONFIRMED
    topic --> question: TOPIC_CONFIRMED
    question --> debate: CORRECT_REPORTED
    question --> result: TIMEOUT
    debate --> vote1: DEBATE_END
    vote1 --> result: YES過半数
    vote1 --> vote2: NO過半数
    vote2 --> result: 最多票1人
    vote2 --> runoff: 同票複数
    runoff --> result: 最多票1人 or 3回同票
    runoff --> runoff: 同票（2回目まで）
    result --> lobby: NEXT_ROUND
    result --> [*]: DISBAND
```

## 状態ごとの責務

| State | 画面 | 主要アクション | 次の遷移 |
|-------|------|-------------|---------|
| lobby | ロビー | ゲーム開始（ホスト） | START_GAME → deal |
| deal | 役職配布 | 役職確認 | ROLE_CONFIRMED → topic |
| topic | お題確認 | お題確認（マスター・インサイダー） | TOPIC_CONFIRMED → question |
| question | 質問フェーズ | 正解報告（マスター） | CORRECT_REPORTED → debate / TIMEOUT → result |
| debate | 討論フェーズ | 討論終了（ホスト） | DEBATE_END → vote1 |
| vote1 | 第一投票 | Yes/No投票 | YES過半数 → result / NO過半数 → vote2 |
| vote2 | 第二投票 | 候補選択 | 最多票1人 → result / 同票 → runoff |
| runoff | 決選投票 | 同票候補から選択 | 最多票1人 → result / 2回同票 → runoff / 3回同票 → result |
| result | 結果 | 次ラウンド（ホスト） | NEXT_ROUND → lobby |
```

#### 成果物
- ✅ tailwind.config.ts カスタマイズ完了
- ✅ Button, Card, Modal コンポーネント作成
- ✅ XState ステートマシン定義完了
- ✅ 状態遷移図ドキュメント作成

#### 確認方法
```bash
# Storybookなどで確認（オプション）
npm run dev
# http://localhost:3000 でコンポーネント動作確認
```

---

### Week 1 完了基準

#### 必須項目
- [ ] ローカル開発環境が完全に動作（Next.js + Supabase Local）
- [ ] Supabase Local DBにアクセス可能（psql接続成功）
- [ ] 全テーブルが作成済み（9テーブル）
- [ ] RLSポリシーが有効化されている（9テーブル）
- [ ] お題データ130問が投入済み
- [ ] 基本UIコンポーネントが動作（Button, Card, Modal）
- [ ] XStateステートマシン定義完了
- [ ] RLSテストが全パス

#### 検証方法
```bash
# 1. Next.js起動確認
npm run dev
# → http://localhost:3000 でデフォルトページ表示

# 2. Supabase起動確認
supabase status
# → All services running と表示

# 3. DB接続確認
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT COUNT(*) FROM master_topics;"
# → 130 と表示

# 4. RLSテスト実行
npm test
# → All tests passed

# 5. ESLint/Prettierチェック
npm run lint
npm run format
# → エラーなし
```

---

## Week 2: ルーム管理・認証

### 目標
ルーム作成・参加機能とロビー画面の実装

### Day 1: トップページUI

#### タスク詳細

**1.1 トップページ実装**

**app/page.tsx**:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

export default function TopPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          インサイダーゲーム
          <br />
          オンライン
        </h1>

        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => setIsCreateModalOpen(true)}
          >
            部屋を作る
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => setIsJoinModalOpen(true)}
          >
            部屋を探す
          </Button>
        </div>
      </Card>

      {/* モーダルは後で実装 */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="部屋を作る"
      >
        <p>合言葉入力フォーム（Day 2で実装）</p>
      </Modal>

      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="部屋を探す"
      >
        <p>合言葉入力フォーム（Day 3で実装）</p>
      </Modal>
    </main>
  );
}
```

**1.2 合言葉入力コンポーネント**

**components/features/PassphraseInput.tsx**:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface PassphraseInputProps {
  onSubmit: (passphrase: string, nickname: string) => void;
  submitLabel: string;
}

export function PassphraseInput({ onSubmit, submitLabel }: PassphraseInputProps) {
  const [passphrase, setPassphrase] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (passphrase.length < 3 || passphrase.length > 10) {
      setError('合言葉は3-10文字で入力してください');
      return;
    }

    if (!nickname || nickname.length > 20) {
      setError('ニックネームは1-20文字で入力してください');
      return;
    }

    setError('');
    onSubmit(passphrase, nickname);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-1">
          合言葉（3-10文字）
        </label>
        <input
          id="passphrase"
          type="text"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="例: テスト部屋"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
          ニックネーム
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="例: プレイヤー1"
        />
      </div>

      <Button type="submit" size="lg" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
```

#### 成果物
- ✅ トップページUI実装
- ✅ PassphraseInputコンポーネント実装
- ✅ バリデーションロジック（3-10文字、1-20文字）

---

### Day 2: ルーム作成API

#### タスク詳細

**2.1 Argon2ハッシュ化関数**

**lib/crypto/hash.ts**:
```typescript
import { hash, verify } from '@node-rs/argon2';

const HASH_OPTIONS = {
  memoryCost: 19456, // 19MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassphrase(passphrase: string): Promise<string> {
  return hash(passphrase, HASH_OPTIONS);
}

export async function verifyPassphrase(
  passphrase: string,
  hashedPassphrase: string
): Promise<boolean> {
  return verify(hashedPassphrase, passphrase);
}
```

**2.2 バリデーションスキーマ**

**lib/validation/schemas.ts**:
```typescript
import { z } from 'zod';

export const passphraseSchema = z
  .string()
  .min(3, '合言葉は3文字以上で入力してください')
  .max(10, '合言葉は10文字以下で入力してください')
  .transform((s) => s.normalize('NFC')); // Unicode正規化

export const nicknameSchema = z
  .string()
  .min(1, 'ニックネームを入力してください')
  .max(20, 'ニックネームは20文字以下で入力してください')
  .regex(
    /^[a-zA-Z0-9ぁ-んァ-ヶー一-龯\s]+$/,
    'ニックネームに使用できない文字が含まれています'
  );

export const createRoomSchema = z.object({
  passphrase: passphraseSchema,
  nickname: nicknameSchema,
});
```

**2.3 ルーム作成API**

**app/api/rooms/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassphrase } from '@/lib/crypto/hash';
import { createRoomSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    // 1. リクエストボディ取得
    const body = await req.json();

    // 2. バリデーション
    const { passphrase, nickname } = createRoomSchema.parse(body);

    // 3. 合言葉ハッシュ化
    const hashedPassphrase = await hashPassphrase(passphrase);

    // 4. Supabaseクライアント作成
    const supabase = createClient();

    // 5. 重複チェック
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('passphrase_hash', hashedPassphrase)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'この合言葉は既に使用されています' },
        { status: 409 }
      );
    }

    // 6. 匿名認証
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 7. トランザクション処理（Room作成 → Player作成 → Host設定）
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ passphrase_hash: hashedPassphrase })
      .select()
      .single();

    if (roomError) {
      return NextResponse.json(
        { error: 'ルーム作成に失敗しました' },
        { status: 500 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        id: userId,
        room_id: room.id,
        nickname,
        is_host: true,
      })
      .select()
      .single();

    if (playerError) {
      // ロールバック（Room削除）
      await supabase.from('rooms').delete().eq('id', room.id);

      return NextResponse.json(
        { error: 'プレイヤー作成に失敗しました' },
        { status: 500 }
      );
    }

    // Host ID更新
    await supabase
      .from('rooms')
      .update({ host_id: userId })
      .eq('id', room.id);

    // 8. レスポンス
    return NextResponse.json({
      room_id: room.id,
      player_id: player.id,
      is_host: true,
    }, { status: 201 });

  } catch (error) {
    console.error('Room creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}
```

#### 成果物
- ✅ POST /api/rooms 実装完了
- ✅ Argon2ハッシュ化実装
- ✅ 重複チェックロジック
- ✅ エラーハンドリング

#### 確認方法
```bash
# curlでテスト
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"テスト部屋","nickname":"プレイヤー1"}'

# 期待されるレスポンス:
# {"room_id":"...","player_id":"...","is_host":true}
```

---

### Day 3: ルーム参加API

**app/api/rooms/join/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPassphrase } from '@/lib/crypto/hash';
import { createRoomSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passphrase, nickname } = createRoomSchema.parse(body);

    const supabase = createClient();

    // 1. 全ルーム取得（合言葉検証のため）
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, passphrase_hash');

    if (!rooms || rooms.length === 0) {
      return NextResponse.json(
        { error: 'ルームが見つかりません' },
        { status: 404 }
      );
    }

    // 2. 合言葉検証（Argon2 verify）
    let matchedRoomId: string | null = null;

    for (const room of rooms) {
      const isMatch = await verifyPassphrase(passphrase, room.passphrase_hash);
      if (isMatch) {
        matchedRoomId = room.id;
        break;
      }
    }

    if (!matchedRoomId) {
      return NextResponse.json(
        { error: '合言葉が一致しません' },
        { status: 404 }
      );
    }

    // 3. ニックネーム重複チェック
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('nickname')
      .eq('room_id', matchedRoomId);

    let finalNickname = nickname;
    let suffix = 2;

    while (existingPlayers?.some((p) => p.nickname === finalNickname)) {
      finalNickname = `${nickname}-${suffix}`;
      suffix++;
    }

    // 4. 匿名認証
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 500 }
      );
    }

    // 5. Player追加
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        id: authData.user.id,
        room_id: matchedRoomId,
        nickname: finalNickname,
        is_host: false,
      })
      .select()
      .single();

    if (playerError) {
      return NextResponse.json(
        { error: 'プレイヤー追加に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      room_id: matchedRoomId,
      player_id: player.id,
      nickname: finalNickname,
      is_host: false,
    }, { status: 200 });

  } catch (error) {
    console.error('Room join error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}
```

#### 成果物
- ✅ POST /api/rooms/join 実装
- ✅ ニックネーム重複処理（"-2"付加）
- ✅ 存在チェックエラーハンドリング

---

### Day 4-5: ロビー画面、レートリミット（O3追加タスク）

#### タスク詳細（Day 4: ロビー画面）

**app/rooms/[id]/lobby/page.tsx**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Player {
  id: string;
  nickname: string;
  is_host: boolean;
  is_connected: boolean;
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState('LOBBY');
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期データ取得
    fetchPlayers();
    fetchRoomPhase();
    checkIsHost();

    // Realtime購読
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) => [...prev, payload.new as Player]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setPhase(payload.new.phase);

          // フェーズ変更時にページ遷移
          if (payload.new.phase !== 'LOBBY') {
            router.push(`/rooms/${roomId}/${payload.new.phase.toLowerCase()}`);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  async function fetchPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setPlayers(data);
    }
    setLoading(false);
  }

  async function fetchRoomPhase() {
    const { data } = await supabase
      .from('rooms')
      .select('phase')
      .eq('id', roomId)
      .single();

    if (data) {
      setPhase(data.phase);
    }
  }

  async function checkIsHost() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('players')
      .select('is_host')
      .eq('id', user.id)
      .single();

    if (data) {
      setIsHost(data.is_host);
    }
  }

  async function handleStartGame() {
    if (players.length < 3) {
      alert('最低3人必要です');
      return;
    }

    // フェーズを 'DEAL' に更新（Phase 2で実装）
    const { error } = await supabase
      .from('rooms')
      .update({ phase: 'DEAL' })
      .eq('id', roomId);

    if (error) {
      console.error('Failed to start game:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-gray-100">
      <Card className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">ロビー</h1>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">
            参加者一覧 ({players.length}人)
          </h2>

          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.nickname}</span>
                  {player.is_host && (
                    <span className="px-2 py-1 bg-primary text-white text-xs rounded">
                      ホスト
                    </span>
                  )}
                </div>

                <div className={`w-2 h-2 rounded-full ${player.is_connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartGame}
            disabled={players.length < 3}
          >
            ゲーム開始
          </Button>
        )}
      </Card>
    </main>
  );
}
```

#### タスク詳細（Day 5: レートリミット）

**lib/middleware/rate-limit.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

// メモリ内レートリミットストア（本番ではRedis使用推奨）
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const MAX_REQUESTS = 5; // 5リクエスト/分

export function rateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    // 新規または期限切れ
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return null;
  }

  if (record.count >= MAX_REQUESTS) {
    // レート制限超過
    return NextResponse.json(
      { error: 'リクエストが多すぎます。1分後に再試行してください。' },
      { status: 429 }
    );
  }

  // カウント増加
  record.count += 1;
  rateLimitStore.set(ip, record);

  return null;
}
```

**app/api/rooms/route.ts（修正）**:
```typescript
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function POST(req: NextRequest) {
  // レートリミットチェック
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 既存のロジック
  // ...
}
```

#### 成果物
- ✅ ロビー画面UI実装
- ✅ プレイヤー一覧コンポーネント
- ✅ Realtime購読実装（入退室反映）
- ✅ レートリミット実装（5リクエスト/分）

---

### Week 2 完了基準

#### 必須項目
- [ ] ルーム作成・参加が動作
- [ ] ロビーで参加者一覧が表示される
- [ ] ホストに開始ボタンが表示される
- [ ] 入退室がリアルタイム反映される
- [ ] レートリミットが機能している

#### 検証方法
```bash
# 1. ルーム作成テスト
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"test","nickname":"Player1"}'

# 2. ルーム参加テスト
curl -X POST http://localhost:3000/api/rooms/join \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"test","nickname":"Player2"}'

# 3. レートリミットテスト（6回連続実行）
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/rooms \
    -H "Content-Type: application/json" \
    -d '{"passphrase":"test'$i'","nickname":"Player1"}'
done
# → 6回目は 429 Too Many Requests
```

---

## Week 3: Realtime統合・XState設計

### 目標
Realtime購読の完全実装とXStateステートマシンの統合

### Day 1: Supabase Realtime購読、タイマー同期設計（O3追加タスク）

#### タスク詳細（前半: Realtime購読）

**3.1 Realtimeフック作成**

**lib/supabase/realtime.ts**:
```typescript
import { useEffect } from 'react';
import { supabase } from './client';

export function useRoomSubscription(
  roomId: string,
  handlers: {
    onRoomUpdate?: (payload: any) => void;
    onPlayerInsert?: (payload: any) => void;
    onPlayerDelete?: (payload: any) => void;
    onPlayerUpdate?: (payload: any) => void;
  }
) {
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`);

    if (handlers.onRoomUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        handlers.onRoomUpdate
      );
    }

    if (handlers.onPlayerInsert) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        handlers.onPlayerInsert
      );
    }

    if (handlers.onPlayerDelete) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        handlers.onPlayerDelete
      );
    }

    if (handlers.onPlayerUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        handlers.onPlayerUpdate
      );
    }

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, handlers]);
}
```

#### タスク詳細（後半: タイマー同期設計）

**docs/timer-sync-design.md**:
```markdown
# タイマー同期設計書

## 原則
**サーバーepoch基準**: クライアント側の時刻ズレを吸収

## データモデル

### game_sessions テーブル
- `start_time`: フェーズ開始時刻（TIMESTAMP WITH TIME ZONE）
- `deadline_epoch`: 締切時刻（BIGINT、Unixエポック秒）

## 計算ロジック

### サーバー側（Edge Function）
```typescript
// 質問フェーズ開始時
const startTime = new Date();
const deadlineEpoch = Math.floor(Date.now() / 1000) + 300; // 5分後

await supabase
  .from('game_sessions')
  .update({
    phase: 'QUESTION',
    start_time: startTime.toISOString(),
    deadline_epoch: deadlineEpoch,
  })
  .eq('id', sessionId);
```

### クライアント側（React）
```typescript
function Timer({ deadlineEpoch }: { deadlineEpoch: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = deadlineEpoch - now;

      if (diff <= 0) {
        setRemaining(0);
        clearInterval(interval);
      } else {
        setRemaining(diff);
      }
    }, 100); // 100msごとに更新

    return () => clearInterval(interval);
  }, [deadlineEpoch]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="text-6xl font-bold">
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
```

## 正解報告と時間継承

### サーバー側
```typescript
// 正解報告時
const now = Math.floor(Date.now() / 1000);
const { start_time, deadline_epoch } = await getSession(sessionId);

// タイムアウトチェック
if (now > deadline_epoch) {
  throw new Error('Time has expired');
}

// 経過時間計算
const startEpoch = Math.floor(new Date(start_time).getTime() / 1000);
const elapsed = now - startEpoch;
const remaining = 300 - elapsed;

// 討論締切設定
const debateDeadline = now + remaining;

await supabase
  .from('game_sessions')
  .update({
    phase: 'DEBATE',
    deadline_epoch: debateDeadline,
    answerer_id: answererId,
  })
  .eq('id', sessionId);
```

## 同期精度

### 目標値
- **レイテンシ**: サーバー書き込み〜クライアント受信 <500ms
- **表示誤差**: ±1秒以内（複数クライアント間）

### 測定方法
```typescript
// Realtimeレイテンシ測定
const startTime = Date.now();

await supabase
  .from('rooms')
  .update({ phase: 'TEST' })
  .eq('id', roomId);

// Realtime受信時
channel.on('UPDATE', () => {
  const latency = Date.now() - startTime;
  console.log('Realtime latency:', latency, 'ms');
});
```

## リスク対策

### クライアント時刻ズレ
✅ **対策**: サーバーepochのみを信頼、クライアント時刻は使用しない

### Realtime遅延
⚠️ **リスク**: 500ms以上の遅延が頻発する可能性
📊 **検証**: Week 3 Day 3でレイテンシ測定、500ms超過率を確認
🔧 **代替策**: Socket.io移行（Week 4判断）

### ネットワーク切断
✅ **対策**: 再接続時に最新のdeadline_epochを再取得
```

#### 成果物
- ✅ Realtime購読フック実装
- ✅ タイマー同期設計書作成

---

### Day 2: XStateステートマシン統合

**lib/state-machine/use-game-state.ts**:
```typescript
import { useMachine } from '@xstate/react';
import { gameMachine } from './game-machine';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useGameState(roomId: string) {
  const [state, send] = useMachine(gameMachine);

  useEffect(() => {
    // サーバーのフェーズを購読
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const serverPhase = payload.new.phase;

          // サーバーフェーズに応じてXStateイベント送信
          switch (serverPhase) {
            case 'DEAL':
              send({ type: 'START_GAME' });
              break;
            case 'TOPIC':
              send({ type: 'ROLE_CONFIRMED' });
              break;
            case 'QUESTION':
              send({ type: 'TOPIC_CONFIRMED' });
              break;
            case 'DEBATE':
              send({ type: 'CORRECT_REPORTED' });
              break;
            case 'VOTE1':
              send({ type: 'DEBATE_END' });
              break;
            case 'RESULT':
              send({ type: 'VOTE1_COMPLETE' }); // 簡略化
              break;
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, send]);

  return {
    currentPhase: state.value,
    context: state.context,
    send,
  };
}
```

#### 成果物
- ✅ XState統合フック実装
- ✅ サーバーフェーズとXState同期

---

### Day 3: フェーズ遷移ロジック、Realtimeレイテンシ測定

#### タスク詳細（前半: フェーズ遷移）

**app/api/sessions/start/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { room_id, difficulty } = await req.json();

    const supabase = createClient();

    // 1. ゲームセッション作成
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        room_id,
        difficulty,
        phase: 'DEAL',
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: 'セッション作成に失敗しました' },
        { status: 500 }
      );
    }

    // 2. ルームフェーズ更新
    const { error: roomError } = await supabase
      .from('rooms')
      .update({ phase: 'DEAL' })
      .eq('id', room_id);

    if (roomError) {
      return NextResponse.json(
        { error: 'フェーズ更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session_id: session.id }, { status: 200 });
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}
```

#### タスク詳細（後半: レイテンシ測定）

**tests/realtime-latency.test.ts**:
```typescript
import { supabase } from '@/lib/supabase/client';

describe('Realtime Latency Test', () => {
  test('Should receive UPDATE event within 500ms', async () => {
    const roomId = '11111111-1111-1111-1111-111111111111';
    let latency = 0;

    // チャネル購読
    const channel = supabase.channel(`room:${roomId}`);

    const promise = new Promise<number>((resolve) => {
      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`,
          },
          () => {
            latency = Date.now() - startTime;
            resolve(latency);
          }
        )
        .subscribe();
    });

    // UPDATE実行
    const startTime = Date.now();
    await supabase
      .from('rooms')
      .update({ phase: 'TEST' })
      .eq('id', roomId);

    // レイテンシ測定
    latency = await promise;

    console.log('Realtime latency:', latency, 'ms');

    // 500ms以内であることを確認
    expect(latency).toBeLessThan(500);
  }, 10000); // タイムアウト10秒
});
```

**tests/latency-benchmark.ts**（手動実行スクリプト）:
```typescript
import { supabase } from '@/lib/supabase/client';

async function measureRealtimeLatency(iterations: number) {
  const roomId = '11111111-1111-1111-1111-111111111111';
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const channel = supabase.channel(`room:${roomId}-${i}`);

    const latency = await new Promise<number>((resolve) => {
      let startTime = 0;

      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`,
          },
          () => {
            resolve(Date.now() - startTime);
          }
        )
        .subscribe();

      setTimeout(async () => {
        startTime = Date.now();
        await supabase
          .from('rooms')
          .update({ phase: `TEST-${i}` })
          .eq('id', roomId);
      }, 100);
    });

    latencies.push(latency);
    console.log(`Iteration ${i + 1}: ${latency}ms`);

    await channel.unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
  }

  // 統計計算
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const max = Math.max(...latencies);
  const min = Math.min(...latencies);
  const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

  console.log('\n=== Realtime Latency Report ===');
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${min}ms`);
  console.log(`Max: ${max}ms`);
  console.log(`P95: ${p95}ms`);
  console.log(`Over 500ms: ${latencies.filter((l) => l > 500).length}/${latencies.length}`);

  return { avg, max, min, p95 };
}

// 実行
measureRealtimeLatency(20).then((stats) => {
  if (stats.p95 > 500) {
    console.warn('⚠️ P95 latency exceeds 500ms. Consider Socket.io migration.');
  } else {
    console.log('✅ Realtime latency meets requirement (<500ms)');
  }
});
```

#### 成果物
- ✅ フェーズ遷移API実装
- ✅ Realtimeレイテンシテスト実装
- ✅ レイテンシベンチマーク実行

#### 確認方法
```bash
# レイテンシ測定
npm run test:latency

# 期待される出力:
# Average: 200-300ms
# P95: <500ms
# Over 500ms: 0/20
```

---

### Day 4: 入退室テスト、E2Eテスト基盤（O3追加タスク）

#### タスク詳細（前半: 入退室テスト）

**tests/room-join-leave.test.ts**:
```typescript
import { supabase } from '@/lib/supabase/client';

describe('Room Join/Leave Real-time Test', () => {
  test('Should reflect player join in real-time', async () => {
    const roomId = '11111111-1111-1111-1111-111111111111';
    const players: any[] = [];

    // チャネル購読
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          players.push(payload.new);
        }
      )
      .subscribe();

    // プレイヤー追加
    await supabase.from('players').insert({
      id: 'test-player-id',
      room_id: roomId,
      nickname: 'Test Player',
      is_host: false,
    });

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // プレイヤーが追加されたことを確認
    expect(players.length).toBe(1);
    expect(players[0].nickname).toBe('Test Player');
  });
});
```

#### タスク詳細（後半: E2Eテスト基盤）

**playwright.config.ts**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**tests/e2e/room-creation.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';

test('Should create room and show lobby', async ({ page, context }) => {
  // 1. トップページ表示
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('インサイダーゲーム');

  // 2. 部屋を作るボタンをクリック
  await page.click('text=部屋を作る');

  // 3. モーダルが表示される
  await expect(page.locator('text=部屋を作る')).toBeVisible();

  // 4. 合言葉とニックネーム入力
  await page.fill('input[id="passphrase"]', 'e2e-test-room');
  await page.fill('input[id="nickname"]', 'E2E Player 1');

  // 5. 作成ボタンをクリック
  await page.click('button[type="submit"]');

  // 6. ロビー画面に遷移
  await expect(page).toHaveURL(/\/rooms\/.*\/lobby/);
  await expect(page.locator('h1')).toContainText('ロビー');

  // 7. プレイヤーが表示される
  await expect(page.locator('text=E2E Player 1')).toBeVisible();
  await expect(page.locator('text=ホスト')).toBeVisible();

  // 8. 別のブラウザで参加
  const player2 = await context.newPage();
  await player2.goto('/');
  await player2.click('text=部屋を探す');
  await player2.fill('input[id="passphrase"]', 'e2e-test-room');
  await player2.fill('input[id="nickname"]', 'E2E Player 2');
  await player2.click('button[type="submit"]');

  // 9. Player 1の画面でPlayer 2が表示される（リアルタイム反映）
  await expect(page.locator('text=E2E Player 2')).toBeVisible({ timeout: 2000 });

  // 10. Player 2の画面でも両方表示される
  await expect(player2.locator('text=E2E Player 1')).toBeVisible();
  await expect(player2.locator('text=E2E Player 2')).toBeVisible();
});
```

#### 成果物
- ✅ 入退室リアルタイムテスト実装
- ✅ Playwright環境構築
- ✅ E2Eテスト1シナリオ実装

---

### Day 5: モバイル互換検証、Phase 1統合テスト

#### タスク詳細（前半: モバイル互換）

**モバイルテストチェックリスト**:
```markdown
# モバイル互換性テスト

## テスト環境
- [ ] iPhone Safari (iOS 15以降)
- [ ] Android Chrome (Android 10以降)
- [ ] iPad Safari

## テスト項目

### トップページ
- [ ] ボタンが44px以上（タップ可能）
- [ ] フォントサイズ16px以上（自動ズーム防止）
- [ ] モーダルが画面内に収まる

### ロビー画面
- [ ] プレイヤーリストがスクロール可能
- [ ] 参加者名が折り返し表示
- [ ] 開始ボタンが下部に固定

### 一般
- [ ] Realtime接続が安定
- [ ] ネットワーク切断から復帰可能
- [ ] 横画面対応（オプション）

## 実行方法
```bash
# iPhone実機テスト
npm run dev
# → iPhoneで http://<PC-IP>:3000 にアクセス

# Android実機テスト
npm run dev
# → Androidで http://<PC-IP>:3000 にアクセス
```
```

#### タスク詳細（後半: 統合テスト）

**tests/integration/phase1-complete.test.ts**:
```typescript
import { test, expect } from '@playwright/test';

test('Phase 1 Complete Integration Test', async ({ page, context }) => {
  // 1. ルーム作成
  await page.goto('/');
  await page.click('text=部屋を作る');
  await page.fill('input[id="passphrase"]', 'integration-test');
  await page.fill('input[id="nickname"]', 'Host');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/rooms\/.*\/lobby/);

  // 2. 3人参加
  const players = [];
  for (let i = 1; i <= 3; i++) {
    const player = await context.newPage();
    await player.goto('/');
    await player.click('text=部屋を探す');
    await player.fill('input[id="passphrase"]', 'integration-test');
    await player.fill('input[id="nickname"]', `Player ${i}`);
    await player.click('button[type="submit"]');
    await expect(player).toHaveURL(/\/rooms\/.*\/lobby/);
    players.push(player);
  }

  // 3. ホスト画面で全員表示確認
  await expect(page.locator('text=Host')).toBeVisible();
  await expect(page.locator('text=Player 1')).toBeVisible();
  await expect(page.locator('text=Player 2')).toBeVisible();
  await expect(page.locator('text=Player 3')).toBeVisible();
  await expect(page.locator('text=参加者一覧 (4人)')).toBeVisible();

  // 4. 開始ボタンが有効
  const startButton = page.locator('text=ゲーム開始');
  await expect(startButton).toBeEnabled();

  // 5. 開始ボタンクリック（Phase 2で実装されるフェーズへ遷移）
  // await startButton.click();
  // await expect(page).toHaveURL(/\/rooms\/.*\/deal/);

  console.log('✅ Phase 1 Integration Test Passed');
});
```

#### 成果物
- ✅ モバイル互換性テスト実施
- ✅ Phase 1統合テスト実装

---

### Week 3 完了基準

#### 必須項目
- [ ] Realtime購読が動作
- [ ] 入退室がリアルタイム反映（±2秒以内）
- [ ] XStateでフェーズ管理が動作
- [ ] Realtimeレイテンシ<500ms（P95）
- [ ] モバイルブラウザで動作確認
- [ ] E2Eテスト1シナリオがパス

#### 検証方法
```bash
# 1. Realtimeレイテンシ測定
npm run test:latency
# → P95 < 500ms

# 2. E2Eテスト実行
npx playwright test
# → All tests passed

# 3. モバイル実機テスト
npm run dev
# → iPhone/Androidで http://<PC-IP>:3000 にアクセス
```

---

## リスク管理

### 高リスク項目（Week 3終了時点で判断）

| リスク | 判定基準 | 対策 | 判断タイミング |
|--------|---------|------|------------|
| **Realtime レイテンシ超過** | P95 > 500ms | Socket.io移行検討 | Week 3 Day 3 |
| **RLS脆弱性** | テスト失敗 | ポリシー修正 | Week 1 Day 4 |
| **XState複雑性** | 実装遅延 | Redux Toolkit代替 | Week 3 Day 2 |
| **タスク量超過** | Week 2遅延 | スコープ削減 | Week 2 終了時 |

### リスク判定フロー

```
Week 3 Day 3: Realtimeレイテンシ測定
    ↓
P95 < 500ms?
    ↓ Yes
Phase 1完了
    ↓ No
Socket.io移行判断会議
    ↓
Week 4で移行実装
```

---

## 完了基準

### Phase 1全体の完了基準

#### 技術的完了基準
1. **機能動作**
   - ✅ ルーム作成・参加が動作
   - ✅ ロビーでリアルタイム反映
   - ✅ 匿名認証が動作
   - ✅ RLSポリシーが機能

2. **性能基準**
   - ✅ Realtimeレイテンシ P95 <500ms
   - ✅ API応答時間 P95 <200ms
   - ✅ 30名同時接続で動作（負荷テスト）

3. **品質基準**
   - ✅ E2Eテスト1シナリオパス
   - ✅ RLSテスト全パス
   - ✅ ESLint/Prettier エラーゼロ

4. **運用基準**
   - ✅ ローカル開発環境が安定動作
   - ✅ Vercelに自動デプロイ可能
   - ✅ エラーログが記録される

#### ドキュメント完了基準
- ✅ XState状態遷移図
- ✅ タイマー同期設計書
- ✅ Realtimeレイテンシ測定レポート
- ✅ モバイル互換性テスト結果

---

## 次フェーズへの引継ぎ

### Phase 2で実装する機能
1. 役職配布Edge Function
2. お題配信Edge Function
3. タイマーコンポーネント
4. 質問・討論フェーズ画面
5. 投票システム（第一・第二・決選）
6. 結果画面

### Phase 1からの引継ぎ事項

#### コードベース
- `lib/supabase/` - クライアント・サーバー初期化
- `lib/state-machine/` - XState定義
- `components/ui/` - 基本UIコンポーネント
- `app/api/rooms/` - ルーム管理API

#### データベース
- 全テーブルが作成済み
- RLSポリシーが有効
- お題データ130問投入済み

#### 設定ファイル
- `tailwind.config.ts` - カラーパレット定義済み
- `.env.local` - 環境変数設定済み
- `playwright.config.ts` - E2Eテスト環境

#### テスト
- `tests/rls-security.test.ts` - RLSテスト
- `tests/e2e/room-creation.spec.ts` - E2Eテストサンプル

---

## まとめ

### Phase 1の価値

1. **技術的基盤の確立**
   - Supabase Realtime の実装ノウハウ獲得
   - RLS による秘匿管理の実証
   - XState によるフェーズ管理パターン確立

2. **リスクの早期検証**
   - Realtime レイテンシの実測値取得
   - 30名同時接続の動作確認
   - モバイルブラウザ互換性の確認

3. **開発速度の向上**
   - 再利用可能なコンポーネント整備
   - API設計パターンの確立
   - テスト自動化基盤の構築

### 次のステップ

Phase 1完了後、即座にPhase 2（ゲームコア機能）の実装に移行できます。

**Phase 2 Week 1（Week 4）の初日タスク**:
1. 役職配布Edge Function実装
2. お題選択API実装
3. 役職配布画面UI実装

---

**承認**: Phase 1実装計画書 v1.0
**承認者**: _______________
**承認日**: _______________
