# バグ修正と改善 実装計画

## 発見された課題

### 🔴 最重要: タイマー0:00での投票画面遷移失敗
**現象**: 討論フェーズでタイマーが0:00になっても投票画面に遷移しない

**原因分析**:
[debate/page.tsx:117-122](file:///Users/masaki/Documents/Projects/Insider_game/app-v2/app/game/debate/page.tsx#L117-L122)
```typescript
if (remaining <= 0 && isHost) {
    clearInterval(interval);
    api.updatePhase(roomId!, 'VOTE1').catch(error => {
        console.error("Failed to update phase:", error);
        toast.error('フェーズの更新に失敗しました');
    });
}
```

**問題点**:
1. `isHost`の判定が正しくない可能性（`players`配列の更新タイミング）
2. `api.updatePhase`が成功してもページ遷移しない（phaseの更新を監視するuseEffectに依存）
3. game_contextの`phase`状態がRealtimeで更新されていない可能性

**解決策**:
1. `api.updatePhase`成功後、明示的に`router.push('/game/vote1')`を呼び出す
2. エラー時のフォールバック処理を追加
3. デバッグログを追加して問題を特定

---

### 🟡 チャット: 日本語入力の二重送信
**現象**: Mac OSの日本語入力で変換確定Enterが送信になり、メッセージが2回送信される

**原因**: `onKeyDown`イベントで`e.key === 'Enter'`を判定しているが、IME変換中のEnterも検知してしまう

**解決策**: `e.isComposing`をチェックしてIME変換中はスキップ

[question/page.tsx](file:///Users/masaki/Documents/Projects/Insider_game/app-v2/app/game/question/page.tsx)でのチャット入力処理を修正

---

### 🟡 タイマー開始タイミング
**現象**: タイマーが議論スタート時ではなく役職確認時から開始されている

**原因**: `game_sessions.created_at`がゲーム開始時（ROLE_ASSIGNMENT）に設定され、`deadline_epoch`もその時点で計算されている

**解決策の選択肢**:
1. **Option A**: 質問フェーズ開始時に`deadline_epoch`を再計算して保存
2. **Option B**: フェーズごとに個別のタイマーテーブルを作成
3. **Option C**: 現状維持（役職確認含めて5分）

**推奨**: Option C（設計通り）。ただし、ユーザーの要望次第でOption Aも検討

---

### 🟢 討論スキップボタン（マスターのみ）
**現象**: 討論時間が0になる前に結論が出た際、スキップできない

**解決策**: 質問フェーズの「正解が出ました」ボタンと同様、マスターのみに「討論を終了する」ボタンを表示

---

## 実装順序

### Priority 1: 🔴 投票画面遷移の修正

#### ファイル: `app-v2/app/game/debate/page.tsx`

**変更内容**:
```typescript
// Timer countdown based on deadline
useEffect(() => {
    if (!deadline) return;

    const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
        setTimer(remaining);

        if (remaining <= 0 && isHost) {
            clearInterval(interval);
            console.log('[DEBUG] Timer reached 0, transitioning to VOTE1');
            
            api.updatePhase(roomId!, 'VOTE1')
                .then(() => {
                    console.log('[DEBUG] Phase updated successfully, navigating...');
                    router.push('/game/vote1');  // 明示的に遷移
                })
                .catch(error => {
                    console.error("Failed to update phase:", error);
                    toast.error('フェーズの更新に失敗しました。画面を更新してください。');
                    // フォールバック: 強制遷移
                    router.push('/game/vote1');
                });
        }
    }, 1000);

    return () => clearInterval(interval);
}, [deadline, setTimer, isHost, roomId, router]);
```

---

### Priority 2: 🟢 討論スキップボタンの追加

#### ファイル: `app-v2/app/game/debate/page.tsx`

**変更内容**: 質問フェーズと同様のスキップボタンを追加

```typescript
// 新しいハンドラー
const handleSkipDebate = async () => {
    try {
        await api.updatePhase(roomId!, 'VOTE1');
        router.push('/game/vote1');
    } catch (error) {
        console.error("Failed to skip debate:", error);
        toast.error('討論の終了に失敗しました');
    }
};

// JSX (マスターのみ表示)
{isMaster && (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border flex justify-center">
        <div className="max-w-md w-full">
            <Button
                onClick={handleSkipDebate}
                className="w-full h-14 text-lg font-bold bg-transparent hover:bg-success/10 text-foreground border-2 border-foreground rounded-xl transition-all duration-200 hover:border-success hover:text-success"
            >
                討論を終了する
            </Button>
        </div>
    </div>
)}
```

---

### Priority 3: 🟡 日本語入力の二重送信修正

#### ファイル: `app-v2/app/game/question/page.tsx`

**変更内容**:
```typescript
// Before
onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendQuestion()
    }
}}

// After
onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleSendQuestion()
    }
}}
```

---

### Priority 4: 🟡 タイマー開始タイミング（保留）

ユーザーの意向を確認してから対応

---

## 検証計画

### 1. 自動テスト
**E2Eテスト**: `room-flow.spec.ts`
- 実行コマンド: `npx playwright test room-flow.spec.ts --retries=0`
- **期待値**: 討論フェーズから投票フェーズへの遷移が成功する

### 2. 手動テスト

#### テスト1: 投票画面遷移
1. ゲームを開始し、討論フェーズまで進む
2. タイマーが0:00になるまで待つ
3. **期待値**: 自動的に投票画面に遷移

#### テスト2: 討論スキップ
1. ゲームを開始し、討論フェーズまで進む
2. マスターが「討論を終了する」ボタンをクリック
3. **期待値**: 即座に投票画面に遷移

#### テスト3: 日本語入力
1. 質問フェーズで日本語を入力
2. 変換確定のEnterを押す
3. 送信のEnterを押す
4. **期待値**: メッセージが1回だけ送信される

---

## 影響範囲

### 変更ファイル
- `app-v2/app/game/debate/page.tsx` (2箇所: タイマー遷移 + スキップボタン)
- `app-v2/app/game/question/page.tsx` (1箇所: IME対応)

### リスク評価
- **低リスク**: 既存ロジックの小さな修正のみ
- **後方互換性**: 問題なし
