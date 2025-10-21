# インサイダーゲーム - 完全実装ロードマップ

**最終更新**: 2025-10-21
**Phase**: 1 MVP開発 (Week 5)
**進捗**: 80% → 100% 完了目標
**AI Consultants**: Gemini 2.5 Pro, o3-low, Claude Sonnet 4.5

---

## 📋 Executive Summary

本ロードマップは、**Gemini 2.5 Pro** と **o3-low** からの技術的助言を統合し、現在の実装状況 (80%) から MVP完成 (100%) までの完全な実装計画を提供します。

### 三位一体開発原則の適用

- **ユーザー**: 最終的な意思決定と要件定義
- **Claude Code**: 高品質な実装・リファクタリング・タスク管理
- **Gemini**: 深いコード理解・最新情報アクセス・多角的助言
- **o3-low**: 汎用知識・高度な推論・アーキテクチャ検証

---

## 🎯 現在の実装状況 (80% 完了)

### ✅ Week 1-4: 完了済み実装

#### Week 1: プロジェクト基盤 (100%) ✅
- Next.js 14.2.18 + App Router
- TypeScript 5 (Strict Mode)
- Tailwind CSS 3.4.18 + shadcn/ui (6コンポーネント)
- ESLint + Prettier + セキュリティヘッダー

#### Week 2: データベース実装 (100%) ✅
- PostgreSQL 15.8 (Supabase) - 9テーブル
- Row Level Security (RLS) - 19ポリシー
- マイグレーション + トピックシード (130件)
- TypeScript型生成 + Zod バリデーション

#### Week 3: 状態管理 (100%) ✅
- XState 5.x 状態機械 (9フェーズ)
- Zustand グローバル状態管理
- Supabase Realtime統合
- WebSocket接続プーリング

#### Week 4: ゲームロジック & API (100%) ✅
- 役職割り当て (Fisher-Yates, 前回マスター除外)
- お題選択 (難易度別, 重複防止)
- 投票・結果計算 (タイ検出, 勝敗判定)
- 9 API Routes (rooms, games)
- Argon2id パスフレーズハッシング

---

## 🚀 未実装機能 - 実装計画 (Week 5-7)

### 📌 Week 5: UI-API統合 & 基本テスト (優先度: 🔴 高)

**目標**: MVPとして動作する完全なゲームフロー実装

#### 5.1 ルーム作成・参加フロー統合 (2日)

**実装タスク**:
```typescript
// 1. ルーム作成ダイアログ (app/components/lobby/CreateRoomDialog.tsx)
- [x] shadcn Dialog + Input コンポーネント
- [ ] パスフレーズ入力 (3-10文字, 日本語対応)
- [ ] バリデーション (リアルタイム)
- [ ] POST /api/rooms 連携
- [ ] エラーハンドリング (重複、無効な文字など)
- [ ] ローディング状態表示

// 2. ルーム参加ダイアログ (app/components/lobby/JoinRoomDialog.tsx)
- [x] shadcn Dialog + Input コンポーネント
- [ ] 合言葉入力 + ニックネーム入力
- [ ] POST /api/rooms/join 連携
- [ ] 自動ニックネーム補正 (-2 suffix)
- [ ] エラーハンドリング (ルーム不存在、満員など)
```

**o3 助言の適用**:
- パスフレーズハッシュ検証をサーバー側で実施 (クライアント信頼しない)
- Supabase RLS で二重チェック (rooms.passphrase_hash)

**Gemini 助言の適用**:
- Server Actions を使用してフォーム送信を最適化
- Client Component は最小限 (ダイアログのみ)

---

#### 5.2 ゲーム開始フロー統合 (2日)

**実装タスク**:
```typescript
// 1. ロビー画面 (app/room/[roomId]/page.tsx)
- [ ] Realtime プレイヤーリスト表示
- [ ] ホスト専用: 難易度選択 + 開始ボタン
- [ ] 人数チェック (4-8人)
- [ ] POST /api/games/start 連携

// 2. 役職配布画面 (app/room/[roomId]/play/DealPhase.tsx)
- [ ] 役職カード表示 (MASTER/INSIDER/CITIZEN)
- [ ] アニメーション (カードフリップ)
- [ ] 確認ボタン → confirmed フラグ更新
- [ ] 全員確認完了 → 自動遷移

// 3. お題確認画面 (app/room/[roomId]/play/TopicPhase.tsx)
- [ ] Master: お題常時表示 (画面上部固定)
- [ ] Insider: お題ポップアップ (10秒)
- [ ] Citizen: 「お題確認中...」表示
- [ ] Realtime 個別送信 (RLS適用)
```

**o3 助言の適用**:
- RLS secrecy 検証: roles テーブルで `player_id = auth.uid()` のみ閲覧可
- お題表示期間は環境変数で設定可能に (`INSIDER_TOPIC_DURATION_SEC`)

**Gemini 助言の適用**:
- Server Components で初期データ取得
- Client Components は動的UI部分のみ (カードアニメーション、タイマー)

---

#### 5.3 質問・討論フェーズ統合 (2日)

**実装タスク**:
```typescript
// 1. 質問フェーズ (app/room/[roomId]/play/QuestionPhase.tsx)
- [ ] カウントダウンタイマー (deadline_epoch ベース)
- [ ] マスター専用: 正解報告ボタン
- [ ] POST /api/games/correct (新規API)
- [ ] 経過時間 → 討論時間継承ロジック
- [ ] タイムアウト処理 (全員敗北)

// 2. 討論フェーズ (app/room/[roomId]/play/DebatePhase.tsx)
- [ ] 残り時間表示 (継承時間)
- [ ] 正解者ハイライト表示
- [ ] ホスト専用: 討論終了ボタン
- [ ] 自動遷移 → VOTE1
```

**o3 助言の適用**:
- Timer synchronization: `remaining = deadline_epoch - Math.floor(Date.now() / 1000)`
- サーバー側でタイムアウト監視 (Edge Function or Cron)
- クライアントは表示のみ (非権威)

**Gemini 助言の適用**:
- Realtime Broadcast でマイク表示 (非永続化データ)
- タイマーは `useEffect` + `setInterval(100)` で0.1秒更新

---

#### 5.4 投票・結果フロー統合 (3日)

**実装タスク**:
```typescript
// 1. 第一投票 (app/room/[roomId]/play/Vote1Phase.tsx)
- [ ] 質問表示: 「正解者をインサイダーとして告発?」
- [ ] Yes/No ボタン (大きなタップ領域 44px+)
- [ ] POST /api/games/vote 連携
- [ ] 投票済み状態管理 (二重投票防止)
- [ ] 全員投票完了 → 自動集計

// 2. 第二投票 (app/room/[roomId]/play/Vote2Phase.tsx)
- [ ] 候補者リスト表示 (Master/正解者除外)
- [ ] ラジオボタン選択
- [ ] POST /api/games/vote 連携
- [ ] 決選投票UI (runoff, 最大2回)
- [ ] 3回同票 → インサイダー勝利表示

// 3. 結果画面 (app/room/[roomId]/play/ResultPhase.tsx)
- [ ] 勝敗表示 (CITIZENS_WIN/INSIDER_WIN/ALL_LOSE)
- [ ] 全員の役職公開
- [ ] ホスト専用: 次ラウンド/解散ボタン
- [ ] スコア表示 (オプション)
```

**o3 助言の適用**:
- 投票集計は完全にサーバー側 (POST /api/games/result)
- タイ検出アルゴリズム: frequency map → top-k → runoff
- Idempotency: 投票は `UNIQUE(session_id, player_id, vote_type, round)`

**Gemini 助言の適用**:
- 投票結果は RLS で非公開 (phase != 'RESULT')
- Realtime で集計完了通知のみ (投票内容は送信しない)

---

#### 5.5 E2Eテスト実装 (2日)

**実装タスク**:
```typescript
// Playwright E2E Tests
1. tests/e2e/room-creation.spec.ts
   - [ ] ルーム作成 (成功/失敗/重複)
   - [ ] ルーム参加 (成功/ニックネーム重複/-2付加)

2. tests/e2e/game-flow.spec.ts
   - [ ] 完全ゲームフロー (4人, Happy Path)
   - [ ] 役職配布の正当性 (1 Master, 1 Insider, 2 Citizens)
   - [ ] タイマー動作 (5分質問 → 残時間討論)
   - [ ] 投票 → 結果計算

3. tests/e2e/edge-cases.spec.ts
   - [ ] タイムアウト (全員敗北)
   - [ ] 同票 → 決選投票 (1回, 2回, 3回)
   - [ ] 前回マスター除外ロジック
```

**o3 助言の適用**:
- マルチブラウザテスト (Chrome, Firefox, Safari)
- ネットワーク遅延シミュレーション (100ms, 500ms, 1000ms)
- 負荷テスト: k6 script で8人×5ルーム同時実行

---

### 📌 Week 6: 再接続・再開機能 (優先度: 🟡 中-高)

**目標**: o3 Phase 6 実装 - ネットワーク障害に強いゲーム

#### 6.1 再接続ロジック実装 (3日)

**実装タスク**:
```typescript
// 1. Heartbeat監視 (lib/realtime/heartbeat.ts)
- [ ] クライアント → サーバー heartbeat (20秒間隔)
- [ ] サーバー側タイムアウト検出 (60秒)
- [ ] players.is_connected フラグ更新

// 2. 再接続API (app/api/players/reconnect/route.ts)
- [ ] POST /api/players/reconnect
- [ ] セッション検証 (player_id, room_id)
- [ ] 現在フェーズ取得
- [ ] 未投票状態チェック
- [ ] 状態データ返却

// 3. UI状態復元 (app/room/[roomId]/play/ReconnectionHandler.tsx)
- [ ] Realtime再購読
- [ ] フェーズUI復元
- [ ] タイマー再計算 (remaining = deadline_epoch - now())
- [ ] 投票未完了 → 投票UI表示
```

**o3 助言の適用**:
```typescript
// Reconnection pattern
1. GET /api/players/reconnect → { phase, deadline_epoch, vote_status }
2. Realtime re-subscribe: room:{roomId}
3. Phase UI reconstruction based on current state
4. Timer recalculation: client-side only display
```

**Gemini 助言の適用**:
- Presence channel で接続状態同期
- iOS sleep対応: visibility change event でハートビート再開

---

#### 6.2 中断・再開機能実装 (2日)

**実装タスク**:
```typescript
// 1. 中断API (app/api/games/suspend/route.ts)
- [ ] POST /api/games/suspend
- [ ] 現在状態スナップショット保存
  - phase, deadline_epoch, votes, answerer_id, timer_remaining
- [ ] rooms.suspended_state JSONB 保存
- [ ] rooms.is_suspended = true
- [ ] Realtime 全員通知

// 2. 再開API (app/api/games/resume/route.ts)
- [ ] POST /api/games/resume
- [ ] メンバー検証 (中断時 vs 現在)
- [ ] suspended_state 読込
- [ ] タイマー再計算: new_deadline = now() + saved_remaining
- [ ] フェーズ復元
- [ ] Realtime 全員通知

// 3. UI統合
- [ ] ホスト専用: 中断ボタン (全フェーズ)
- [ ] ロビー: 「対戦を再開」ボタン表示
- [ ] メンバー不足エラー表示
```

**o3 助言の適用**:
```typescript
// Suspended state schema
interface SuspendedState {
  phase: GamePhase;
  deadline_epoch: number | null;
  timer_remaining: number | null;  // seconds
  votes: Vote[];
  answerer_id: string | null;
  members: string[];  // player IDs at suspension
  suspended_at: string;  // ISO timestamp
}

// Resume validation
if (currentMembers.sort().toString() !== suspendedMembers.sort().toString()) {
  throw new Error('All original members must rejoin');
}
```

---

### 📌 Week 7: 本番環境強化 (優先度: 🟢 中)

**目標**: o3 Phase 7 実装 - Production-ready

#### 7.1 Rate Limiting & Security (2日)

**実装タスク**:
```typescript
// 1. Rate Limiting (middleware.ts)
- [ ] IP-based rate limiting
  - Room creation: 3/min
  - Room join: 10/min
  - Vote submission: 5/min
- [ ] Vercel Edge Config or Upstash Redis

// 2. Input Sanitization
- [ ] XSS防止 (DOMPurify)
- [ ] SQL Injection対策 (Supabase parameterized queries)
- [ ] CSRF対策 (Next.js built-in)
```

**o3 助言の適用**:
- Advisory locks for phase transitions (PostgreSQL `pg_advisory_lock`)
- Idempotency keys for vote submissions

---

#### 7.2 Instrumentation & Monitoring (2日)

**実装タスク**:
```typescript
// 1. Logging (lib/logger.ts 拡張)
- [ ] Structured logging (JSON)
- [ ] Log levels: DEBUG, INFO, WARN, ERROR
- [ ] Supabase Logflare統合
- [ ] Vercel Analytics統合

// 2. Error Tracking
- [ ] Sentry統合
- [ ] Error boundaries (React)
- [ ] API error logging

// 3. Performance Monitoring
- [ ] Web Vitals (LCP, FID, CLS)
- [ ] Realtime latency tracking
- [ ] Database query performance
```

**o3 助言の適用**:
- Client-side tracing: Sentry transactions
- Server-side: Supabase slow query log (>100ms)

---

#### 7.3 最適化 (2日)

**実装タスク**:
```typescript
// 1. Code Splitting
- [ ] Dynamic imports for XState (減: 162kB → 150kB)
- [ ] Dynamic imports for Zustand
- [ ] Route-based code splitting

// 2. Bundle Optimization
- [ ] Tree shaking (unused exports)
- [ ] Minification (Terser)
- [ ] Image optimization (WebP, lazy load)

// 3. Lighthouse測定
- [ ] Performance: 90+
- [ ] Accessibility: 95+
- [ ] Best Practices: 90+
- [ ] SEO: 90+
```

**Gemini 助言の適用**:
- Server Components で初期ロード削減
- Client Components は必要最小限
- Suspense boundaries でローディング最適化

---

## 🧪 テスト戦略 (全体)

### Unit Tests (lib/**)
```typescript
// 1. Game Logic
- [ ] roles.ts: assignRoles() - 100回実行 → 統計検証
- [ ] topics.ts: selectRandomTopics() - 重複なし検証
- [ ] voting.ts: countVotes() - 全タイパターン
- [ ] passphrase.ts: hashPassphrase() - Argon2id検証

// 2. Validation
- [ ] database.schema.ts: Zod schemas
- [ ] API request/response schemas
```

### Integration Tests (app/api/**)
```typescript
// 1. API Routes
- [ ] POST /api/rooms - success/duplicate/invalid
- [ ] POST /api/rooms/join - success/notfound/full
- [ ] POST /api/games/start - success/invalid-player-count
- [ ] POST /api/games/vote - success/duplicate/invalid-phase
- [ ] POST /api/games/result - all outcome scenarios
```

### E2E Tests (Playwright)
```typescript
// 1. Full Game Flow
- [ ] 4人ゲーム (Happy Path)
- [ ] 8人ゲーム (最大人数)
- [ ] 同票 → 決選投票 (1回, 2回, 3回)

// 2. Edge Cases
- [ ] ネットワーク切断 → 再接続
- [ ] 中断 → 再開
- [ ] タイムアウト (全員敗北)
- [ ] 前回マスター除外検証
```

### Load Tests (k6)
```typescript
// Scenario: 30 concurrent rooms (8 players each)
- [ ] 240 concurrent WebSocket connections
- [ ] Latency: p95 < 500ms
- [ ] Database CPU: < 70%
- [ ] Supabase Realtime: stable
```

---

## 📊 技術的決定事項 - 実装確認

### ✅ 実装済み (o3 Critical Architectural Decisions)

1. **Authoritative state in Postgres** ✅
   - `rooms`, `game_sessions`, `votes` が真実の源
   - クライアントは表示のみ (Realtime購読)

2. **Append-only game_sessions** ✅
   - `SELECT * FROM game_sessions WHERE room_id = ? ORDER BY created_at DESC LIMIT 1`

3. **Timer authority on server** ✅
   - `deadline_epoch BIGINT` (Unix timestamp)
   - クライアント: `remaining = deadline - now()`

4. **Edge Functions (Next.js API Routes)** ✅
   - TypeScript実装
   - Node.js runtime (Argon2対応)

### ⚠️ 実装確認が必要 (Potential Pitfalls from o3)

1. **RLS misconfiguration** ⚠️
   - [ ] roles テーブル: `player_id = auth.uid()` OR `phase = 'RESULT'`
   - [ ] topics テーブル: `role IN ('MASTER', 'INSIDER')`
   - [ ] votes テーブル: `phase != 'RESULT'` で非公開

2. **Idempotency & Concurrency** ⚠️
   - [ ] Advisory locks for phase transitions
   - [ ] UNIQUE constraints on votes

3. **Realtime 500KB payload limit** ⚠️
   - [ ] Channel メッセージサイズ監視
   - [ ] 大きなデータは DB経由

4. **Clock drift** ⚠️
   - [ ] `serverTime` 定期送信 (30秒間隔)
   - [ ] クライアント側で skew correction

---

## 🚀 デプロイ準備チェックリスト

### Supabase Production
- [ ] プロジェクト作成 (Tokyo region推奨)
- [ ] マイグレーション実行
  - `supabase db push --linked`
- [ ] RLSポリシー検証
  - [ ] roles: 秘匿性テスト
  - [ ] topics: Master/Insider のみ閲覧
  - [ ] votes: 結果フェーズまで非公開
- [ ] 環境変数設定
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (サーバー側のみ)

### Vercel Production
- [ ] プロジェクト作成
- [ ] 環境変数設定 (Supabase連携)
- [ ] ビルド検証 (`vercel build`)
- [ ] デプロイ (`vercel deploy --prod`)
- [ ] カスタムドメイン設定 (オプション)

### Post-Deploy
- [ ] Smoke Test (本番環境で1ゲーム完走)
- [ ] Lighthouse測定 (Performance 90+)
- [ ] Sentry動作確認
- [ ] Rate Limiting動作確認

---

## 📈 進捗トラッキング

```
Phase 1 (MVP開発 5週間)
Week 1: ████████████████████ 100% ✅ 基盤構築
Week 2: ████████████████████ 100% ✅ データベース実装
Week 3: ████████████████████ 100% ✅ 状態管理
Week 4: ████████████████████ 100% ✅ ゲームロジック & API
Week 5: ░░░░░░░░░░░░░░░░░░░░   0% → 100% ⏳ UI統合 & テスト

Phase 2 (強化 2週間)
Week 6: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ 再接続・再開
Week 7: ░░░░░░░░░░░░░░░░░░░░   0% ⏳ 本番強化

全体: ████████████████░░░░ 80% → 100%
```

---

## 🔗 参考ドキュメント

### プロジェクト仕様
- [インサイダー_オンライン対戦アプリ概要](./インサイダー_オンライン対戦アプリ概要（実装図ベース）.md)
- [実装図一覧](./20251019_インサイダー実装図一覧.md)
- [現在の実装状況](./CURRENT_STATUS.md)

### AI助言
- **Gemini 2.5 Pro**: Next.js 14 App Router + Supabase Realtime ベストプラクティス
- **o3-low**: Phase 0-7 実装ロードマップ, 技術的決定事項, Potential Pitfalls

### 技術スタック
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [XState 5.x](https://statelyai.com/docs/xstate)
- [Playwright Testing](https://playwright.dev/docs/intro)

---

**次回更新予定**: Week 5 完了時 (2025-10-22)
**管理者**: Claude Code (SuperClaude Framework)
**AI Consultants**: Gemini 2.5 Pro, o3-low, Claude Sonnet 4.5
