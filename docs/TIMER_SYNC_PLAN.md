# タイマー同期改善 実装計画

## 問題の分析

### 現状の実装
現在のタイマーは以下の方法で動作しています：

```typescript
// question/page.tsx, debate/page.tsx
const createdAt = new Date(session.created_at).getTime();
const timeLimit = session.time_limit || 300;
const calculatedDeadline = createdAt + timeLimit * 1000;
```

**問題点**:
1. **クライアント時刻依存**: `Date.now()`を使用してカウントダウンするため、クライアントの時計がずれていると表示がずれる
2. **`deadline_epoch`未使用**: DBスキーマに`deadline_epoch`カラムが存在するが、`NULL`のまま使用されていない
3. **同期ズレ**: 各クライアントが独自に計算するため、ネットワーク遅延やタイムゾーンの違いで微妙なズレが発生する可能性

### 理想的な実装
- サーバー側で`deadline_epoch`（Unix timestamp）を計算・保存
- クライアントは`deadline_epoch`を基準にカウントダウン
- すべてのプレイヤーが同じ絶対時刻を参照

## 提案する変更

### 1. サーバー側: `deadline_epoch`の保存

#### ファイル: `app-v2/lib/api.ts`
**変更内容**: `startGame`関数で`deadline_epoch`を計算して保存

```typescript
startGame: async (roomId: string, category: string = '全般', timeLimit: number = 300) => {
    // 1. Create Game Session with deadline_epoch
    const startTime = Date.now();
    const deadlineEpoch = startTime + (timeLimit * 1000);
    
    const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
            room_id: roomId,
            time_limit: timeLimit,
            category,
            phase: 'DEAL',
            start_time: new Date(startTime).toISOString(),
            deadline_epoch: deadlineEpoch  // ← 追加
        })
        .select()
        .single();
    
    // ... 残りのロジック
}
```

### 2. クライアント側: `deadline_epoch`の使用

#### ファイル: `app-v2/app/game/question/page.tsx`
**変更内容**: `deadline_epoch`を直接使用

```typescript
// Before
const createdAt = new Date(session.created_at).getTime();
const timeLimit = session.time_limit || 300;
const calculatedDeadline = createdAt + timeLimit * 1000;

// After
const deadlineEpoch = session.deadline_epoch;
if (deadlineEpoch) {
    setDeadline(deadlineEpoch);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((deadlineEpoch - now) / 1000));
    setTimer(remaining);
}
```

#### ファイル: `app-v2/app/game/debate/page.tsx`
**変更内容**: 同様に`deadline_epoch`を使用

```typescript
const deadlineEpoch = session.deadline_epoch;
if (deadlineEpoch) {
    setDeadline(deadlineEpoch);
    setInitialTotal(timeLimit);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((deadlineEpoch - now) / 1000));
    setTimer(remaining);
}
```

## 検証計画

### 1. 手動テスト
**手順**:
1. ブラウザを2つ開く（異なるプロファイル推奨）
2. ルームを作成し、両方のプレイヤーで参加
3. ゲームを開始
4. 質問フェーズで両方のブラウザのタイマーを目視確認
   - **期待値**: 両方のタイマーが同じ時刻を表示（±1秒以内）
5. 討論フェーズでも同様に確認

### 2. E2Eテスト
**既存テスト**: `app-v2/e2e/room-flow.spec.ts`
- このテストは既にゲームフロー全体をカバーしている
- タイマー同期の改善後も、テストが引き続きパスすることを確認
- **実行コマンド**: `npx playwright test room-flow.spec.ts --retries=0`

### 3. データベース確認
**手順**:
1. Supabase Dashboard → Database → Tables → `game_sessions`
2. ゲーム開始後、`deadline_epoch`カラムに値が保存されていることを確認
3. **期待値**: `deadline_epoch`が`NULL`ではなく、Unix timestamp（例: `1732589400000`）が保存されている

## 影響範囲

### 変更ファイル
- `app-v2/lib/api.ts` (1箇所)
- `app-v2/app/game/question/page.tsx` (1箇所)
- `app-v2/app/game/debate/page.tsx` (1箇所)

### リスク評価
- **低リスク**: 既存のロジックを置き換えるのみ
- **後方互換性**: `deadline_epoch`が`NULL`の場合は既存ロジックにフォールバック可能（必要に応じて実装）

## 実装順序
1. `lib/api.ts`の修正
2. `question/page.tsx`の修正
3. `debate/page.tsx`の修正
4. 手動テストで動作確認
5. E2Eテスト実行
6. データベース確認
