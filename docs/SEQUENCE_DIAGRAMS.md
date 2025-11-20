# インサイダーゲーム V2 - シーケンス図

## 1. ルーム作成・参加シーケンス

### 1.1 ルーム作成

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Browser as ブラウザ
    participant NextJS as Next.js
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    User->>Browser: PLAYボタンクリック
    Browser->>Browser: CreateRoomModal表示
    User->>Browser: 合言葉・名前入力
    User->>Browser: 作成ボタンクリック
    
    Browser->>NextJS: POST /api/rooms<br/>{passphrase, nickname}
    NextJS->>NextJS: バリデーション
    NextJS->>NextJS: 合言葉ハッシュ化
    NextJS->>Supabase: INSERT rooms
    Supabase-->>NextJS: room_id
    NextJS->>Supabase: INSERT players<br/>(is_host=true)
    Supabase-->>NextJS: player_id
    NextJS->>Supabase: UPDATE rooms<br/>SET host_id
    NextJS-->>Browser: {room_id, player_id}
    
    Browser->>Browser: localStorage保存
    Browser->>Browser: /lobby へ遷移
    Browser->>Realtime: 購読開始<br/>rooms:room_id
    Realtime-->>Browser: 接続確立
```

### 1.2 ルーム参加

```mermaid
sequenceDiagram
    actor UserA as ユーザーA (既参加)
    actor UserB as ユーザーB (新規)
    participant BrowserA as ブラウザA
    participant BrowserB as ブラウザB
    participant NextJS as Next.js
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    UserB->>BrowserB: ルームに参加
    BrowserB->>NextJS: POST /api/rooms/join<br/>{passphrase, nickname}
    NextJS->>NextJS: 合言葉検証
    NextJS->>Supabase: SELECT rooms<br/>WHERE passphrase_hash
    Supabase-->>NextJS: room
    NextJS->>Supabase: INSERT players
    Supabase-->>NextJS: player_id
    
    Supabase->>Realtime: player_joined イベント
    Realtime-->>BrowserA: {player: {...}}
    BrowserA->>BrowserA: プレイヤーリスト更新
    
    NextJS-->>BrowserB: {room_id, player_id}
    BrowserB->>BrowserB: /lobby へ遷移
    BrowserB->>Realtime: 購読開始
    Realtime-->>BrowserB: 現在のプレイヤーリスト
    BrowserB->>BrowserB: プレイヤーリスト表示
```

## 2. ゲーム開始シーケンス

```mermaid
sequenceDiagram
    actor Host as ホスト
    actor Players as 他プレイヤー
    participant BrowserH as ブラウザ(ホスト)
    participant BrowserP as ブラウザ(他)
    participant NextJS as Next.js
    participant EdgeFunc as Edge Function<br/>(assign-roles)
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    Host->>BrowserH: ゲーム開始ボタンクリック
    BrowserH->>NextJS: POST /api/sessions/start<br/>{room_id, difficulty, category}
    
    NextJS->>Supabase: INSERT game_sessions
    Supabase-->>NextJS: session_id
    
    NextJS->>EdgeFunc: invoke assign-roles<br/>{session_id, room_id}
    EdgeFunc->>Supabase: SELECT players<br/>WHERE room_id
    EdgeFunc->>EdgeFunc: 役職ランダム割り当て<br/>(前回マスター除外)
    EdgeFunc->>Supabase: INSERT roles (一括)
    EdgeFunc-->>NextJS: success
    
    NextJS->>Supabase: UPDATE rooms<br/>SET phase='DEAL'
    
    Supabase->>Realtime: game_started イベント
    Realtime-->>BrowserH: {session_id, phase}
    Realtime-->>BrowserP: {session_id, phase}
    
    BrowserH->>BrowserH: /game/role-assignment へ
    BrowserP->>BrowserP: /game/role-assignment へ
    
    BrowserH->>Supabase: SELECT roles<br/>WHERE player_id (RLS)
    Supabase-->>BrowserH: {role: 'MASTER'}
    BrowserP->>Supabase: SELECT roles<br/>WHERE player_id (RLS)
    Supabase-->>BrowserP: {role: 'CITIZEN'}
    
    BrowserH->>BrowserH: 役職カード表示
    BrowserP->>BrowserP: 役職カード表示
```

## 3. 質問・討論フェーズシーケンス

```mermaid
sequenceDiagram
    actor Master as マスター
    actor Players as 他プレイヤー
    participant BrowserM as ブラウザ(マスター)
    participant BrowserP as ブラウザ(他)
    participant NextJS as Next.js
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    Note over BrowserM,BrowserP: 質問フェーズ開始
    
    BrowserM->>Supabase: SELECT game_sessions
    Supabase-->>BrowserM: {deadline_epoch: 1729440300}
    BrowserM->>BrowserM: タイマー計算<br/>remaining = deadline - now()
    BrowserM->>BrowserM: タイマー表示開始
    
    BrowserP->>Supabase: SELECT game_sessions
    Supabase-->>BrowserP: {deadline_epoch: 1729440300}
    BrowserP->>BrowserP: タイマー計算・表示
    
    Note over Master,Players: 音声で質問・回答
    
    Master->>BrowserM: 正解報告ボタンクリック
    BrowserM->>NextJS: POST /api/sessions/:id/correct<br/>{answerer_id}
    
    NextJS->>NextJS: サーバー時刻取得
    NextJS->>NextJS: 残り時間計算<br/>remaining = deadline - now()
    NextJS->>Supabase: UPDATE game_sessions<br/>SET phase='DEBATE',<br/>deadline_epoch=now()+remaining
    
    Supabase->>Realtime: phase_changed イベント
    Realtime-->>BrowserM: {phase: 'DEBATE', deadline_epoch}
    Realtime-->>BrowserP: {phase: 'DEBATE', deadline_epoch}
    
    BrowserM->>BrowserM: /game/debate へ遷移
    BrowserP->>BrowserP: /game/debate へ遷移
    
    BrowserM->>BrowserM: 新しいdeadlineでタイマー再開
    BrowserP->>BrowserP: 新しいdeadlineでタイマー再開
    
    Note over BrowserM,BrowserP: 討論フェーズ
    
    BrowserM->>BrowserM: タイマー監視
    BrowserP->>BrowserP: タイマー監視
    
    BrowserM->>BrowserM: remaining <= 0 検出
    BrowserM->>BrowserM: /game/vote1 へ自動遷移
    BrowserP->>BrowserP: remaining <= 0 検出
    BrowserP->>BrowserP: /game/vote1 へ自動遷移
```

## 4. 投票・集計シーケンス

### 4.1 第一投票

```mermaid
sequenceDiagram
    actor UserA as ユーザーA
    actor UserB as ユーザーB
    participant BrowserA as ブラウザA
    participant BrowserB as ブラウザB
    participant NextJS as Next.js
    participant EdgeFunc as Edge Function<br/>(tally-votes)
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    Note over BrowserA,BrowserB: 第一投票画面表示
    
    BrowserA->>BrowserA: 正解者名表示
    BrowserB->>BrowserB: 正解者名表示
    
    UserA->>BrowserA: 「はい」ボタンクリック
    BrowserA->>NextJS: POST /api/sessions/:id/vote1<br/>{player_id, vote: 'yes'}
    NextJS->>Supabase: INSERT votes
    NextJS-->>BrowserA: {success: true}
    BrowserA->>BrowserA: 投票済み表示
    
    Supabase->>Realtime: vote_cast イベント
    Realtime-->>BrowserB: {voted_count: 1}
    BrowserB->>BrowserB: 進捗更新 (1/6)
    
    UserB->>BrowserB: 「いいえ」ボタンクリック
    BrowserB->>NextJS: POST /api/sessions/:id/vote1<br/>{player_id, vote: 'no'}
    NextJS->>Supabase: INSERT votes
    
    NextJS->>Supabase: SELECT COUNT(*)<br/>FROM votes<br/>WHERE session_id
    Supabase-->>NextJS: count = 6
    NextJS->>Supabase: SELECT COUNT(*)<br/>FROM players<br/>WHERE room_id
    Supabase-->>NextJS: count = 6
    
    Note over NextJS: 全員投票完了検出
    
    NextJS->>EdgeFunc: invoke tally-votes<br/>{session_id, vote_type: 'VOTE1'}
    EdgeFunc->>Supabase: SELECT votes
    EdgeFunc->>EdgeFunc: 集計<br/>yes: 4, no: 2
    EdgeFunc->>EdgeFunc: yes > total/2 → true
    EdgeFunc->>Supabase: UPDATE game_sessions<br/>SET phase='RESULT'
    EdgeFunc->>Supabase: INSERT results<br/>{outcome: 'CITIZENS_WIN'}
    EdgeFunc-->>NextJS: {phase: 'RESULT', outcome}
    
    NextJS->>Realtime: vote_complete イベント
    Realtime-->>BrowserA: {phase: 'RESULT', outcome}
    Realtime-->>BrowserB: {phase: 'RESULT', outcome}
    
    BrowserA->>BrowserA: /game/result へ遷移
    BrowserB->>BrowserB: /game/result へ遷移
```

### 4.2 決選投票

```mermaid
sequenceDiagram
    actor Users as 全プレイヤー
    participant Browser as ブラウザ
    participant NextJS as Next.js
    participant EdgeFunc as Edge Function
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    Note over Browser,Supabase: 第二投票で同票発生
    
    EdgeFunc->>EdgeFunc: 最多票者カウント<br/>candidates = [A, B]
    EdgeFunc->>Supabase: UPDATE game_sessions<br/>SET phase='VOTE2_RUNOFF',<br/>round=1
    EdgeFunc->>Supabase: UPDATE game_sessions<br/>SET runoff_candidates
    
    Supabase->>Realtime: phase_changed イベント
    Realtime-->>Browser: {phase: 'VOTE2_RUNOFF',<br/>candidates: [A, B]}
    
    Browser->>Browser: 決選投票画面表示<br/>(候補A, Bのみ)
    
    Users->>Browser: 投票
    Browser->>NextJS: POST /api/sessions/:id/vote<br/>{vote_type: 'RUNOFF'}
    
    Note over NextJS,EdgeFunc: 全員投票完了
    
    NextJS->>EdgeFunc: invoke tally-votes<br/>{vote_type: 'RUNOFF'}
    EdgeFunc->>EdgeFunc: 集計
    
    alt 最多票1人
        EdgeFunc->>Supabase: UPDATE phase='RESULT'
        EdgeFunc->>Realtime: phase_changed
    else 再び同票 & round < 2
        EdgeFunc->>Supabase: UPDATE round=2
        EdgeFunc->>Realtime: phase_changed<br/>(RUNOFF継続)
    else 再び同票 & round >= 2
        EdgeFunc->>Supabase: UPDATE phase='RESULT'<br/>outcome='INSIDER_WIN'
        EdgeFunc->>Realtime: phase_changed
    end
```

## 5. 中断・再接続シーケンス

### 5.1 中断

```mermaid
sequenceDiagram
    actor Host as ホスト
    participant Browser as ブラウザ(ホスト)
    participant NextJS as Next.js
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    Host->>Browser: 中断ボタンクリック
    Browser->>NextJS: POST /api/rooms/:id/suspend
    
    NextJS->>Supabase: SELECT game_sessions<br/>WHERE room_id
    Supabase-->>NextJS: current state
    
    NextJS->>NextJS: スナップショット作成<br/>{phase, deadline, votes...}
    NextJS->>Supabase: UPDATE rooms<br/>SET is_suspended=true,<br/>suspended_state=snapshot
    
    Supabase->>Realtime: game_suspended イベント
    Realtime-->>Browser: {suspended: true}
    Browser->>Browser: 中断画面表示
```

### 5.2 再接続

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Browser as ブラウザ
    participant NextJS as Next.js
    participant Supabase as Supabase
    participant Realtime as Realtime
    
    Note over Browser: ネットワーク切断
    
    Browser->>Browser: Realtime接続切断検出
    Browser->>Browser: 再接続タイマー開始
    
    Note over Browser: ネットワーク復旧
    
    Browser->>Realtime: 再接続試行<br/>(指数バックオフ)
    Realtime-->>Browser: 接続確立
    
    Browser->>NextJS: GET /api/rooms/:id
    NextJS->>Supabase: SELECT rooms, game_sessions
    Supabase-->>NextJS: current state
    NextJS-->>Browser: {phase, deadline_epoch, ...}
    
    Browser->>Browser: 現在フェーズ判定
    Browser->>Browser: 適切な画面へ遷移
    Browser->>Browser: タイマー再計算・表示
    Browser->>Browser: UI状態復元
```

## 6. Realtime同期シーケンス

```mermaid
sequenceDiagram
    participant BrowserA as ブラウザA
    participant BrowserB as ブラウザB
    participant Realtime as Realtime Channel
    participant Supabase as Supabase DB
    
    Note over BrowserA,BrowserB: ロビー画面
    
    BrowserA->>Realtime: subscribe('rooms:123')
    BrowserB->>Realtime: subscribe('rooms:123')
    
    Note over BrowserA: ホストが設定変更
    
    BrowserA->>Supabase: UPDATE rooms<br/>SET time_limit=10
    Supabase->>Realtime: settings_changed イベント
    Realtime-->>BrowserA: {time_limit: 10}
    Realtime-->>BrowserB: {time_limit: 10}
    
    BrowserA->>BrowserA: 設定UI更新
    BrowserB->>BrowserB: 設定UI更新
    
    Note over BrowserB: プレイヤー参加
    
    BrowserB->>Supabase: Playersテーブル変更検知
    Supabase->>Realtime: player_joined イベント
    Realtime-->>BrowserA: {player: {...}}
    BrowserA->>BrowserA: プレイヤーリスト更新<br/>アニメーション表示
```

## 7. エラーハンドリングシーケンス

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Browser as ブラウザ
    participant NextJS as Next.js
    participant Supabase as Supabase
    
    User->>Browser: アクション実行
    Browser->>NextJS: API リクエスト
    
    alt 成功
        NextJS->>Supabase: DB操作
        Supabase-->>NextJS: success
        NextJS-->>Browser: 200 OK
        Browser->>Browser: UI更新
    else バリデーションエラー
        NextJS-->>Browser: 400 Bad Request<br/>{error: "..."}
        Browser->>Browser: エラーメッセージ表示<br/>(インライン)
    else 認証エラー
        NextJS-->>Browser: 401 Unauthorized
        Browser->>Browser: 再ログイン誘導
    else タイムアウト
        NextJS-->>Browser: 410 Gone
        Browser->>Browser: タイムアウト画面表示
    else サーバーエラー
        NextJS-->>Browser: 500 Internal Error
        Browser->>Browser: エラートースト表示<br/>再試行ボタン
        User->>Browser: 再試行クリック
        Browser->>NextJS: リトライ (指数バックオフ)
    else ネットワークエラー
        Browser->>Browser: ネットワークエラー検出
        Browser->>Browser: 自動リトライ<br/>(最大5回)
        Browser->>NextJS: リトライ
    end
```
