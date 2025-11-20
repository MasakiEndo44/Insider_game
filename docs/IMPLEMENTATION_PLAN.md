# インサイダーゲーム V2 - 実装計画

## プロジェクト方針

**フロントエンド優先アプローチ**: UIプロトタイプに基づいて、まずフロントエンドを完全に実装し、その後バックエンド機能を段階的に統合する。

### メリット
1. **早期視覚化**: UI/UXを早期に確認できる
2. **モックデータで開発**: バックエンド完成を待たずにフロント開発可能
3. **要件の明確化**: 実際のUIを触ることで要件が具体化
4. **並行開発**: フロント完成後、バックエンドを並行開発可能

---

## Phase 1: プロジェクトセットアップ (Week 1)

### 目標
- 開発環境構築
- 基盤コンポーネント整備
- プロトタイプからのコード移植

### タスク

#### 1.1 プロジェクト初期化
```bash
# Next.js 15プロジェクト作成
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

**設定ファイル**:
- `tsconfig.json` - strict mode有効化
- `tailwind.config.ts` - カスタムカラー、フォント設定
- `next.config.mjs` - 画像最適化設定

**成果物**:
- [x] プロジェクト骨格
- [x] TypeScript設定
- [x] Tailwind CSS 4設定

#### 1.2 依存関係インストール

```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-slot": "^1.1.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "lucide-react": "^0.454.0"
  }
}
```

**成果物**:
- [x] package.json更新
- [x] ライブラリインストール

#### 1.3 デザインシステム構築

**ファイル構造**:
```
app/
  globals.css          # グローバルスタイル
lib/
  utils.ts             # cn() ユーティリティ
components/ui/
  button.tsx           # ボタンコンポーネント
  dialog.tsx           # ダイアログ
  input.tsx            # 入力フィールド
  label.tsx            # ラベル
  select.tsx           # セレクト
```

**実装内容**:
- カラーシステム (ゲームレッド、ダークテーマ)
- サーキットボード背景
- カスタムアニメーション (fade-in, pulse-glow, slide-in)
- タイポグラフィ (Noto Sans JP)

**成果物**:
- [x] `globals.css` - デザインシステム
- [x] 基本UIコンポーネント (Button, Dialog, Input, Label, Select)

---

## Phase 2: 静的UI実装 (Week 2-3)

### 目標
- 全画面のUIを静的に実装
- モックデータでの表示確認
- レスポンシブ対応

### タスク

#### 2.1 トップページ (`/`)

**コンポーネント**:
```typescript
app/page.tsx
components/create-room-modal.tsx
components/join-room-modal.tsx
```

**実装内容**:
- Insiderロゴ表示
- PLAYボタン、ルーム参加ボタン
- CreateRoomModal (合言葉、プレイヤー名入力)
- JoinRoomModal (合言葉、プレイヤー名入力)

**モックデータ**:
```typescript
const mockCreateRoom = async (passphrase, nickname) => {
  await delay(500);
  return { room_id: 'DEMO01', player_id: 'player-1', is_host: true };
};
```

**成果物**:
- [x] トップページUI
- [x] CreateRoomModal
- [x] JoinRoomModal

#### 2.2 ロビー画面 (`/lobby`)

**コンポーネント**:
```typescript
app/lobby/page.tsx
components/player-chip.tsx
components/room-info-card.tsx
components/game-settings.tsx
```

**実装内容**:
- プレイヤーリスト (2列グリッド)
- プレイヤーチップ (ホスト、準備完了表示)
- ルーム情報カード (ルームID、合言葉)
- ゲーム設定 (時間、カテゴリ) - ホストのみ
- 下部固定開始ボタン

**モックデータ**:
```typescript
const mockPlayers = [
  { id: '1', name: 'たろう', isHost: true, isReady: true },
  { id: '2', name: 'はなこ', isHost: false, isReady: true },
  { id: '3', name: 'けんた', isHost: false, isReady: false },
];
```

**成果物**:
- [x] ロビーページUI
- [x] PlayerChip
- [x] RoomInfoCard
- [x] GameSettings

#### 2.3 ゲームフェーズ画面 (`/game/*`)

**2.3.1 役職配布 (`/game/role-assignment`)**

**コンポーネント**:
```typescript
app/game/role-assignment/page.tsx
```

**実装内容**:
- 役職カード (アイコン、名前、説明、色)
- 確認ボタン
- 確認済みプレイヤー数表示

**モックデータ**:
```typescript
const ROLES = {
  master: { name: 'マスター', icon: '/images/master-icon.png', color: '#3B82F6' },
  insider: { name: 'インサイダー', icon: '/images/insider-mark.png', color: '#E50012' },
  common: { name: '庶民', icon: '/images/common-icon.png', color: '#10B981' }
};
```

**成果物**:
- [x] 役職配布ページUI

**2.3.2 お題確認 (`/game/topic`)**

**実装内容**:
- お題カード (マスター/インサイダーのみ表示)
- 確認ボタン
- 確認済みプレイヤー数

**成果物**:
- [x] お題確認ページUI

**2.3.3 質問フェーズ (`/game/question`)**

**コンポーネント**:
```typescript
app/game/question/page.tsx
components/timer-ring.tsx
```

**実装内容**:
- 円形タイマー (SVG)
- お題表示 (マスターのみ)
- 進行方法説明
- 正解報告ボタン (マスターのみ、下部固定)

**モックデータ**:
```typescript
const mockTimer = {
  remaining: 300, // 5分
  total: 300,
  onTimeout: () => router.push('/game/result?outcome=timeout')
};
```

**成果物**:
- [x] 質問フェーズページUI
- [x] TimerRing コンポーネント

**2.3.4 討論フェーズ (`/game/debate`)**

**実装内容**:
- 円形タイマー (残り時間継承)
- 討論の進め方説明
- 自動遷移 (時間切れ)

**成果物**:
- [x] 討論フェーズページUI

**2.3.5 第一投票 (`/game/vote1`)**

**実装内容**:
- 正解者名表示
- はい/いいえボタン (大きく)
- 投票済み表示
- 投票済みプレイヤー数

**モックデータ**:
```typescript
const mockVote1 = async (vote) => {
  await delay(500);
  return { all_voted: true, result: { phase: 'VOTE2' } };
};
```

**成果物**:
- [x] 第一投票ページUI

**2.3.6 第二投票 (`/game/vote2`)**

**実装内容**:
- 候補者リスト
- 選択可能なプレイヤーカード
- 投票済み表示
- 決選投票表示 (同票時)

**成果物**:
- [x] 第二投票ページUI

**2.3.7 結果画面 (`/game/result`)**

**実装内容**:
- 勝敗表示 (大きく)
- 全プレイヤーの役職公開
- お題表示
- もう一度遊ぶボタン、ホームへ戻るボタン

**モックデータ**:
```typescript
const mockResult = {
  outcome: 'CITIZENS_WIN',
  revealedPlayer: 'たろう',
  revealedRole: 'INSIDER',
  allRoles: [
    { player: 'たろう', role: 'INSIDER' },
    { player: 'はなこ', role: 'MASTER' },
    { player: 'けんた', role: 'CITIZEN' }
  ]
};
```

**成果物**:
- [x] 結果画面UI

---

## Phase 3: クライアント状態管理 (Week 4)

### 目標
- React状態管理実装
- ローカルフロー動作確認
- モック遷移の実装

### タスク

#### 3.1 Context API セットアップ

**ファイル構造**:
```
context/
  game-context.tsx     # ゲーム状態管理
  room-context.tsx     # ルーム状態管理
```

**実装内容**:
```typescript
// game-context.tsx
type GamePhase = 'LOBBY' | 'DEAL' | 'TOPIC' | 'QUESTION' | 'DEBATE' | 'VOTE1' | 'VOTE2' | 'RESULT';

interface GameState {
  phase: GamePhase;
  roomId: string | null;
  playerId: string | null;
  role: 'MASTER' | 'INSIDER' | 'CITIZEN' | null;
  topic: string | null;
  deadlineEpoch: number | null;
}

export function GameProvider({ children }) {
  const [state, setState] = useState<GameState>({...});
  // ...
}
```

**成果物**:
- [x] GameContext
- [x] RoomContext

#### 3.2 モックAPI実装

**ファイル構造**:
```
lib/
  mock-api.ts          # モックAPIクライアント
```

**実装内容**:
```typescript
// lib/mock-api.ts
export const mockAPI = {
  createRoom: async (passphrase, nickname) => {
    await delay(500);
    return { room_id: generateId(), player_id: generateId(), is_host: true };
  },
  
  joinRoom: async (passphrase, nickname) => {
    await delay(500);
    return { room_id: 'DEMO01', player_id: generateId(), is_host: false };
  },
  
  startGame: async (roomId) => {
    await delay(1000);
    return { session_id: generateId(), phase: 'DEAL' };
  },
  
  // ...
};
```

**成果物**:
- [x] モックAPI実装
- [x] 全フロー動作確認

---

## Phase 4: Supabase統合 - データベース (Week 5)

### 目標
- Supabaseプロジェクト作成
- データベーススキーマ構築
- RLS設定

### タスク

#### 4.1 Supabaseプロジェクト作成

**手順**:
1. Supabaseダッシュボードで新規プロジェクト作成
2. 環境変数設定
3. Supabaseクライアント初期化

**環境変数**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (サーバーのみ)
```

**成果物**:
- [x] Supabaseプロジェクト
- [x] 環境変数設定

#### 4.2 データベーススキーマ作成

**マイグレーションファイル**:
```sql
-- supabase/migrations/20251121_initial_schema.sql

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passphrase_hash TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phase TEXT NOT NULL DEFAULT 'LOBBY',
  is_suspended BOOLEAN DEFAULT false,
  suspended_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  is_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, nickname)
);

-- Game Sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  time_limit INT NOT NULL,
  category TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  deadline_epoch BIGINT,
  answerer_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phase TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('MASTER', 'INSIDER', 'CITIZEN')),
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, player_id)
);

-- Topics
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  topic_text TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Master Topics (マスターデータ)
CREATE TABLE master_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_text TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('VOTE1', 'VOTE2', 'RUNOFF')),
  vote_value TEXT,
  round INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Results
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('CITIZENS_WIN', 'INSIDER_WIN', 'ALL_LOSE')),
  revealed_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**成果物**:
- [x] マイグレーションファイル
- [x] スキーマ適用

#### 4.3 RLS (Row Level Security) 設定

**ポリシー**:
```sql
-- 役職秘匿: 自分の役職のみ見える (結果フェーズは全員見える)
CREATE POLICY "role_secrecy" ON roles
  FOR SELECT
  USING (
    player_id = auth.uid() OR
    (SELECT phase FROM game_sessions WHERE id = session_id) = 'RESULT'
  );

-- お題秘匿: マスター・インサイダーのみ見える (結果フェーズは全員見える)
CREATE POLICY "topic_secrecy" ON topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.session_id = topics.session_id
        AND roles.player_id = auth.uid()
        AND roles.role IN ('MASTER', 'INSIDER')
    ) OR
    (SELECT phase FROM game_sessions WHERE id = session_id) = 'RESULT'
  );
```

**成果物**:
- [x] RLSポリシー適用

#### 4.4 お題マスターデータ投入

**シードデータ**:
```sql
-- supabase/migrations/20251121_seed_topics.sql
INSERT INTO master_topics (topic_text, category) VALUES
  ('りんご', '食べ物'),
  ('犬', '動物'),
  ('東京タワー', '場所'),
  ('スマートフォン', '物'),
  ('サッカー', '全般'),
  -- ... (100件程度)
```

**成果物**:
- [x] シードデータ投入

---

## Phase 5: API実装 (Week 6-7)

### 目標
- Next.js API Routes実装
- Supabase統合
- 認証機能実装

### タスク

#### 5.1 認証機能

**ファイル構造**:
```
app/api/auth/
  route.ts              # 匿名認証
lib/
  supabase/
    client.ts           # クライアント用
    server.ts           # サーバー用
```

**実装内容**:
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 匿名認証
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data;
}
```

**成果物**:
- [x] Supabaseクライアント
- [x] 匿名認証実装

#### 5.2 ルーム管理API

**ファイル構造**:
```
app/api/rooms/
  route.ts              # POST /api/rooms
  join/
    route.ts            # POST /api/rooms/join
  [id]/
    route.ts            # GET /api/rooms/:id
```

**実装内容**:
```typescript
// app/api/rooms/route.ts
import { hash } from '@node-rs/argon2';

export async function POST(request: Request) {
  const { passphrase, nickname } = await request.json();
  
  // バリデーション
  if (!passphrase || passphrase.length > 20) {
    return NextResponse.json({ error: 'Invalid passphrase' }, { status: 400 });
  }
  
  // 合言葉ハッシュ化
  const passphraseHash = await hash(passphrase, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
  
  // 匿名認証
  const { data: authData } = await supabase.auth.signInAnonymously();
  
  // ルーム作成
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ passphrase_hash: passphraseHash })
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  
  // プレイヤー追加
  const { data: player } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      is_host: true,
      is_ready: true
    })
    .select()
    .single();
  
  // host_id更新
  await supabase
    .from('rooms')
    .update({ host_id: player.id })
    .eq('id', room.id);
  
  return NextResponse.json({
    room_id: room.id,
    player_id: player.id,
    is_host: true
  });
}
```

**成果物**:
- [x] POST /api/rooms
- [x] POST /api/rooms/join
- [x] GET /api/rooms/:id

#### 5.3 ゲームセッションAPI

**ファイル構造**:
```
app/api/sessions/
  start/
    route.ts            # POST /api/sessions/start
  [id]/
    correct/
      route.ts          # POST /api/sessions/:id/correct
    vote1/
      route.ts          # POST /api/sessions/:id/vote1
    vote2/
      route.ts          # POST /api/sessions/:id/vote2
```

**実装内容**:
```typescript
// app/api/sessions/start/route.ts
export async function POST(request: Request) {
  const { room_id, time_limit, category } = await request.json();
  
  // ゲームセッション作成
  const { data: session } = await supabase
    .from('game_sessions')
    .insert({
      room_id,
      time_limit,
      category,
      phase: 'DEAL'
    })
    .select()
    .single();
  
  // Edge Function呼び出し (役職割り当て)
  await supabase.functions.invoke('assign-roles', {
    body: { session_id: session.id, room_id }
  });
  
  // お題選択Edge Function
  await supabase.functions.invoke('select-topic', {
    body: { session_id: session.id, category }
  });
  
  // フェーズ更新
  await supabase
    .from('rooms')
    .update({ phase: 'DEAL' })
    .eq('id', room_id);
  
  return NextResponse.json({
    session_id: session.id,
    phase: 'DEAL'
  });
}
```

**成果物**:
- [x] POST /api/sessions/start
- [x] POST /api/sessions/:id/correct
- [x] POST /api/sessions/:id/vote1
- [x] POST /api/sessions/:id/vote2

---

## Phase 6: Supabase Edge Functions (Week 8)

### 目標
- Edge Functions実装
- ゲームロジック実装
- 集計処理実装

### タスク

#### 6.1 役職割り当て

**ファイル構造**:
```
supabase/functions/
  assign-roles/
    index.ts
```

**実装内容**:
```typescript
// supabase/functions/assign-roles/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { session_id, room_id } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // プレイヤー取得
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room_id);
  
  // 前回マスターID取得 (TODO)
  
  // ランダム割り当て
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const master = shuffled[0];
  const insider = shuffled[1];
  const citizens = shuffled.slice(2);
  
  // DB保存
  const roles = [
    { session_id, player_id: master.id, role: 'MASTER' },
    { session_id, player_id: insider.id, role: 'INSIDER' },
    ...citizens.map(c => ({ session_id, player_id: c.id, role: 'CITIZEN' }))
  ];
  
  await supabase.from('roles').insert(roles);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**成果物**:
- [x] assign-roles Edge Function

#### 6.2 お題選択

**ファイル構造**:
```
supabase/functions/
  select-topic/
    index.ts
```

**実装内容**:
```typescript
serve(async (req) => {
  const { session_id, category } = await req.json();
  
  const supabase = createClient(...);
  
  // カテゴリフィルタ
  const { data: allTopics } = await supabase
    .from('master_topics')
    .select('*')
    .eq('category', category);
  
  // ランダム選択
  const selected = allTopics[Math.floor(Math.random() * allTopics.length)];
  
  // DB保存
  await supabase.from('topics').insert({
    session_id,
    topic_text: selected.topic_text,
    category
  });
  
  return new Response(JSON.stringify({ topic: selected.topic_text }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**成果物**:
- [x] select-topic Edge Function

#### 6.3 投票集計

**ファイル構造**:
```
supabase/functions/
  tally-votes/
    index.ts
```

**実装内容**:
```typescript
serve(async (req) => {
  const { session_id, vote_type } = await req.json();
  
  const supabase = createClient(...);
  
  // 投票取得
  const { data: votes } = await supabase
    .from('votes')
    .select('*')
    .eq('session_id', session_id)
    .eq('vote_type', vote_type);
  
  if (vote_type === 'VOTE1') {
    const yesCount = votes.filter(v => v.vote_value === 'yes').length;
    const total = votes.length;
    
    if (yesCount > total / 2) {
      // Yes過半数 → 正解者の役職公開
      // 勝敗判定
      // ...
    } else {
      // No過半数 → 第二投票へ
      await supabase
        .from('game_sessions')
        .update({ phase: 'VOTE2' })
        .eq('id', session_id);
    }
  } else if (vote_type === 'VOTE2') {
    // 集計ロジック
    // 同票判定
    // 決選投票 or 結果
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**成果物**:
- [x] tally-votes Edge Function

---

## Phase 7: Realtime統合 (Week 9)

### 目標
- Supabase Realtime統合
- リアルタイム同期実装
- UI状態自動更新

### タスク

#### 7.1 Realtime購読

**実装内容**:
```typescript
// hooks/use-realtime.ts
export function useRealtime(roomId: string) {
  const [players, setPlayers] = useState([]);
  
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`);
    
    // プレイヤー変更購読
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
  
  return { players };
}
```

**成果物**:
- [x] useRealtime hook
- [x] プレイヤーリスト同期
- [x] フェーズ変更同期

#### 7.2 ブロードキャストイベント

**実装内容**:
```typescript
// ゲーム開始をブロードキャスト
await supabase
  .from('rooms')
  .update({ phase: 'DEAL' })
  .eq('id', roomId);

// Realtimeで自動配信される
```

**成果物**:
- [x] イベントブロードキャスト実装

---

## Phase 8: テスト・デバッグ (Week 10)

### 目標
- E2Eテスト実装
- バグ修正
- パフォーマンス最適化

### タスク

#### 8.1 Playwrightセットアップ

```bash
npm init playwright@latest
```

**テストシナリオ**:
```typescript
// e2e/game-flow.spec.ts
test('ゲーム全体フロー', async ({ page, context }) => {
  // ホストブラウザ
  await page.goto('/');
  await page.click('text=PLAY');
  await page.fill('input[name="passphrase"]', 'test123');
  await page.fill('input[name="nickname"]', 'Host');
  await page.click('text=作成');
  
  // プレイヤーブラウザ
  const page2 = await context.newPage();
  await page2.goto('/');
  await page2.click('text=ルームに参加する');
  await page2.fill('input[name="passphrase"]', 'test123');
  await page2.fill('input[name="nickname"]', 'Player1');
  await page2.click('text=参加');
  
  // ...ゲーム進行
});
```

**成果物**:
- [x] E2Eテスト (5シナリオ)

#### 8.2 負荷テスト

**Artillery設定**:
```yaml
# load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - flow:
      - post:
          url: '/api/rooms'
          json:
            passphrase: 'test{{ $randomString() }}'
            nickname: 'Player{{ $randomNumber(1, 100) }}'
```

**成果物**:
- [x] 負荷テスト (30同時接続)

---

## Phase 9: デプロイ (Week 11)

### 目標
- Vercelデプロイ
- 本番環境動作確認
- ドキュメント整備

### タスク

#### 9.1 Vercelデプロイ

**手順**:
1. GitHubリポジトリ作成
2. Vercelプロジェクト接続
3. 環境変数設定
4. 自動デプロイ設定

**環境変数**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**成果物**:
- [x] 本番環境デプロイ

#### 9.2 ドキュメント整備

**ファイル作成**:
- [x] README.md (日本語・英語)
- [x] CONTRIBUTING.md
- [x] CHANGELOG.md

---

## マイルストーン

| Week | Phase | 成果物 | 完了基準 |
|------|-------|--------|---------|
| 1 | セットアップ | プロジェクト骨格、デザインシステム | `npm run dev` 起動可能 |
| 2-3 | 静的UI | 全画面UI | 全画面表示確認、モックデータ動作 |
| 4 | 状態管理 | Context API、モックAPI | フロー完全動作 (モック) |
| 5 | DB | Supabaseスキーマ、RLS | データ保存・取得可能 |
| 6-7 | API | Next.js API Routes | CRUD操作可能 |
| 8 | Edge Functions | ゲームロジック | 役職割り当て、集計動作 |
| 9 | Realtime | リアルタイム同期 | 複数ブラウザで同期確認 |
| 10 | テスト | E2E、負荷テスト | 全テスト成功 |
| 11 | デプロイ | 本番環境 | URL公開、動作確認 |

---

## リスク管理

| リスク | 影響度 | 対策 |
|-------|-------|------|
| Realtime遅延 | 高 | 事前検証、Socket.io代替案 |
| RLS設計ミス | 高 | E2Eテスト、セキュリティレビュー |
| タイマー同期ズレ | 中 | epoch差分計算、サーバー依存減 |
| Supabase制限超過 | 中 | 使用量監視、Pro plan移行準備 |

---

## 次のステップ

1. **Phase 1開始**: プロジェクトセットアップ
2. **プロトタイプコピー**: `online-board-game/` から必要ファイルをコピー
3. **週次レビュー**: 毎週金曜日に進捗確認
