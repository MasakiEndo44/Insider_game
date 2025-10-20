# 開発ロードマップ詳細版

最終更新: 2025-10-20
バージョン: 1.0

---

## 目次

1. [開発方針](#開発方針)
2. [Phase 1: 基盤構築（3週間）](#phase-1-基盤構築3週間)
3. [Phase 2: ゲームコア機能（4週間）](#phase-2-ゲームコア機能4週間)
4. [Phase 3: 運用強化・UX向上（3週間）](#phase-3-運用強化ux向上3週間)
5. [リリース準備](#リリース準備)
6. [ポストリリース計画](#ポストリリース計画)

---

## 開発方針

### アジャイル原則

- **スプリント期間**: 1週間
- **デイリースタンドアップ**: 不要（個人開発想定）
- **週次レビュー**: 毎週金曜に成果物確認
- **レトロスペクティブ**: 各フェーズ終了時に振り返り

### 開発環境

```bash
# ローカル開発環境
- Next.js Dev Server: http://localhost:3000
- Supabase Local: http://localhost:54321
- Supabase Studio: http://localhost:54323

# ツール
- VSCode + ESLint + Prettier
- Git + GitHub
- Supabase CLI
- Vercel CLI
```

### Git戦略

**ブランチモデル**: GitHub Flow

```
main (production)
  ↑
  └─ feature/room-management
  └─ feature/role-assignment
  └─ feature/timer-sync
  └─ fix/vote-bug
```

**コミットメッセージ規約**:
```
<type>(<scope>): <subject>

Types:
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: フォーマット
- refactor: リファクタリング
- test: テスト追加
- chore: ビルド・設定

例:
feat(rooms): add passphrase validation
fix(votes): resolve tie-breaking logic
docs(readme): update installation steps
```

---

## Phase 1: 基盤構築（3週間）

**目標**: ルーム管理、認証、リアルタイム通信の基盤完成

### Week 1: 環境構築・DB設計

#### タスク（5日間）

**Day 1: プロジェクト初期化**
```bash
# Next.js プロジェクト作成
npx create-next-app@latest insider-game \
  --typescript \
  --tailwind \
  --app \
  --eslint

cd insider-game

# 追加パッケージインストール
npm install @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  xstate \
  zustand \
  @node-rs/argon2 \
  zod

npm install -D \
  @types/node \
  prettier \
  eslint-config-prettier \
  husky \
  lint-staged
```

**成果物**:
- ✅ Next.js 14 プロジェクト初期化
- ✅ package.json 設定完了
- ✅ ESLint + Prettier 設定
- ✅ Git初期化、`.gitignore` 設定

**Day 2: Supabase環境構築**
```bash
# Supabase CLI インストール
brew install supabase/tap/supabase

# Supabase プロジェクト初期化
supabase init

# Local Development 起動
supabase start

# Migrationファイル作成
supabase migration new initial_schema
```

**成果物**:
- ✅ Supabase Local環境起動
- ✅ `supabase/config.toml` 設定
- ✅ `.env.local` に環境変数設定

**Day 3-4: データベースマイグレーション**
- `docs/output/database_design.md` のSQLを実行
- RLSポリシー実装
- テストデータ投入

**タスク**:
```bash
# Migration実行
supabase db reset

# Seed実行
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f supabase/migrations/20250101000001_seed_topics.sql
```

**成果物**:
- ✅ 全テーブル作成完了
- ✅ RLSポリシー有効化
- ✅ お題データ130問投入
- ✅ DB接続テストスクリプト

**Day 5: Tailwind + UI設定**
- `tailwind.config.ts` カスタマイズ
- カラーパレット設定（赤#E50012、黒、白）
- ベースコンポーネント作成（Button, Card, Modal）

**成果物**:
- ✅ `tailwind.config.ts`
- ✅ `src/components/ui/Button.tsx`
- ✅ `src/components/ui/Card.tsx`
- ✅ `src/components/ui/Modal.tsx`

**Week 1 完了基準**:
- [ ] ローカル開発環境が完全に動作
- [ ] Supabase Local DBにアクセス可能
- [ ] 基本UIコンポーネントが動作

---

### Week 2: ルーム管理・認証

#### タスク（5日間）

**Day 1: トップページUI**
```typescript
// src/app/page.tsx
export default function TopPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Card>
        <h1>インサイダーゲーム オンライン</h1>
        <Button onClick={handleCreateRoom}>部屋を作る</Button>
        <Button onClick={handleJoinRoom}>部屋を探す</Button>
      </Card>
    </main>
  );
}
```

**成果物**:
- ✅ トップページUI
- ✅ モーダルコンポーネント（合言葉入力）
- ✅ バリデーションロジック（3-10文字）

**Day 2: ルーム作成API**
```typescript
// src/app/api/rooms/route.ts
export async function POST(req: Request) {
  const { passphrase, nickname } = await req.json();

  // 1. バリデーション
  const validatedPassphrase = validatePassphrase(passphrase);
  const validatedNickname = validateNickname(nickname);

  // 2. ハッシュ化
  const hashedPassphrase = await hashPassphrase(validatedPassphrase);

  // 3. 重複チェック
  const { data: existing } = await supabase
    .from('rooms')
    .select('id')
    .eq('passphrase_hash', hashedPassphrase)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Room with this passphrase already exists' },
      { status: 409 }
    );
  }

  // 4. 匿名認証
  const { data: { user } } = await supabase.auth.signInAnonymously();

  // 5. トランザクション処理
  // (Room作成 → Player作成 → Host設定)

  return NextResponse.json({ room_id, player_id });
}
```

**成果物**:
- ✅ `POST /api/rooms` 実装
- ✅ Argon2ハッシュ化
- ✅ 重複チェックロジック
- ✅ エラーハンドリング

**Day 3: ルーム参加API**
```typescript
// src/app/api/rooms/join/route.ts
export async function POST(req: Request) {
  const { passphrase, nickname } = await req.json();

  // 1. ルーム存在確認
  // 2. ニックネーム重複チェック → "-2" 付加
  // 3. 匿名認証
  // 4. Player追加

  return NextResponse.json({ room_id, player_id, nickname });
}
```

**成果物**:
- ✅ `POST /api/rooms/join` 実装
- ✅ ニックネーム重複処理
- ✅ 存在チェックエラーハンドリング

**Day 4-5: ロビー画面**
```typescript
// src/app/rooms/[id]/lobby/page.tsx
export default function LobbyPage({ params }: { params: { id: string } }) {
  const { players, phase, isHost } = useRoomState(params.id);

  return (
    <div className="p-4">
      <h2>ロビー</h2>
      <PlayerList players={players} />
      {isHost && <Button onClick={handleStart}>ゲーム開始</Button>}
      {isSuspended && <Button onClick={handleResume}>対戦を再開</Button>}
    </div>
  );
}
```

**成果物**:
- ✅ ロビー画面UI
- ✅ プレイヤー一覧コンポーネント
- ✅ ホストバッジ表示
- ✅ 開始ボタン（人数チェック機能付き）

**Week 2 完了基準**:
- [ ] ルーム作成・参加が動作
- [ ] ロビーで参加者一覧が表示される
- [ ] ホストに開始ボタンが表示される

---

### Week 3: Realtime統合・XState設計

#### タスク（5日間）

**Day 1-2: Supabase Realtime購読**
```typescript
// src/lib/supabase/realtime.ts
export function useRoomSubscription(roomId: string) {
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        setPhase(payload.new.phase);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        addPlayer(payload.new);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);
}
```

**成果物**:
- ✅ Realtime購読フック
- ✅ 入退室のリアルタイム反映
- ✅ フェーズ変更のリアルタイム反映

**Day 3-4: XStateステートマシン**
```typescript
// src/lib/state-machine/game-machine.ts
export const gameMachine = createMachine({
  id: 'game',
  initial: 'lobby',
  context: {
    roomId: null,
    sessionId: null,
    playerId: null,
    role: null,
    phase: 'lobby',
  },
  states: {
    lobby: { /* ... */ },
    deal: { /* ... */ },
    topic: { /* ... */ },
    question: { /* ... */ },
    debate: { /* ... */ },
    vote1: { /* ... */ },
    vote2: { /* ... */ },
    runoff: { /* ... */ },
    result: { /* ... */ },
  },
});
```

**成果物**:
- ✅ XState定義ファイル
- ✅ 全フェーズ遷移ロジック
- ✅ コンテキスト管理
- ✅ XState Inspectorでの可視化

**Day 5: 統合テスト**
- ルーム作成 → 参加 → リアルタイム反映の動作確認
- 複数ブラウザでの同時接続テスト

**成果物**:
- ✅ E2Eテストスクリプト（Playwright）
- ✅ テスト結果レポート

**Week 3 完了基準**:
- [ ] Realtime購読が動作
- [ ] 入退室がリアルタイム反映
- [ ] XStateでフェーズ管理が動作

**Phase 1 デモ準備**:
- ルーム作成・参加のデモ動画録画
- ロビーのリアルタイム反映デモ

---

## Phase 2: ゲームコア機能（4週間）

**目標**: 役職配布、お題配信、タイマー、投票の全フェーズ実装

### Week 4: 役職配布・お題配信

#### タスク（5日間）

**Day 1-2: 役職配布Edge Function**
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

  // 1. 前回マスター取得
  // 2. 役職配布ロジック
  // 3. DB保存

  return new Response(JSON.stringify({ success: true }));
});
```

**デプロイ**:
```bash
supabase functions deploy assign-roles
```

**成果物**:
- ✅ `assign-roles` Edge Function
- ✅ 前回マスター除外ロジック
- ✅ ランダム選出アルゴリズム
- ✅ 100回実行統計テスト

**Day 3: 役職配布画面**
```typescript
// src/app/rooms/[id]/deal/page.tsx
export default function DealPage() {
  const { role } = usePlayerRole();

  return (
    <div className="flex items-center justify-center h-screen">
      <RoleCard role={role} />
    </div>
  );
}

// src/components/features/RoleCard.tsx
export function RoleCard({ role }: { role: 'MASTER' | 'INSIDER' | 'CITIZEN' }) {
  const config = {
    MASTER: { icon: '!', text: 'あなたはマスターです！', color: 'bg-red-500' },
    INSIDER: { icon: '👁', text: 'あなたはインサイダーです', color: 'bg-black' },
    CITIZEN: { icon: '?', text: 'あなたは庶民です？', color: 'bg-gray-500' },
  };

  return (
    <Card className={`${config[role].color} text-white`}>
      <div className="text-6xl">{config[role].icon}</div>
      <p className="text-2xl">{config[role].text}</p>
    </Card>
  );
}
```

**成果物**:
- ✅ 役職配布画面UI
- ✅ カードアニメーション（フリップ効果）
- ✅ RLSポリシーE2Eテスト（他人の役職が見えないことを確認）

**Day 4: お題配信Edge Function**
```typescript
// supabase/functions/select-topic/index.ts
serve(async (req) => {
  const { session_id, difficulty } = await req.json();

  // 1. 難易度フィルタ
  // 2. 使用済み除外
  // 3. ランダム選択
  // 4. DB保存

  return new Response(JSON.stringify({ topic: selected.topic_text }));
});
```

**成果物**:
- ✅ `select-topic` Edge Function
- ✅ 重複除外ロジック

**Day 5: お題確認画面**
```typescript
// src/app/rooms/[id]/topic/page.tsx
export default function TopicPage() {
  const { role, topic } = usePlayerTopic();

  if (role === 'MASTER') {
    return <MasterTopicDisplay topic={topic} />;
  }

  if (role === 'INSIDER') {
    return <InsiderTopicPopup topic={topic} duration={10} />;
  }

  return <CitizenWaitingScreen />;
}
```

**成果物**:
- ✅ お題確認画面（役職別表示）
- ✅ インサイダー10秒ポップアップ
- ✅ マスター常時表示（画面上部固定）

**Week 4 完了基準**:
- [ ] 役職配布が正常動作
- [ ] RLSにより他人の役職が見えない
- [ ] お題がマスター・インサイダーのみに表示される

---

### Week 5: タイマー・質問フェーズ

#### タスク（5日間）

**Day 1-2: タイマー実装**
```typescript
// src/components/features/Timer.tsx
export function Timer({ deadlineEpoch }: { deadlineEpoch: number }) {
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
    }, 100);

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

**成果物**:
- ✅ タイマーコンポーネント
- ✅ epoch差分計算ロジック
- ✅ 100ms更新でスムーズなカウントダウン

**Day 3: 質問フェーズ画面**
```typescript
// src/app/rooms/[id]/question/page.tsx
export default function QuestionPage() {
  const { deadlineEpoch, isCorrect } = useQuestionPhase();
  const { role } = usePlayerRole();

  return (
    <div className="p-4">
      <Timer deadlineEpoch={deadlineEpoch} />
      {role === 'MASTER' && !isCorrect && (
        <Button onClick={handleCorrect}>正解報告</Button>
      )}
    </div>
  );
}
```

**成果物**:
- ✅ 質問フェーズ画面
- ✅ マスター用正解報告ボタン

**Day 4: 正解報告API**
```typescript
// src/app/api/sessions/[id]/correct/route.ts
export async function POST(req: Request) {
  const { answerer_id } = await req.json();

  // 1. サーバー時刻チェック
  const now = Math.floor(Date.now() / 1000);
  if (now > deadline_epoch) {
    return NextResponse.json(
      { error: 'Time has expired' },
      { status: 410 }
    );
  }

  // 2. 経過・残り時間計算
  const elapsed = now - start_time;
  const remaining = 300 - elapsed;

  // 3. 討論締切設定
  const debate_deadline = now + remaining;

  // 4. DB更新
  await supabase
    .from('game_sessions')
    .update({
      phase: 'DEBATE',
      deadline_epoch: debate_deadline,
      answerer_id,
    })
    .eq('id', session_id);

  return NextResponse.json({ phase: 'DEBATE', debate_deadline });
}
```

**成果物**:
- ✅ 正解報告API
- ✅ 時間継承ロジック
- ✅ タイムアウト処理（全員敗北）

**Day 5: 統合テスト**
- タイマー同期テスト（複数ブラウザで±1秒以内）
- 正解報告のエッジケーステスト（0秒、1秒前）

**Week 5 完了基準**:
- [ ] タイマーが正確に同期
- [ ] 正解報告で残り時間が継承される
- [ ] タイムアウトで全員敗北になる

---

### Week 6: 討論・投票フェーズ

#### タスク（5日間）

**Day 1: 討論フェーズ画面**
```typescript
// src/app/rooms/[id]/debate/page.tsx
export default function DebatePage() {
  const { deadlineEpoch, answerer } = useDebatePhase();

  return (
    <div className="p-4">
      <Timer deadlineEpoch={deadlineEpoch} />
      <PlayerList highlightedId={answerer.id} />
      <p>正解者: {answerer.nickname}</p>
    </div>
  );
}
```

**成果物**:
- ✅ 討論フェーズ画面
- ✅ 正解者ハイライト

**Day 2-3: 第一投票画面**
```typescript
// src/app/rooms/[id]/vote1/page.tsx
export default function Vote1Page() {
  const [voted, setVoted] = useState(false);

  const handleVote = async (vote: 'yes' | 'no') => {
    await fetch(`/api/sessions/${sessionId}/vote1`, {
      method: 'POST',
      body: JSON.stringify({ player_id, vote }),
    });
    setVoted(true);
  };

  if (voted) {
    return <WaitingForResults />;
  }

  return (
    <div className="p-4">
      <h2>正解者をインサイダーとして告発しますか？</h2>
      <div className="flex gap-4">
        <Button onClick={() => handleVote('yes')} className="h-20 text-2xl">
          はい
        </Button>
        <Button onClick={() => handleVote('no')} className="h-20 text-2xl">
          いいえ
        </Button>
      </div>
    </div>
  );
}
```

**成果物**:
- ✅ 第一投票画面
- ✅ 大きなタップ領域（44px以上）
- ✅ 投票済み状態管理

**Day 4-5: 第二投票画面**
```typescript
// src/app/rooms/[id]/vote2/page.tsx
export default function Vote2Page() {
  const { candidates } = useCandidates();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-4">
      <h2>インサイダーだと思う人を選んでください</h2>
      <div className="space-y-2">
        {candidates.map((candidate) => (
          <label key={candidate.id} className="flex items-center gap-2 p-4 border rounded">
            <input
              type="radio"
              name="candidate"
              value={candidate.id}
              checked={selected === candidate.id}
              onChange={() => setSelected(candidate.id)}
            />
            <span>{candidate.nickname}</span>
          </label>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={!selected}>
        投票する
      </Button>
    </div>
  );
}
```

**成果物**:
- ✅ 第二投票画面
- ✅ 候補リスト生成（マスター・正解者除外）
- ✅ ラジオボタンUI

**Week 6 完了基準**:
- [ ] 討論フェーズが動作
- [ ] 第一投票が動作（過半数判定）
- [ ] 第二投票が動作（候補選択）

---

### Week 7: 投票集計・結果表示

#### タスク（5日間）

**Day 1-3: 投票集計Edge Function**
```typescript
// supabase/functions/tally-votes/index.ts
serve(async (req) => {
  const { session_id, vote_type } = await req.json();

  if (vote_type === 'VOTE1') {
    // 第一投票集計
    const yesCount = votes.filter(v => v.vote_value === 'yes').length;
    if (yesCount > total / 2) {
      // Yes過半数 → 正解者の役職公開
      return revealCorrector();
    } else {
      // No過半数 → 第二投票へ
      return nextPhase('VOTE2');
    }
  }

  if (vote_type === 'VOTE2' || vote_type === 'RUNOFF') {
    // 第二投票/決選投票集計
    const tally = countVotes(votes);
    const topCandidates = getTopCandidates(tally);

    if (topCandidates.length === 1) {
      // 最多票1人 → 役職公開
      return revealCandidate(topCandidates[0]);
    } else {
      // 同票複数 → 決選投票
      const round = getCurrentRound(session_id);
      if (round >= 2) {
        // 3回目同票 → インサイダー勝利
        return insiderWinByEscape();
      } else {
        // 決選投票へ
        return runoffVote(topCandidates, round + 1);
      }
    }
  }
});
```

**成果物**:
- ✅ `tally-votes` Edge Function
- ✅ 過半数判定ロジック
- ✅ 同票処理（決選投票×2）
- ✅ 3回同票インサイダー勝利ロジック

**Day 4: 結果画面**
```typescript
// src/app/rooms/[id]/result/page.tsx
export default function ResultPage() {
  const { outcome, allRoles, revealedPlayer } = useResult();

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold">
        {outcome === 'CITIZENS_WIN' && '庶民勝利！'}
        {outcome === 'INSIDER_WIN' && 'インサイダー勝利！'}
        {outcome === 'ALL_LOSE' && '全員敗北...'}
      </h1>

      <div className="mt-8">
        <h2>全員の役職</h2>
        {allRoles.map((player) => (
          <div key={player.id} className="flex items-center gap-2">
            <span>{player.nickname}</span>
            <RoleBadge role={player.role} />
          </div>
        ))}
      </div>

      {isHost && (
        <div className="mt-8 flex gap-4">
          <Button onClick={handleNextRound}>次のラウンド</Button>
          <Button onClick={handleBackToLobby}>ロビーに戻る</Button>
          <Button onClick={handleDisband} variant="destructive">
            解散
          </Button>
        </div>
      )}
    </div>
  );
}
```

**成果物**:
- ✅ 結果画面UI
- ✅ 勝敗表示
- ✅ 全員の役職公開
- ✅ フェードインアニメーション

**Day 5: 次ラウンド機能**
```typescript
// src/app/api/sessions/[id]/next-round/route.ts
export async function POST(req: Request) {
  // 1. 状態リセット（roles, topics, votes, results削除）
  // 2. 履歴保持（prev_master_id保持）
  // 3. 新セッション作成
  // 4. フェーズを'DEAL'に設定

  return NextResponse.json({ success: true });
}
```

**成果物**:
- ✅ 次ラウンド機能
- ✅ 状態リセットロジック
- ✅ 前回マスター履歴保持

**Week 7 完了基準**:
- [ ] 投票集計が正確に動作
- [ ] 決選投票が最大2回動作
- [ ] 結果画面で勝敗・役職が表示される
- [ ] 次ラウンドで新ゲームが開始できる

**Phase 2 デモ準備**:
- フルゲームプレイのデモ動画（5人で実施）
- 投票・決選投票のテストケース実施

---

## Phase 3: 運用強化・UX向上（3週間）

**目標**: 中断・再開、再接続、エラーハンドリング、モバイル最適化

### Week 8: 中断・再開機能

#### タスク（5日間）

**Day 1-2: 中断処理**
```typescript
// src/app/api/rooms/[id]/suspend/route.ts
export async function POST(req: Request) {
  const { player_id } = await req.json();

  // 1. ホスト確認
  if (!isHost(player_id, roomId)) {
    return NextResponse.json({ error: 'Only host can suspend' }, { status: 403 });
  }

  // 2. 現在状態をスナップショット
  const snapshot = await createSnapshot(roomId);

  // 3. DB更新
  await supabase
    .from('rooms')
    .update({
      phase: 'LOBBY',
      is_suspended: true,
      suspended_state: snapshot,
    })
    .eq('id', roomId);

  return NextResponse.json({ suspended: true });
}
```

**成果物**:
- ✅ 中断API
- ✅ スナップショット生成ロジック
- ✅ JSONB保存

**Day 3-4: 再開処理**
```typescript
// src/app/api/rooms/[id]/resume/route.ts
export async function POST(req: Request) {
  // 1. メンバーチェック
  const suspendedMembers = snapshot.members;
  const currentMembers = await getCurrentMembers(roomId);

  if (!areAllPresent(suspendedMembers, currentMembers)) {
    return NextResponse.json({
      error: 'Not all original members present',
      missing: getMissingMembers(suspendedMembers, currentMembers),
    }, { status: 400 });
  }

  // 2. 状態復元
  const restoredPhase = snapshot.phase;
  const remainingTime = snapshot.remaining_time;
  const newDeadline = Math.floor(Date.now() / 1000) + remainingTime;

  // 3. DB更新
  await supabase
    .from('rooms')
    .update({
      phase: restoredPhase,
      is_suspended: false,
      suspended_state: null,
    })
    .eq('id', roomId);

  await supabase
    .from('game_sessions')
    .update({
      deadline_epoch: newDeadline,
    })
    .eq('room_id', roomId);

  return NextResponse.json({ resumed: true, phase: restoredPhase });
}
```

**成果物**:
- ✅ 再開API
- ✅ メンバーチェックロジック
- ✅ タイマー再計算

**Day 5: 24時間自動削除Cron**
```typescript
// supabase/functions/cleanup-suspended-rooms/index.ts
serve(async (req) => {
  const { data, error } = await supabase
    .from('rooms')
    .delete()
    .eq('is_suspended', true)
    .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return new Response(JSON.stringify({ deleted_count: data?.length || 0 }));
});
```

**Cronスケジュール設定**:
```
# .github/workflows/cleanup-cron.yml
name: Cleanup Suspended Rooms
on:
  schedule:
    - cron: '0 18 * * *' # 毎日午前3時（JST）
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST ${{ secrets.SUPABASE_FUNCTION_URL }}/cleanup-suspended-rooms
```

**成果物**:
- ✅ 自動削除Edge Function
- ✅ GitHub Actions Cron設定

**Week 8 完了基準**:
- [ ] 中断・再開が正常動作
- [ ] タイマーが正しく再計算される
- [ ] 24時間後に自動削除される

---

### Week 9: 再接続・エラーハンドリング

#### タスク（5日間）

**Day 1-2: 再接続ロジック**
```typescript
// src/lib/supabase/reconnection.ts
export function useReconnection(roomId: string) {
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`);

    channel.subscribe((status) => {
      if (status === 'CLOSED') {
        setReconnecting(true);
        // 指数バックオフで再接続試行
        retryWithBackoff(() => channel.subscribe(), {
          maxRetries: 5,
          initialDelay: 1000,
        });
      } else if (status === 'SUBSCRIBED') {
        setReconnecting(false);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  return { reconnecting };
}
```

**成果物**:
- ✅ 再接続フック
- ✅ 指数バックオフアルゴリズム
- ✅ 再接続中UI

**Day 3: マスター/インサイダー離脱処理**
```typescript
// src/lib/game-logic/disconnect-handler.ts
export async function handlePlayerDisconnect(player: Player, session: GameSession) {
  const role = await getRole(session.id, player.id);

  if (role.role === 'MASTER' || role.role === 'INSIDER') {
    // ゲーム中断
    await suspendGame(session.room_id, 'KEY_PLAYER_DISCONNECTED');
  }
}
```

**成果物**:
- ✅ 重要プレイヤー離脱時の中断処理

**Day 4-5: エラーハンドリング**
```typescript
// src/components/ErrorToast.tsx
export function ErrorToast({ error }: { error: Error }) {
  return (
    <Toast variant="error">
      <p>{error.message}</p>
      <Button onClick={() => window.location.reload()}>再読み込み</Button>
    </Toast>
  );
}

// グローバルエラーバウンダリー
// src/app/error.tsx
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    // Vercel Runtime Logsに送信（自動）
  }, [error]);

  return (
    <div className="p-4">
      <h2>エラーが発生しました</h2>
      <p>{error.message}</p>
      <Button onClick={reset}>再試行</Button>
    </div>
  );
}
```

**成果物**:
- ✅ エラートーストコンポーネント
- ✅ グローバルエラーバウンダリー
- ✅ ログ記録

**Week 9 完了基準**:
- [ ] ネットワーク切断から自動復帰
- [ ] マスター/インサイダー離脱で中断される
- [ ] エラー時に適切なメッセージ表示

---

### Week 10: モバイル最適化・テスト

#### タスク（5日間)

**Day 1-2: レスポンシブデザイン**
```css
/* src/app/globals.css */
/* モバイルファースト */
.container {
  @apply px-4;
}

/* タブレット */
@media (min-width: 768px) {
  .container {
    @apply px-8;
  }
}

/* デスクトップ */
@media (min-width: 1024px) {
  .container {
    @apply px-16 max-w-7xl mx-auto;
  }
}
```

**タスク**:
- 全画面を320px（iPhone SE）で確認
- タップ領域を44px以上に調整
- フォントサイズを16px以上に設定
- 片手操作用に重要ボタンを下部配置

**成果物**:
- ✅ レスポンシブCSS
- ✅ モバイル実機テスト（iPhone, Android）

**Day 3: アクセシビリティ監査**
```bash
# Lighthouse実行
npx lighthouse http://localhost:3000 \
  --only-categories=accessibility \
  --output=html \
  --output-path=./lighthouse-report.html
```

**タスク**:
- コントラスト比4.5:1以上に調整
- aria-label追加
- キーボード操作対応

**成果物**:
- ✅ Lighthouse Accessibilityスコア90以上
- ✅ WCAG AA準拠

**Day 4: E2Eテスト**
```typescript
// tests/e2e/full-game.spec.ts
import { test, expect } from '@playwright/test';

test('フルゲームプレイ', async ({ page, context }) => {
  // 1. ルーム作成
  await page.goto('http://localhost:3000');
  await page.click('text=部屋を作る');
  await page.fill('input[name="passphrase"]', 'テスト部屋');
  await page.fill('input[name="nickname"]', 'プレイヤー1');
  await page.click('text=作成');

  // 2. 参加者追加（別ブラウザ）
  const player2 = await context.newPage();
  await player2.goto('http://localhost:3000');
  await player2.click('text=部屋を探す');
  await player2.fill('input[name="passphrase"]', 'テスト部屋');
  await player2.fill('input[name="nickname"]', 'プレイヤー2');
  await player2.click('text=参加');

  // 3. ゲーム開始
  await page.click('text=ゲーム開始');

  // 4. 役職確認
  await expect(page.locator('text=あなたは')).toBeVisible();

  // ... (以下、全フェーズをテスト)
});
```

**成果物**:
- ✅ E2Eテスト5シナリオ
- ✅ テスト自動化CI設定

**Day 5: 負荷テスト**
```bash
# Artillery負荷テスト
artillery quick --count 30 --num 1 http://localhost:3000
```

**成果物**:
- ✅ 30名同時接続テスト結果
- ✅ レスポンスタイム分析レポート

**Week 10 完了基準**:
- [ ] モバイルで快適に操作可能
- [ ] Lighthouse Accessibilityスコア90以上
- [ ] E2Eテスト全パス
- [ ] 30名同時接続で500ms以内のレスポンス

**Phase 3 デモ準備**:
- モバイル実機デモ動画
- アクセシビリティ監査レポート

---

## リリース準備

### Week 11: 本番環境デプロイ

#### タスク

**Day 1: Supabase本番環境構築**
```bash
# Supabase本番プロジェクト作成
# Dashboard: https://app.supabase.com

# Migration実行
supabase link --project-ref <PROJECT_REF>
supabase db push
```

**Day 2: Vercel本番デプロイ**
```bash
# Vercelプロジェクト作成
vercel

# 環境変数設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 本番デプロイ
vercel --prod
```

**Day 3-4: 本番テスト**
- 本番環境で全機能テスト
- 5人でのフルゲームプレイテスト
- モバイル実機テスト

**Day 5: ドキュメント整備**
- README.md更新
- 利用規約作成
- プライバシーポリシー作成

**リリースチェックリスト**:
- [ ] 全機能が本番環境で動作
- [ ] SSL証明書有効
- [ ] エラー監視設定完了
- [ ] ドキュメント整備完了
- [ ] ベータテスター5名で確認完了

---

## ポストリリース計画

### 1ヶ月後の機能拡張（Optional）

- [ ] 質問ログ・順番支援
- [ ] 個人メモ機能
- [ ] スコア制/ランキング
- [ ] ルーム設定（タイマー時間変更など）
- [ ] PWA対応（ホーム画面追加）
- [ ] 効果音実装

### 6ヶ月後の大規模拡張（Optional）

- [ ] スペクテーターモード
- [ ] ゲームリプレイ機能
- [ ] 多言語対応（英語）
- [ ] カスタムお題作成機能
- [ ] ユーザーアカウント・プロフィール

---

## まとめ

**総開発期間**: 10週間（約2.5ヶ月）

**成果物**:
- ✅ システム要件定義書
- ✅ 技術仕様書
- ✅ データベース設計書
- ✅ 開発ロードマップ
- ✅ 動作するMVP（最小実用製品）

**次のステップ**: Phase 1, Week 1, Day 1から開発開始！
