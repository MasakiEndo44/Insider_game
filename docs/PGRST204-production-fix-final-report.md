# PGRST204 Production Error - Final Resolution Report

**Date**: 2025-10-24
**Issue**: Production game start failure
**Status**: ✅ PARTIALLY RESOLVED - Phase column fixed, downstream error identified

---

## 問題の経緯

### 1. 初回報告
ゲーム開始時に以下のエラーが発生：
```
PGRST204: Could not find the 'phase' column of 'game_sessions' in the schema cache
```

### 2. ローカル環境での対応
- ローカル環境では `npx supabase db reset` で一時的に解決
- ドキュメント作成: `docs/PGRST204-permanent-fix-summary.md`
- 根本原因: PostgREST スキーマキャッシュの競合状態

### 3. 本番環境での再発
ユーザー報告: "まだエラーが発生します"
- 本番サイト (https://insider-game-self.vercel.app/) で同じエラーを確認
- Playwright で 3人部屋を作成してエラーを再現

---

## 真の根本原因

### 発見したこと
**本番データベースに `game_sessions.phase` カラムが存在していなかった**

#### 検証結果
```sql
-- 本番環境のカラム一覧 (phase カラムがない)
SELECT column_name FROM information_schema.columns WHERE table_name = 'game_sessions';
-- 結果: id, room_id, difficulty, start_time, deadline_epoch, answerer_id, prev_master_id, created_at
-- ❌ phase カラムが存在しない
```

#### 原因分析
- マイグレーション `20250101000000_initial_schema.sql` には `phase TEXT NOT NULL` が定義されている (line 90)
- しかし、本番データベースには適用されていなかった
- 理由: 初期マイグレーションが本番に完全に適用されていなかった可能性

---

## 実施した恒久的解決策

### 1. Phase カラム追加マイグレーション作成
**ファイル**: `supabase/migrations/20251024060000_add_phase_column_to_game_sessions.sql`

```sql
BEGIN;

-- Add phase column with NOT NULL constraint
-- Default to 'LOBBY' for any existing sessions (should be none in production)
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'LOBBY';

-- Remove default after adding column (we want explicit phase specification going forward)
ALTER TABLE public.game_sessions
  ALTER COLUMN phase DROP DEFAULT;

-- Add comment for documentation
COMMENT ON COLUMN public.game_sessions.phase IS 'ゲームフェーズ (LOBBY/DEAL/TOPIC/QUESTION/DEBATE/VOTE1/VOTE2/RESULT)';

COMMIT;
```

### 2. 本番環境へのマイグレーション適用
```bash
# Realtime migration conflict を回避するため一時的に移動
mv supabase/migrations/20251022130000_enable_realtime_temp.sql /tmp/supabase_migrations_backup/

# Phase カラム追加マイグレーションを適用
echo "Y" | npx supabase db push --linked
# ✅ SUCCESS: Migration applied

# Realtime migration を元に戻す
mv /tmp/supabase_migrations_backup/20251022130000_enable_realtime_temp.sql supabase/migrations/
```

### 3. 適用結果の検証
```sql
-- Phase カラムの存在確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'game_sessions' AND column_name = 'phase';

-- 結果:
-- column_name: phase
-- data_type: text
-- is_nullable: NO
-- column_default: null
-- ✅ カラムが正しく追加された
```

---

## テスト結果

### API ログ確認
マイグレーション適用後、新しいゲーム開始テストを実施：

```
POST | 201 | game_sessions (timestamp: 1761289844395000)
```

**✅ game_sessions への INSERT が成功 (201 Created)**

これは phase カラムの問題が解決されたことを証明しています。

### 残存する問題
ただし、ゲーム開始は依然として 500 エラーで失敗：

```
[ERROR] Failed to load resource: the server responded with a status of 500
[ERROR] [Lobby] Start game error: Error: An error occurred in the Server Components render...
```

**分析**: game_sessions 作成は成功したが、その後の処理（役割割り当てまたはトピック挿入）で失敗している可能性が高い。

---

## 次のステップ

### 1. 残存エラーの調査が必要
game_sessions 作成後の処理を調査：
- [ ] 役割割り当て (`roles` テーブルへの INSERT)
- [ ] トピック選択と挿入 (`topics` テーブルへの INSERT)
- [ ] ルームフェーズ更新 (`rooms` テーブルの PATCH)

### 2. エラーログの詳細取得
以下のコマンドで Edge Functions のログを確認：
```bash
npx supabase functions logs --linked
```

### 3. 考えられる原因
Codex の助言に基づく可能性：
- RLS (Row Level Security) ポリシーの問題
- Foreign key constraint の違反
- `roles` または `topics` テーブルのスキーマ不一致

---

## 完了したタスク

- [x] 本番環境での PGRST204 エラーの根本原因特定
- [x] `game_sessions.phase` カラムの追加
- [x] 本番環境へのマイグレーション適用
- [x] Phase カラムの存在確認
- [x] game_sessions INSERT の成功確認

---

## 技術的な学び

### 1. PGRST204 vs 400 Bad Request
- **PGRST204**: PostgREST スキーマキャッシュの問題（カラムがキャッシュにない）
- **400 Bad Request**: データベースレベルの問題（カラムが存在しない、制約違反など）

### 2. マイグレーションの完全性確認の重要性
- 初期マイグレーションが本番に完全に適用されているか確認が必須
- `information_schema.columns` での手動検証が有効

### 3. Realtime Publication の Conflict
- `ALTER PUBLICATION supabase_realtime ADD TABLE` は既存のテーブルに対してエラーになる
- 本番環境では既に手動で設定済みの可能性があるため、マイグレーションの冪等性が重要

---

## まとめ

**Phase カラム問題**: ✅ 完全に解決
**ゲーム開始エラー**: ⚠️ 部分的に解決（次の段階でエラー）

今回のセッションで、PGRST204 エラーの直接的な原因である `phase` カラムの欠落を修正しました。game_sessions への INSERT は成功していますが、その後の処理でエラーが発生しているため、さらなる調査が必要です。

---

**報告者**: Claude Code
**検証**: Playwright E2E テスト + Production API ログ
**次のアクション**: 残存する 500 エラーの根本原因調査
