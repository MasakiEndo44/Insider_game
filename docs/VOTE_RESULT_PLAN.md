# 投票と結果画面の改善 実装計画

## 発見された課題

### 1. マスターへの投票を防止
**現象**: 第一投票・第二投票でマスターに投票できてしまう

**原因**: 投票対象のフィルタリングがない

**解決策**:
- 第一投票: マスターが正解者の場合のみ、投票画面を表示しない（マスターは常に白）
- 第二投票: 投票候補からマスターを除外

---

### 2. 結果画面の投票表示改善
**現象**: 投票者の名前が表示されている

**要望**: 投票者は匿名にし、投票された数を白丸（○）で表示

**解決策**:
- VoteBreakdownコンポーネントを改修
- 第一投票: 黒票（はい）と白票（いいえ）の数を表示
- 第二投票: 各プレイヤーが受けた票数を白丸で表示

---

## 実装詳細

### Priority 1: マスターへの投票を防止

#### ファイル: `app-v2/app/game/vote1/page.tsx`

**問題分析**:
- 現在、`answerer`は`players[0]`で固定されている（22-23行目）
- 実際の正解者を取得する必要がある
- 正解者がマスターの場合、第一投票をスキップ

**変更内容**:
```typescript
// Get actual answerer from game_sessions
const [answerer, setAnswerer] = useState<string | null>(null);
const [answererRole, setAnswererRole] = useState<string | null>(null);

useEffect(() => {
    if (!roomId) return;
    
    const fetchAnswerer = async () => {
        const { data: session } = await supabase
            .from('game_sessions')
            .select('answerer_id')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (session?.answerer_id) {
            const player = players.find(p => p.id === session.answerer_id);
            if (player) {
                setAnswerer(player.nickname);
                // Get role from game context
                const role = roles[session.answerer_id];
                setAnswererRole(role);
                
                // If answerer is MASTER, skip vote1
                if (role === 'MASTER') {
                    // Auto-proceed to VOTE2 or DEBATE
                    await api.updatePhase(roomId, 'VOTE2');
                    router.push('/game/vote2');
                }
            }
        }
    };
    
    fetchAnswerer();
}, [roomId, players, roles]);

// Don't render if answerer is MASTER
if (answererRole === 'MASTER') {
    return <div>マスターが正解したため、第一投票をスキップします...</div>;
}
```

#### ファイル: `app-v2/app/game/vote2/page.tsx`

**変更内容**: 投票候補からマスターを除外

```typescript
// Filter out MASTER from voting options
const votingCandidates = players.filter(p => {
    const role = roles[p.id];
    return role !== 'MASTER';
});
```

---

### Priority 2: 結果画面の投票表示改善

#### ファイル: `app-v2/app/game/result/page.tsx`

**変更内容**: VoteBreakdownコンポーネントを改修

```typescript
function VoteBreakdown({ roomId, players, roles }: { roomId: string | null, players: any[], roles: any }) {
    const [votes, setVotes] = useState<any[]>([])

    // ... existing fetch logic ...

    if (votes.length === 0) return null;

    const vote1 = votes.filter(v => v.vote_type === 'VOTE1');
    const vote2 = votes.filter(v => v.vote_type === 'VOTE2');

    // Count votes for vote2
    const vote2Counts: Record<string, number> = {};
    vote2.forEach(v => {
        vote2Counts[v.vote_value] = (vote2Counts[v.vote_value] || 0) + 1;
    });

    return (
        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">投票結果</h2>

            {vote1.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-foreground-secondary mb-2">第一投票 (正解者への告発)</h3>
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-game-red font-bold">黒票:</span>
                            <span className="text-foreground">{vote1.filter(v => v.vote_value === 'yes').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-success font-bold">白票:</span>
                            <span className="text-foreground">{vote1.filter(v => v.vote_value === 'no').length}</span>
                        </div>
                    </div>
                </div>
            )}

            {vote2.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-foreground-secondary mb-2 mt-4">第二投票 (誰がインサイダーか)</h3>
                    <div className="space-y-2">
                        {players
                            .filter(p => roles[p.id] !== 'MASTER') // Exclude MASTER
                            .map(player => {
                                const count = vote2Counts[player.id] || 0;
                                return (
                                    <div key={player.id} className="flex justify-between items-center text-sm">
                                        <span className="text-foreground font-medium">{player.nickname}</span>
                                        <div className="flex gap-1">
                                            {Array.from({ length: count }).map((_, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-foreground bg-transparent" />
                                            ))}
                                            {count === 0 && <span className="text-foreground-secondary text-xs">0票</span>}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}
```

---

## 検証計画

### 手動テスト

#### テスト1: マスターが正解した場合
1. ゲームを開始し、マスターが正解を出す
2. **期待値**: 第一投票がスキップされ、直接第二投票または討論に進む

#### テスト2: 第二投票でマスターが候補に出ない
1. ゲームを開始し、第二投票まで進む
2. **期待値**: 投票候補にマスターが表示されない

#### テスト3: 結果画面の投票表示
1. ゲームを完了し、結果画面を表示
2. **期待値**: 
   - 第一投票: 黒票と白票の数が表示される
   - 第二投票: 各プレイヤーの横に白丸（○）が投票数分表示される
   - 投票者の名前は表示されない

---

## 影響範囲

### 変更ファイル
- `app-v2/app/game/vote1/page.tsx` (正解者取得 + マスタースキップ)
- `app-v2/app/game/vote2/page.tsx` (マスター除外)
- `app-v2/app/game/result/page.tsx` (投票表示改善)

### リスク評価
- **中リスク**: 正解者の取得ロジックが正しく動作するか確認が必要
- **後方互換性**: 問題なし
