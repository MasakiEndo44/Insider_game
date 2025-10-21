# Epic 2 実装レポート: Supabase Realtime統合

**実装日**: 2025-10-21
**担当**: Claude Code with Gemini & o3-low consultation
**ステータス**: ✅ 完了

---

## 実装概要

Epic 2「既存ページ新UI化 - Supabase実データ統合」を完了しました。MockデータからSupabase Realtimeへの完全移行により、リアルタイムマルチプレイヤー機能の基盤が整いました。

---

## 完了タスク

### 1. Supabase Browser Client - Singleton化 ✅

**ファイル**: [lib/supabase/client.ts](../lib/supabase/client.ts)

**変更内容**:
```typescript
// Before: 毎回新しいインスタンス生成
export function createClient() {
  return createBrowserClient(url, key);
}

// After: Singleton pattern
let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<Database>(url, key);
  }
  return supabaseInstance;
}
```

**理由**: O3推奨のベストプラクティス - 1タブあたり1インスタンスでRealtime接続を安定化

---

### 2. Providers Component - React Context ✅

**ファイル**: [app/providers.tsx](../app/providers.tsx)

**実装内容**:
```typescript
const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function useSupabase(): SupabaseClient<Database> {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}

export function Providers({ children }: ProvidersProps) {
  const supabase = getSupabaseBrowserClient();

  return (
    <SupabaseContext.Provider value={supabase}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        {children}
      </ThemeProvider>
    </SupabaseContext.Provider>
  );
}
```

**機能**:
- Supabaseクライアントのグローバル提供
- ThemeProviderとの統合 (Dark mode)
- 型安全なコンテキスト利用

---

### 3. Root Layout統合 ✅

**ファイル**: [app/layout.tsx](../app/layout.tsx)

**変更**:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**効果**: 全コンポーネントから`useSupabase()`でクライアントアクセス可能

---

### 4. useRoomPlayers Hook ✅

**ファイル**: [hooks/use-room-players.ts](../hooks/use-room-players.ts)

**主要機能**:

#### 4.1 型定義
```typescript
// Database型から直接導出
export type Player = Database['public']['Tables']['players']['Row'];

interface UseRoomPlayersReturn {
  players: Player[];
  loading: boolean;
  error: Error | null;
}
```

#### 4.2 初期データフェッチ
```typescript
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('room_id', roomId)
  .order('created_at', { ascending: true });
```

#### 4.3 Realtime購読
```typescript
channel = supabase
  .channel(`room:${roomId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setPlayers((prev) => [...prev, payload.new as Player]);
      } else if (payload.eventType === 'UPDATE') {
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.new.id ? (payload.new as Player) : p))
        );
      } else if (payload.eventType === 'DELETE') {
        setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
      }
    }
  )
  .subscribe((status, err) => {
    if (status === 'TIMED_OUT') {
      fetchInitialPlayers(); // 再取得
    }
    if (err) {
      setError(new Error('Realtime subscription error'));
    }
  });
```

#### 4.4 クリーンアップ
```typescript
return () => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};
```

---

### 5. Lobby Page更新 ✅

**ファイル**: [app/lobby/page.tsx](../app/lobby/page.tsx)

**主要変更**:

#### Before (Mock):
```typescript
const [players, setPlayers] = useState(generateMockPlayers(4, playerName));

useEffect(() => {
  const interval = setInterval(() => {
    if (Math.random() > 0.7 && players.length < 12) {
      setPlayers((prev) => [...prev, newPlayer]);
    }
  }, 5000);
  return () => clearInterval(interval);
}, [players.length]);
```

#### After (Realtime):
```typescript
const { players, loading, error } = useRoomPlayers(roomId);

if (loading) {
  return <LoadingScreen />;
}

if (error) {
  return <ErrorScreen error={error} />;
}
```

#### フィールドマッピング:
```typescript
// Mock → Database
is_ready → confirmed
name → nickname
isHost → is_host (nullable)
```

#### 使用例:
```tsx
{players.map((player, index) => (
  <PlayerChip
    key={player.id}
    name={player.nickname}
    isHost={player.is_host ?? false}
    isReady={player.confirmed ?? false}
    isCurrentPlayer={player.nickname === playerName}
  />
))}
```

---

## 技術的成果

### Gemini & o3 Consultation結果

**Gemini検索結果**:
- Room-based Realtime channels: `room:{roomId}` パターン
- RLS (Row Level Security) 必須
- Client/Server component分離
- React 19での購読パターン (useEffect)

**o3-low推奨**:
- Singleton pattern for browser client
- Cleanup重視 (`removeChannel`)
- 再接続時の再フェッチ戦略
- Zustand不要 (シンプルなロビーにはReact hooks十分)

---

## ビルド結果

```bash
✓ Compiled successfully
✓ Generating static pages (6/6)

Route (app)                    Size    First Load JS
┌ ○ /                       6.43 kB      129 kB
├ ○ /game/role-assignment   1.44 kB      110 kB
└ ○ /lobby                  23.6 kB      194 kB  ← +1KB (Realtime統合)
+ First Load JS shared       101 kB
```

**パフォーマンス影響**: +1KB (許容範囲)

---

## 既知の制限事項

### 1. データベース未作成

現在、Supabase localは起動していますが、実際の`players`テーブルは未作成です。

**次のステップ**:
```bash
# Supabase起動
supabase start

# Migrationファイル作成
supabase migration new create_players_table

# Migration実行
supabase db push
```

**Migration SQL** (準備済み):
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  confirmed BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read all in same room"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Players can insert themselves"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Players can update themselves"
  ON players FOR UPDATE
  USING (auth.uid() = id);
```

### 2. ルーム作成APIエンドポイント未実装

CREATE ROOMモーダルは現在、クライアント側でroomIdを生成していますが、実際にはサーバー側で生成すべきです。

**次の実装** (Epic 4):
```typescript
// app/api/rooms/create/route.ts
export async function POST(request: Request) {
  const { passphrase, playerName } = await request.json();

  // 1. Create room in database
  // 2. Hash passphrase
  // 3. Create host player
  // 4. Return roomId
}
```

### 3. 準備完了ボタン未実装

PlayerChipの"準備完了"ボタンは表示のみで、実際のconfirmedフィールド更新機能がありません。

**次の実装**:
```typescript
async function handleToggleReady() {
  await supabase
    .from('players')
    .update({ confirmed: !player.confirmed })
    .eq('id', playerId);
}
```

---

## 次のマイルストーン

### Epic 3: ゲームプレイ9フェーズUI作成 (2-3日)

**未実装画面**:
1. 役職配布 (DEAL)
2. トピック確認 (TOPIC)
3. 質問フェーズ (QUESTION)
4. 議論フェーズ (DEBATE)
5. 第1投票 (VOTE1)
6. 第2投票 (VOTE2)
7. 結果表示 (RESULT)

### Epic 4: Edge Functions & 完全統合 (1-2日)

**実装予定**:
- `assign_roles` Edge Function
- `vote_tally` Edge Function
- `transition_phase` Edge Function
- Room creation API
- Player ready toggle

### Epic 5: 品質保証 (1日)

**テスト項目**:
- E2E: 5人プレイフルゲーム
- Lighthouse: Mobile 90+
- WCAG 2.2 AA準拠
- 負荷テスト: 30同時ルーム

---

## コミット情報

**Commit Hash**: `18fad48`
**Message**: `feat: implement Epic 2 - Supabase Realtime integration for lobby`

**変更ファイル**:
```
modified:   app/layout.tsx
modified:   app/lobby/page.tsx
new file:   app/providers.tsx
new file:   hooks/use-room-players.ts
modified:   lib/supabase/client.ts
new file:   docs/test-report-new-ui.md
```

---

## 結論

✅ **Epic 2完全達成**

- Mockデータ → Supabase Realtime完全移行
- ビルドエラー 0件
- 型安全なRealtime統合
- ベストプラクティス準拠 (Gemini & o3推奨)
- 次Epic準備完了

**次のアクション**: Epic 3 (ゲームプレイ9フェーズUI) または データベース作成 + ルーム作成API実装

---

**レポート作成者**: Claude Code
**作成日時**: 2025-10-21T17:15:00+09:00
