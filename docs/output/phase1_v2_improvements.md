# Phase 1 実装計画書 v2.0 改善差分

**適用対象**: [phase1_implementation_plan.md](./phase1_implementation_plan.md)
**作成日**: 2025-10-20
**ベースバージョン**: v1.0
**改善バージョン**: v2.0

このドキュメントは、Gemini MCP + O3 MCP による検証フィードバック（[phase1_validation_report.md](./phase1_validation_report.md)）を反映した、Phase 1実装計画書の改善差分です。

---

## 目次

1. [改善サマリー](#改善サマリー)
2. [Week 1 改善](#week-1-改善)
3. [Week 2 改善](#week-2-改善)
4. [Week 4 追加](#week-4-追加)
5. [完了基準の更新](#完了基準の更新)

---

## 改善サマリー

### スケジュール変更

| 項目 | v1.0 | v2.0 |
|------|------|------|
| **期間** | 3週間 | 4週間 |
| **人日** | 15人日 | 20人日 |
| **バッファ** | なし | 5人日（Week 4） |

### 主要改善箇所

| 改善項目 | 優先度 | 実装週 | 作業量 |
|---------|--------|-------|--------|
| **ルーム参加APIスケーラビリティ** | 🔴 高 | Week 2 Day 3 | 4時間 |
| **RPC関数によるトランザクション化** | 🟡 中 | Week 2 Day 2 | 2時間 |
| **CI/CD環境構築** | 🔴 高 | Week 1 Day 1 | 2時間 |
| **Realtimeレイテンシ早期スパイク** | 🔴 高 | Week 1 Day 5 | 4時間 |
| **監視・アラート実装** | 🔴 高 | Week 2 Day 5 | 2時間 |
| **セキュリティヘッダー** | 🟡 中 | Week 2 Day 5 | 1時間 |
| **Week 4統合テスト・本番準備** | 🔴 高 | Week 4 | 5日 |

---

## Week 1 改善

### Day 1: CI/CD環境構築追加

**v1.0からの追加内容**:

#### 1.5 CI/CDパイプライン構築

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
# Vercelプロジェクト作成
npx vercel link

# 環境変数設定（HMACシークレット追加）
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add PASSPHRASE_HMAC_SECRET production
```

---

### Day 3-4: DB Migration - passphrase_keyカラム追加

**supabase/migrations/xxxxx_add_passphrase_key.sql**:
```sql
-- v2.0追加: HMAC-SHA256インデックス用カラム
ALTER TABLE rooms ADD COLUMN passphrase_key TEXT;
ALTER TABLE rooms ADD COLUMN passphrase_key_version INTEGER DEFAULT 1;

-- インデックス作成
CREATE INDEX idx_rooms_passphrase_key ON rooms(passphrase_key);

-- 既存データはNULLのまま（遅延マイグレーション）
```

---

### Day 5: Realtimeレイテンシ早期スパイク追加

**v1.0**: Tailwind UI + XState早期プロトタイプのみ
**v2.0追加**: Realtimeレイテンシ早期測定

#### 5.3 Realtimeレイテンシ早期測定（v2.0追加）

**目的**: Week 3で判断では遅い → Week 1で技術リスクを早期検証

**tests/latency-spike.ts**:
```typescript
import { supabase } from '@/lib/supabase/client';

async function measureRealtimeLatency(iterations: number) {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const roomId = `test-${Date.now()}`;
    const channel = supabase.channel(`spike:${roomId}`);

    const latency = await new Promise<number>((resolve) => {
      let startTime = 0;

      channel
        .on('broadcast', { event: 'test' }, () => {
          resolve(Date.now() - startTime);
        })
        .subscribe();

      // 購読完了後に送信
      setTimeout(() => {
        startTime = Date.now();
        channel.send({ type: 'broadcast', event: 'test', payload: {} });
      }, 100);
    });

    latencies.push(latency);
    console.log(`Iteration ${i + 1}: ${latency}ms`);

    await channel.unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 統計計算
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

  console.log('\n=== Latency Spike Report ===');
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`P95: ${p95}ms`);
  console.log(`Target: <500ms`);

  if (p95 > 500) {
    console.warn('⚠️ P95レイテンシが目標超過。Socket.io移行を検討してください。');
  } else {
    console.log('✅ Realtimeレイテンシ目標達成');
  }

  return { avg, p95 };
}

// 実行
measureRealtimeLatency(20);
```

**実行方法**:
```bash
# Week 1 Day 5に実施
npx ts-node tests/latency-spike.ts
```

**判断基準**:
- **P95 < 500ms**: Supabase Realtime継続
- **P95 > 500ms**: Socket.io移行を検討（Week 2から並行実装）

---

## Week 2 改善

### Day 2: RPC関数によるトランザクション化

**v1.0**: 手動ロールバック処理
**v2.0**: Supabase RPC関数で自動トランザクション

#### 2.1 HMAC-SHA256関数追加

**lib/crypto/hash.ts** に追加:
```typescript
import { hash, verify } from '@node-rs/argon2';
import { createHmac } from 'crypto';

const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 3, // v1.0: 2 → v2.0: 3 に引き上げ（O3推奨）
  parallelism: 1,
};

// v2.0追加: HMAC-SHA256でインデックス用キー生成
export function generatePassphraseKey(passphrase: string): string {
  const secret = process.env.PASSPHRASE_HMAC_SECRET!;
  return createHmac('sha256', secret).update(passphrase.normalize('NFC')).digest('hex');
}

// 既存のArgon2関数は維持
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

#### 2.2 Supabase RPC関数作成

**supabase/migrations/xxxxx_create_room_rpc.sql**:
```sql
CREATE OR REPLACE FUNCTION create_room_with_host(
  p_passphrase_hash TEXT,
  p_passphrase_key TEXT,
  p_passphrase_key_version INTEGER,
  p_nickname TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- 単一トランザクション内でRoom作成・Player作成・Host更新
  INSERT INTO rooms (passphrase_hash, passphrase_key, passphrase_key_version, host_id, phase)
  VALUES (p_passphrase_hash, p_passphrase_key, p_passphrase_key_version, p_user_id, 'LOBBY')
  RETURNING id INTO v_room_id;

  INSERT INTO players (id, room_id, nickname, is_host)
  VALUES (p_user_id, v_room_id, p_nickname, true);

  RETURN json_build_object('room_id', v_room_id, 'player_id', p_user_id);
EXCEPTION
  WHEN OTHERS THEN
    -- エラー時は自動ロールバック
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.3 ルーム作成API修正

**app/api/rooms/route.ts** (v2.0修正版):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPassphrase, generatePassphraseKey } from '@/lib/crypto/hash';
import { createRoomSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passphrase, nickname } = createRoomSchema.parse(body);

    // Argon2ハッシュ化（セキュリティ）
    const hashedPassphrase = await hashPassphrase(passphrase);

    // HMAC-SHA256キー生成（インデックス検索用）
    const passphraseKey = generatePassphraseKey(passphrase);

    const supabase = createClient();

    // 匿名認証
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 500 });
    }

    // RPC関数でトランザクション実行
    const { data, error } = await supabase.rpc('create_room_with_host', {
      p_passphrase_hash: hashedPassphrase,
      p_passphrase_key: passphraseKey,
      p_passphrase_key_version: 1,
      p_nickname: nickname,
      p_user_id: authData.user.id,
    });

    if (error) {
      console.error('Room creation error:', error);
      return NextResponse.json({ error: 'ルーム作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      room_id: data.room_id,
      player_id: data.player_id,
      is_host: true,
    }, { status: 201 });

  } catch (error) {
    console.error('Room creation error:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}
```

---

### Day 3: ルーム参加APIスケーラビリティ改善

**v1.0**: 全ルームをループでArgon2照合 → O(N × 100ms)
**v2.0**: HMAC-SHA256インデックス検索 + 遅延マイグレーション → O(1 × 1ms + 1 × 100ms)

**app/api/rooms/join/route.ts** (v2.0修正版):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPassphrase, generatePassphraseKey } from '@/lib/crypto/hash';
import { createRoomSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passphrase, nickname } = createRoomSchema.parse(body);

    const supabase = createClient();

    // v2.0: 高速なHMAC-SHA256検索
    const passphraseKey = generatePassphraseKey(passphrase);

    const { data: room } = await supabase
      .from('rooms')
      .select('id, passphrase_hash, passphrase_key')
      .eq('passphrase_key', passphraseKey)
      .single();

    let matchedRoomId: string | null = null;

    if (room) {
      // 候補が見つかった → Argon2で最終検証（1回のみ）
      const isMatch = await verifyPassphrase(passphrase, room.passphrase_hash);
      if (isMatch) {
        matchedRoomId = room.id;
      }
    } else {
      // v2.0: 遅延マイグレーション - 旧ルーム（passphrase_key IS NULL）の検索
      const { data: legacyRooms } = await supabase
        .from('rooms')
        .select('id, passphrase_hash')
        .is('passphrase_key', null);

      if (legacyRooms && legacyRooms.length > 0) {
        for (const legacyRoom of legacyRooms) {
          const isMatch = await verifyPassphrase(passphrase, legacyRoom.passphrase_hash);
          if (isMatch) {
            matchedRoomId = legacyRoom.id;

            // 遅延マイグレーション: passphrase_keyを更新
            await supabase
              .from('rooms')
              .update({
                passphrase_key: passphraseKey,
                passphrase_key_version: 1,
              })
              .eq('id', matchedRoomId);

            break;
          }
        }
      }
    }

    if (!matchedRoomId) {
      return NextResponse.json({ error: '合言葉が一致しません' }, { status: 404 });
    }

    // ニックネーム重複チェック
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

    // 匿名認証
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 500 });
    }

    // Player追加
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
      return NextResponse.json({ error: 'プレイヤー追加に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      room_id: matchedRoomId,
      player_id: player.id,
      nickname: finalNickname,
      is_host: false,
    }, { status: 200 });

  } catch (error) {
    console.error('Room join error:', error);
    return NextResponse.json({ error: '内部サーバーエラー' }, { status: 500 });
  }
}
```

**パフォーマンス比較**:
| ルーム数 | v1.0（平均） | v2.0（新ルーム） | v2.0（旧ルーム、最悪） | 改善率 |
|---------|------------|--------------|-------------------|--------|
| 100件 | 5秒 | 101ms | 5秒 | **98%短縮** |
| 1000件 | 50秒 | 101ms | 50秒 | **99.8%短縮** |

---

### Day 5: 監視・セキュリティヘッダー追加

**v1.0**: レートリミットのみ
**v2.0**: 監視・アラート、セキュリティヘッダー追加

#### 5.1 Sentry監視・アラート実装

**インストール**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**sentry.client.config.ts**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
});
```

**sentry.server.config.ts**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

#### 5.2 セキュリティヘッダー実装

**next.config.mjs** に追加:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' *.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Week 4 追加

**v1.0**: Week 3で終了
**v2.0**: Week 4を追加（統合テスト、バグ修正、本番準備）

### 目標
本番リリース可能な品質への到達とドキュメント整備

### Day 1: 統合テスト実施

#### タスク詳細

**4.1 Phase 1統合テストシナリオ実行**

**tests/integration/phase1-complete.spec.ts**:
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

  console.log('✅ Phase 1 Integration Test Passed');
});
```

**4.2 負荷テスト実行**

**k6スクリプト（tests/load/room-join.js）**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // 10並行ユーザーまでランプアップ
    { duration: '1m', target: 30 }, // 30並行ユーザーを1分維持
    { duration: '30s', target: 0 }, // ランプダウン
  ],
};

export default function () {
  const passphrase = `test-${__VU}-${__ITER}`;
  const nickname = `User-${__VU}`;

  const createRes = http.post('http://localhost:3000/api/rooms', JSON.stringify({
    passphrase,
    nickname,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(createRes, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

**実行方法**:
```bash
npm install -g k6
k6 run tests/load/room-join.js
```

**合格基準**:
- P95 < 500ms
- エラー率 < 1%

---

### Day 2: バグ修正とリファクタリング

#### タスク詳細

**4.3 Week 1-3で発見されたバグの修正**

バグトラッカーから優先度順に修正:
- 🔴 Critical: ルーム作成時のトランザクション失敗
- 🟡 High: Realtimeチャネル購読の競合
- 🟢 Medium: UIのレイアウト崩れ

**4.4 コード品質改善**

```bash
# ESLintエラー全修正
npm run lint --fix

# 未使用コード削除
npx ts-prune

# 循環依存チェック
npx madge --circular --extensions ts,tsx ./app
```

---

### Day 3: ドキュメント整備

#### タスク詳細

**4.5 開発ドキュメント作成**

**docs/development_guide.md**:
```markdown
# インサイダーゲーム - 開発ガイド

## ローカル開発環境セットアップ

1. リポジトリクローン
   ```bash
   git clone https://github.com/{org}/{repo}.git
   cd {repo}
   ```

2. 依存関係インストール
   ```bash
   npm install
   ```

3. Supabase Local起動
   ```bash
   supabase start
   ```

4. 環境変数設定
   ```bash
   cp .env.example .env.local
   # .env.localを編集
   ```

5. 開発サーバー起動
   ```bash
   npm run dev
   ```

## アーキテクチャ

- **状態管理**: サーバー主導、XStateは表示のみ
- **認証**: Supabase匿名認証
- **リアルタイム**: Supabase Realtime (WebSocket)

## コーディング規約

- TypeScript strict mode
- ESLint + Prettier必須
- コミット前に`npm run lint`実行
```

**4.6 運用ドキュメント作成**

**docs/operation_guide.md**:
```markdown
# インサイダーゲーム - 運用ガイド

## 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase匿名キー | ✅ |
| PASSPHRASE_HMAC_SECRET | HMAC秘密鍵 | ✅ |
| SENTRY_DSN | Sentryエラー監視 | 推奨 |

## デプロイ

1. mainブランチへpush → Vercel自動デプロイ
2. Supabase migration実行: `supabase db push`
3. 動作確認: `https://{project}.vercel.app`

## 監視

- Sentry: エラーレート、パフォーマンス
- Vercel Analytics: トラフィック、Web Vitals
- Supabase Dashboard: DB負荷、Realtime接続数
```

---

### Day 4: セキュリティ監査

#### タスク詳細

**4.7 RLSポリシー全件レビュー**

```bash
# 全RLSポリシーをテスト
npm run test:rls

# 期待される出力:
# ✅ Player A cannot see Player B role
# ✅ Player can see own role
# ✅ CITIZEN cannot see topics
# ✅ All players can see topics after RESULT phase
```

**4.8 脆弱性スキャン**

```bash
# npm audit
npm audit --audit-level=moderate

# Snyk スキャン
npx snyk test

# OWASP Dependency-Check
dependency-check --project "Insider Game" --scan .
```

**4.9 セキュリティチェックリスト**

- [ ] RLSポリシー全テーブル有効化
- [ ] 匿名認証トークンTTL 24時間設定
- [ ] HMAC秘密鍵が環境変数管理
- [ ] HTTPS強制（Vercel自動）
- [ ] CSP、HSTS、X-Frame-Optionsヘッダー設定
- [ ] レート制限（5 req/min）有効
- [ ] SQLインジェクション対策（Supabaseクライアント使用）
- [ ] XSS対策（React自動エスケープ）

---

### Day 5: 本番リリース準備

#### タスク詳細

**4.10 本番環境デプロイ**

```bash
# Supabase本番環境マイグレーション
supabase db push --project-ref {production-ref}

# Vercel本番環境変数設定確認
npx vercel env ls production

# 本番デプロイ
git push origin main
```

**4.11 スモークテスト実施**

本番環境で以下を確認:
- [ ] トップページ表示
- [ ] ルーム作成
- [ ] ルーム参加
- [ ] ロビーでリアルタイム反映
- [ ] 開始ボタン表示（ホストのみ）
- [ ] モバイルブラウザ動作確認

**4.12 Phase 2準備**

**docs/phase2_handoff.md** 作成:
```markdown
# Phase 2引継ぎ

## Phase 1完了成果物

- ✅ ルーム作成・参加機能
- ✅ ロビー画面（リアルタイム同期）
- ✅ 匿名認証
- ✅ 全テーブル + RLS
- ✅ XStateステートマシン定義

## Phase 2実装予定

1. 役職配布Edge Function
2. お題配信Edge Function
3. タイマーコンポーネント
4. 質問・討論フェーズ
5. 投票システム

## 技術負債

- Realtime P95レイテンシ: {測定値}ms
- モバイル最適化: 基本動作確認のみ
- E2Eテストカバレッジ: 1シナリオのみ
```

---

### Week 4 完了基準

#### 必須項目
- [ ] 統合テスト全パス
- [ ] 負荷テスト（P95 <500ms、30並行ユーザー）
- [ ] RLSセキュリティテスト全パス
- [ ] 本番環境デプロイ成功
- [ ] スモークテスト全項目クリア
- [ ] 開発・運用ドキュメント整備

#### 検証方法
```bash
# 統合テスト
npx playwright test tests/integration/

# 負荷テスト
k6 run tests/load/room-join.js

# RLSテスト
npm run test:rls

# 脆弱性スキャン
npm audit
npx snyk test
```

---

## 完了基準の更新

### Phase 1全体の完了基準（v2.0）

#### 技術的完了基準
1. **機能動作**
   - ✅ ルーム作成・参加が動作
   - ✅ ロビーでリアルタイム反映（±2秒以内）
   - ✅ 匿名認証が動作
   - ✅ RLSポリシーが機能（全テスト パス）

2. **性能基準**
   - ✅ Realtimeレイテンシ P95 <500ms（国内）
   - ✅ API応答時間 P95 <200ms
   - ✅ 30名同時接続で動作

3. **品質基準**
   - ✅ E2Eテスト全シナリオパス
   - ✅ RLSテスト全パス
   - ✅ ESLint/Prettier エラーゼロ
   - ✅ 脆弱性スキャン クリティカルゼロ（v2.0追加）

4. **運用基準**
   - ✅ ローカル開発環境が安定動作
   - ✅ Vercelに自動デプロイ可能
   - ✅ Sentry監視有効（v2.0追加）
   - ✅ CI/CDパイプライン動作（v2.0追加）

#### ドキュメント完了基準（v2.0追加）
- ✅ 開発ガイド
- ✅ 運用ガイド
- ✅ XState状態遷移図
- ✅ タイマー同期設計書
- ✅ Realtimeレイテンシ測定レポート
- ✅ Phase 2引継ぎドキュメント

---

## 実装時の注意事項

### 優先順位

| タスク | 優先度 | 理由 |
|--------|--------|------|
| **CI/CD（Week 1 Day 1）** | 🔴 必須 | 早期からコード品質保証 |
| **Realtimeスパイク（Week 1 Day 5）** | 🔴 必須 | Week 3判断では遅い |
| **ルーム参加API最適化（Week 2 Day 3）** | 🔴 必須 | スケーラビリティの根幹 |
| **RPC関数（Week 2 Day 2）** | 🟡 推奨 | データ整合性の保証 |
| **監視・アラート（Week 2 Day 5）** | 🔴 必須 | 本番運用に必要 |
| **Week 4統合テスト** | 🔴 必須 | 本番リリース可能品質の担保 |

### トラブルシューティング

#### Realtime P95 > 500ms の場合

**Week 1 Day 5の判断ポイント**:
- **P95 < 500ms**: Supabase Realtime継続
- **P95 500-800ms**: 目標値緩和 or Pro planアップグレード検討
- **P95 > 800ms**: Socket.io移行を検討

**Socket.io移行時の追加作業**:
- 作業量: 10時間（Week 2-3で実施）
- Week 4にSocket.ioテスト追加

#### HMAC秘密鍵ローテーション

**年次ローテーション戦略**:
1. 新しい秘密鍵を環境変数に追加（`PASSPHRASE_HMAC_SECRET_V2`）
2. RPC関数を更新して両バージョン対応
3. 新規ルームは V2 で作成
4. 旧ルームは遅延マイグレーションで自動更新
5. 3ヶ月後に V1 削除

---

## まとめ

Phase 1 v2.0は、Gemini + O3の検証フィードバックを反映し、**本番リリース可能な品質**を目指した計画です。

### 主要改善の効果

| 改善項目 | v1.0のリスク | v2.0の対策 | 効果 |
|---------|-----------|----------|------|
| **スケジュール** | バッファなし（15人日） | Week 4追加（20人日） | 遅延リスク低減 |
| **ルーム参加API** | O(N)で致命的遅延 | HMAC-SHA256で O(1) | 98-99.8%高速化 |
| **データ整合性** | 手動ロールバック | RPC自動トランザクション | バグリスク低減 |
| **Realtimeリスク** | Week 3判断では遅い | Week 1早期検証 | 手戻り防止 |
| **運用準備** | 監視・CI/CD欠落 | Week 1-2で実装 | 本番運用可能 |

### Phase 2への移行基準

以下を全て満たした場合、Phase 2実装開始を承認:
- [ ] Week 4 Day 5完了基準を全てクリア
- [ ] Realtime P95レイテンシ目標達成
- [ ] 本番環境スモークテスト成功
- [ ] Phase 2引継ぎドキュメント作成完了

---

**承認**: Phase 1実装計画書 v2.0改善差分
**作成者**: Claude (Gemini MCP + O3 MCP検証ベース)
**承認推奨**: 本差分を適用したPhase 1実装の開始
