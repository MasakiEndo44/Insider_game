# Vercelデプロイメント実装計画

**作成日**: 2025-10-20
**目的**: インサイダーゲームをVercelに本番デプロイするための包括的実装計画
**現在の進捗**: Phase 1 Week 1 Day 3 完了 (60%)

---

## エグゼクティブサマリー

### 目標
- Vercel本番環境への安全かつ最適化されたデプロイメント実現
- Supabase Realtimeの高速・低遅延接続確保
- セキュリティ、パフォーマンス、アクセシビリティの全基準達成

### タイムライン
```
Week 1 Day 4-5  : Phase 1 即時対応 + データベース + XState (2日)
Week 2 Day 6-10 : Phase 4 Vercelデプロイ設定 + Phase 5 最適化 (5日)
Week 2 Day 11-12: Phase 6 最終デプロイ準備 (2日)
Week 2 Day 12   : 本番デプロイ実行
```

---

## Phase 1: 即時対応（Vercelビルド準備）

**期間**: Day 4開始前（0.5日）
**依存関係**: なし
**優先度**: 🔴 Critical

### 1.1: next.config.mjsにoutput:'standalone'追加

#### 目的
- Serverless関数のコールドスタート時間短縮
- 不要なnode_modulesを削減してバンドルサイズ最適化

#### 実装
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // ← 追加

  // 既存のheaders設定はそのまま
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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' *.supabase.co wss://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### 検証
```bash
npm run build
# .next/standalone ディレクトリが生成されることを確認
ls -la .next/standalone
```

---

### 1.2: 環境変数検証機構実装（lib/env.ts作成）

#### 目的
- 環境変数の欠落を起動時に早期検出
- TypeScript型安全性の向上
- 非null assertion (`!`) の排除

#### 実装
```typescript
// lib/env.ts
const requiredEnvVars = {
  // Client-side (NEXT_PUBLIC_ prefix required)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  // Server-side (no NEXT_PUBLIC_ prefix)
  PASSPHRASE_HMAC_SECRET: process.env.PASSPHRASE_HMAC_SECRET,
} as const;

// Validation
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file or Vercel environment settings.`
    );
  }
}

// Type-safe exports
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  PASSPHRASE_HMAC_SECRET: requiredEnvVars.PASSPHRASE_HMAC_SECRET,
} as const;
```

#### 使用方法
```typescript
// lib/supabase/client.ts (修正後)
import { env } from '@/lib/env';
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
```

---

### 1.3: Console.logの条件付き化（development only）

#### 目的
- 本番環境でのコンソールログ出力抑制
- デバッグ情報の漏洩防止

#### 実装
```typescript
// providers/RoomProvider.tsx (修正)
.on('presence', { event: 'join' }, ({ newPresences }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Player joined:', newPresences);
  }
})
.on('presence', { event: 'leave' }, ({ leftPresences }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Player left:', leftPresences);
  }
})
```

#### または共通ログユーティリティ作成
```typescript
// lib/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};

// 使用例
import { logger } from '@/lib/logger';
logger.debug('Player joined:', newPresences);
```

---

### 1.4: .vercelignoreファイル作成

#### 目的
- 不要なファイルのデプロイ除外
- ビルド時間短縮

#### 実装
```
# .vercelignore
node_modules
.next
.git
.env.local
.env*.local
supabase/.temp
docs
README.md
*.log
.DS_Store
```

---

## Phase 2: データベース実装（Day 4）

**期間**: 1日
**依存関係**: Phase 1完了
**優先度**: 🔴 Critical

### 2.1: Supabaseマイグレーションファイル作成（9テーブル）

#### テーブル構成
参照: [database_design.md](database_design.md)

1. **users** - ユーザー情報
2. **rooms** - ルーム情報 + passphrase_key (HMAC-SHA256)
3. **room_participants** - 参加者
4. **games** - ゲームセッション
5. **game_roles** - 役職割り当て
6. **themes** - テーマ
7. **messages** - チャット
8. **votes** - 投票
9. **game_results** - 結果

#### マイグレーション作成コマンド
```bash
# 新規マイグレーション作成
supabase migration new initial_schema

# supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql を編集
```

#### マイグレーション実行
```bash
# ローカル環境に適用
supabase db push

# 型定義生成
supabase gen types typescript --local > lib/database.types.ts
```

---

### 2.2: Row Level Security (RLS)ポリシー実装

#### 重要な原則
- **デフォルト拒否**: すべてのテーブルでRLS有効化
- **パスフレーズベースアクセス制御**: ルーム参加者のみがデータアクセス可能
- **匿名認証対応**: Anonymous sign-ins使用

#### RLSポリシー例
```sql
-- rooms テーブル
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- ルーム作成者のみが更新可能
CREATE POLICY "Users can update own rooms"
ON rooms FOR UPDATE
USING (auth.uid() = host_user_id);

-- パスフレーズを知っている人のみが閲覧可能（暗号化比較）
CREATE POLICY "Users with passphrase can view rooms"
ON rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = rooms.id
    AND room_participants.user_id = auth.uid()
  )
);

-- room_participants テーブル
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their rooms"
ON room_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR room_id IN (
    SELECT room_id FROM room_participants
    WHERE user_id = auth.uid()
  )
);
```

---

### 2.3: データベース型定義生成（supabase gen types）

#### 実行コマンド
```bash
# ローカル環境の型定義生成
supabase gen types typescript --local > lib/database.types.ts
```

#### package.jsonにスクリプト追加
```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --local > lib/database.types.ts",
    "db:push": "supabase db push && npm run db:types",
    "build": "npm run db:types && next build"
  }
}
```

---

### 2.4: Zodバリデーションスキーマ定義

#### 目的
- ユーザー入力の厳密な検証
- 型安全性の向上
- XSS/SQLインジェクション対策

#### 実装
```typescript
// lib/validations/room.ts
import { z } from 'zod';

export const createRoomSchema = z.object({
  passphrase: z.string()
    .min(4, 'パスフレーズは4文字以上である必要があります')
    .max(20, 'パスフレーズは20文字以内である必要があります')
    .regex(/^[a-zA-Z0-9]+$/, 'パスフレーズは英数字のみ使用できます'),

  maxPlayers: z.number()
    .int('プレイヤー数は整数である必要があります')
    .min(4, '最小4人必要です')
    .max(8, '最大8人まで参加可能です'),
});

export const joinRoomSchema = z.object({
  roomId: z.string().uuid('無効なルームIDです'),
  passphrase: z.string().min(1, 'パスフレーズを入力してください'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
```

#### Server Action実装例
```typescript
// app/actions/room.ts
'use server';

import { createRoomSchema } from '@/lib/validations/room';
import { createClient } from '@/lib/supabase/server';

export async function createRoom(formData: FormData) {
  // バリデーション
  const parsed = createRoomSchema.safeParse({
    passphrase: formData.get('passphrase'),
    maxPlayers: Number(formData.get('maxPlayers')),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0].message,
    };
  }

  // Supabase処理
  const supabase = createClient();
  // ... room作成ロジック
}
```

---

## Phase 3: 状態管理実装（Day 5）

**期間**: 1日
**依存関係**: Phase 2完了
**優先度**: 🔴 Critical

### 3.1: XState状態機械定義（9フェーズ遷移）

#### 目的
- ゲームフローの明確な状態管理
- フェーズ遷移の型安全性確保
- デバッグ可能な状態履歴管理

#### 実装
```typescript
// lib/xstate/gameMachine.ts
import { createMachine, assign } from 'xstate';

type GameContext = {
  roomId: string;
  players: Player[];
  currentPhase: GamePhase;
  theme: string | null;
  votes: Record<string, string>;
  timeRemaining: number;
};

type GameEvents =
  | { type: 'START_GAME' }
  | { type: 'ROLES_ASSIGNED' }
  | { type: 'THEME_SELECTED'; theme: string }
  | { type: 'DISCUSSION_COMPLETE' }
  | { type: 'INSIDER_GUESSED' }
  | { type: 'WORD_GUESSED' }
  | { type: 'VOTES_SUBMITTED' }
  | { type: 'RESULTS_VIEWED' }
  | { type: 'END_GAME' };

export const gameMachine = createMachine<GameContext, GameEvents>({
  id: 'game',
  initial: 'WAITING_FOR_PLAYERS',
  context: {
    roomId: '',
    players: [],
    currentPhase: 'WAITING_FOR_PLAYERS',
    theme: null,
    votes: {},
    timeRemaining: 0,
  },
  states: {
    WAITING_FOR_PLAYERS: {
      on: {
        START_GAME: {
          target: 'ROLE_ASSIGNMENT',
          guard: ({ context }) => context.players.length >= 4,
        },
      },
    },
    ROLE_ASSIGNMENT: {
      entry: assign({ currentPhase: 'ROLE_ASSIGNMENT' }),
      on: {
        ROLES_ASSIGNED: 'THEME_SELECTION',
      },
    },
    THEME_SELECTION: {
      entry: assign({ currentPhase: 'THEME_SELECTION' }),
      on: {
        THEME_SELECTED: {
          target: 'DISCUSSION',
          actions: assign({ theme: ({ event }) => event.theme }),
        },
      },
    },
    DISCUSSION: {
      entry: assign({ currentPhase: 'DISCUSSION', timeRemaining: 300 }),
      on: {
        DISCUSSION_COMPLETE: 'INSIDER_GUESS',
      },
    },
    INSIDER_GUESS: {
      entry: assign({ currentPhase: 'INSIDER_GUESS' }),
      on: {
        INSIDER_GUESSED: 'WORD_GUESS',
      },
    },
    WORD_GUESS: {
      entry: assign({ currentPhase: 'WORD_GUESS' }),
      on: {
        WORD_GUESSED: 'VOTING',
      },
    },
    VOTING: {
      entry: assign({ currentPhase: 'VOTING' }),
      on: {
        VOTES_SUBMITTED: 'RESULT',
      },
    },
    RESULT: {
      entry: assign({ currentPhase: 'RESULT' }),
      on: {
        RESULTS_VIEWED: 'GAME_END',
      },
    },
    GAME_END: {
      entry: assign({ currentPhase: 'GAME_END' }),
      on: {
        END_GAME: 'WAITING_FOR_PLAYERS',
      },
    },
  },
});
```

---

### 3.2: RoomProviderにXState統合

#### 実装
```typescript
// providers/RoomProvider.tsx (修正)
import { useMachine } from '@xstate/react';
import { gameMachine } from '@/lib/xstate/gameMachine';

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const [state, send] = useMachine(gameMachine, {
    context: { roomId },
  });

  // Supabase Realtime統合
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('broadcast', { event: 'game_state_change' }, ({ payload }) => {
        // XStateイベント送信
        send(payload.event);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, send]);

  const value: RoomContextType = {
    roomId,
    gameState: state.value,
    send,
    // ...
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
```

---

### 3.3: Zustandグローバル状態ストア実装

#### 目的
- ルーム外でのグローバル状態管理（ユーザー設定等）
- 軽量なクライアントサイド状態管理

#### 実装
```typescript
// lib/store/useUserStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  displayName: string | null;
  setDisplayName: (name: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      displayName: null,
      setDisplayName: (name) => set({ displayName: name }),
      clearUser: () => set({ displayName: null }),
    }),
    {
      name: 'insider-user-storage',
    }
  )
);
```

---

### 3.4: Ready/Unready機能の完全実装

#### TODOコメント解消
```typescript
// app/room/[roomId]/page.tsx (修正)
const handleReadyToggle = async () => {
  const supabase = createClient();
  const currentPlayer = players.find((p) => p.id === supabase.auth.user()?.id);

  if (!currentPlayer) return;

  // Supabase更新
  await supabase
    .from('room_participants')
    .update({ is_ready: !currentPlayer.isReady })
    .eq('id', currentPlayer.id);

  // Realtime経由で全員に通知
  const channel = supabase.channel(`room:${roomId}`);
  await channel.send({
    type: 'broadcast',
    event: 'ready_status_change',
    payload: {
      userId: currentPlayer.id,
      isReady: !currentPlayer.isReady,
    },
  });
};
```

---

## Phase 4: Vercelデプロイ設定（Week 2）

**期間**: 2日
**依存関係**: Phase 1-3完了
**優先度**: 🟡 Important

### 4.1: Vercel CLIインストールとプロジェクト初期化

#### インストール
```bash
npm install -g vercel
vercel login
```

#### プロジェクト初期化
```bash
vercel link
# ? Set up "~/Documents/Projects/Insider_game"? [Y/n] y
# ? Which scope should contain your project? <your-team>
# ? Link to existing project? [y/N] n
# ? What's your project's name? insider-game-online
# ? In which directory is your code located? ./
```

---

### 4.2: 環境変数のVercel設定（Production/Preview）

#### Vercel Dashboard設定
```bash
# CLI経由での設定
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add PASSPHRASE_HMAC_SECRET production

# Preview環境にも同様に設定
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add PASSPHRASE_HMAC_SECRET preview
```

#### ローカルで確認
```bash
vercel env pull .env.vercel
```

---

### 4.3: Supabase Production環境セットアップ

#### Supabase Dashboardで実施
1. 新規プロジェクト作成: https://app.supabase.com
2. リージョン選択: Northeast Asia (Tokyo) 推奨
3. データベース設定:
   - PostgreSQL 15
   - RLS有効化
4. 環境変数取得:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings → API → anon public
   - `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API → service_role (秘密鍵)

#### マイグレーション適用
```bash
# Production環境にリンク
supabase link --project-ref <project-id>

# マイグレーション適用
supabase db push --db-url postgresql://postgres:[password]@[host]:5432/postgres
```

---

### 4.4: vercel.json設定ファイル作成（リージョン等）

#### 実装
```json
// vercel.json
{
  "regions": ["hnd1"],
  "functions": {
    "app/**/*.{ts,tsx}": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**リージョンコード**:
- `hnd1`: Tokyo, Japan (推奨: Supabase Tokyoと同一リージョン)
- `sin1`: Singapore
- `sfo1`: San Francisco

---

## Phase 5: ビルド最適化とテスト（Week 2）

**期間**: 2日
**依存関係**: Phase 4完了
**優先度**: 🟡 Important

### 5.1: 静的/動的ルート最適化（revalidate設定）

#### ロビーページ（静的化）
```typescript
// app/page.tsx
export const dynamic = 'force-static';
export const revalidate = 3600; // 1時間ごとに再生成

export default function LobbyPage() {
  // ... existing code
}
```

#### ルームページ（動的、ISR使用）
```typescript
// app/room/[roomId]/page.tsx
export const revalidate = 60; // 60秒ごとに再検証

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  // ... existing code
}
```

---

### 5.2: Code Splitting実装（Dynamic Import）

#### ゲームフェーズコンポーネント分離
```typescript
// app/room/[roomId]/play/page.tsx (修正)
import dynamic from 'next/dynamic';

const RoleAssignmentPhase = dynamic(() => import('./phases/RoleAssignment'));
const ThemeSelectionPhase = dynamic(() => import('./phases/ThemeSelection'));
const DiscussionPhase = dynamic(() => import('./phases/Discussion'));
const VotingPhase = dynamic(() => import('./phases/Voting'));
const ResultPhase = dynamic(() => import('./phases/Result'));

export default function GamePage() {
  const { gameState } = useRoom();

  return (
    <>
      {gameState === 'ROLE_ASSIGNMENT' && <RoleAssignmentPhase />}
      {gameState === 'THEME_SELECTION' && <ThemeSelectionPhase />}
      {gameState === 'DISCUSSION' && <DiscussionPhase />}
      {gameState === 'VOTING' && <VotingPhase />}
      {gameState === 'RESULT' && <ResultPhase />}
    </>
  );
}
```

**期待効果**:
- 初期バンドルサイズ: 147 kB → 100 kB程度
- 各フェーズを遅延ロード

---

### 5.3: Realtime WebSocket接続管理改善

#### Connection Pooling検討
```typescript
// providers/RoomProvider.tsx (最適化)
export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // 既存チャンネル再利用
    if (channelRef.current) {
      return;
    }

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: crypto.randomUUID() },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, handlePresenceSync)
      .subscribe();

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [roomId]);

  // ...
}
```

---

### 5.4: Vercel本番ビルドテスト（vercel build）

#### ローカルビルドテスト
```bash
# 環境変数取得
vercel env pull .env.vercel

# 本番ビルドシミュレーション
vercel build --prod

# ビルド成果物確認
ls -la .vercel/output
```

#### ビルド時間目標
- **目標**: <90秒
- **現実的**: 60-120秒

---

## Phase 6: 最終デプロイ準備（Week 2-3）

**期間**: 2日
**依存関係**: Phase 5完了
**優先度**: 🟢 Recommended

### 6.1: Playwrightテスト実装（E2E）

#### セットアップ
```bash
npx playwright install
```

#### テストスイート実装
```typescript
// tests/e2e/lobby.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Main Lobby', () => {
  test('should display lobby with create/join buttons', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await expect(page.getByText('インサイダーゲーム')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ルームを作成' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ルームを探す' })).toBeVisible();
  });

  test('should create room with valid passphrase', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.click('text=ルームを作成');
    await page.fill('input[name="passphrase"]', 'test123');
    await page.selectOption('select[name="maxPlayers"]', '6');
    await page.click('text=作成');

    await expect(page).toHaveURL(/\/room\/[a-z0-9\-]+/);
  });
});
```

---

### 6.2: Lighthouseパフォーマンス監査

#### 実行
```bash
# Lighthouse CI
npm install -g @lhci/cli

# 監査実行
lhci autorun --collect.url=http://localhost:3000
```

#### 目標スコア
- **Performance**: 90+
- **Accessibility**: 95+ (WCAG AAA達成済み)
- **Best Practices**: 90+
- **SEO**: 90+

---

### 6.3: セキュリティヘッダー最終確認

#### 検証ツール
- https://securityheaders.com/
- https://observatory.mozilla.org/

#### チェックリスト
- [x] Content-Security-Policy
- [x] Strict-Transport-Security (HSTS)
- [x] X-Frame-Options
- [x] X-Content-Type-Options
- [x] Referrer-Policy
- [ ] Permissions-Policy (追加推奨)

---

### 6.4: 本番デプロイ実行（vercel --prod）

#### デプロイコマンド
```bash
# 最終確認
npm run build
npm run lint

# 本番デプロイ
vercel --prod
```

#### デプロイ後検証
```bash
# デプロイURL確認
vercel ls

# ログ確認
vercel logs <deployment-url>

# 環境変数確認
vercel env ls
```

---

## 重要なチェックリスト

### デプロイ前必須項目

#### 環境変数
- [ ] NEXT_PUBLIC_SUPABASE_URL (Production)
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY (Production)
- [ ] PASSPHRASE_HMAC_SECRET (Production)
- [ ] SUPABASE_SERVICE_ROLE_KEY (Production) - 追加予定
- [ ] 全環境変数がPreview環境にも設定済み

#### コード品質
- [ ] `npm run build` がエラーなく成功
- [ ] `npm run lint` がエラーなく成功
- [ ] TypeScript型エラーなし
- [ ] Console.log削除/条件付き化済み

#### セキュリティ
- [ ] RLSポリシー全テーブル設定済み
- [ ] 環境変数がGitにコミットされていない
- [ ] CSPヘッダー設定済み
- [ ] HTTPS強制（HSTS）設定済み

#### パフォーマンス
- [ ] Code Splitting実装済み
- [ ] 静的/動的ルート最適化済み
- [ ] First Load JS < 150 kB
- [ ] Lighthouse Performance > 90

#### 機能
- [ ] データベース全9テーブル作成済み
- [ ] XState状態管理実装済み
- [ ] Realtime接続動作確認済み
- [ ] E2Eテスト全パス

---

## リスク管理

### 高リスク項目

1. **Supabase Realtime接続失敗**
   - 原因: WebSocket接続がVercel Functionsでブロック
   - 対策: ローカル・Preview環境で事前テスト
   - 緩和策: Polling fallback実装

2. **環境変数設定ミス**
   - 原因: Production/Preview環境の変数不一致
   - 対策: `vercel env pull`で事前検証
   - 緩和策: lib/env.tsでバリデーション

3. **RLSポリシー不備**
   - 原因: データアクセスが過度に制限/緩和
   - 対策: ローカルで徹底テスト
   - 緩和策: Supabase Logsで監視

### 中リスク項目

4. **ビルド時間超過**
   - 原因: 依存関係肥大化
   - 対策: `output: 'standalone'`で最適化
   - 緩和策: Vercel Pro契約（build time上限緩和）

5. **Cold Start遅延**
   - 原因: Serverless関数のコールドスタート
   - 対策: Edge Runtime検討
   - 緩和策: Keep-Aliveリクエスト

---

## 成功指標（KPI）

### デプロイ成功基準
- ✅ Vercel本番デプロイ成功（200 OK）
- ✅ Supabase Production接続確認
- ✅ Realtime WebSocket接続確立
- ✅ 全ページ正常表示（404/500エラーなし）

### パフォーマンス基準
- ✅ Lighthouse Performance > 90
- ✅ First Contentful Paint < 1.8秒
- ✅ Time to Interactive < 3.8秒
- ✅ Total Blocking Time < 200ms

### セキュリティ基準
- ✅ securityheaders.com: A+評価
- ✅ RLS全テーブル有効化
- ✅ 環境変数漏洩なし

### ユーザー体験基準
- ✅ WCAG 2.1 AAA準拠維持
- ✅ 4-8人同時プレイ動作確認
- ✅ チャット遅延 < 500ms

---

## 次のステップ（Phase 1完了後）

1. **Week 3**: コア機能実装（ルーム作成・参加・役職割り当て）
2. **Week 4**: ゲームロジック完成（投票・結果判定）
3. **Week 5**: テスト・最適化・リリース

---

**作成者**: Claude Code (SuperClaude Framework)
**更新予定**: 各Phase完了時に更新
**関連ドキュメント**:
- [implementation_analysis_report.md](../implementation_analysis_report.md)
- [Status.md](../Status.md)
- [database_design.md](database_design.md)
- [technical_specification.md](technical_specification.md)
