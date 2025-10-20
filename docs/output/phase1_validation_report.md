# Phase 1 実装計画 検証報告書

**プロジェクト**: インサイダーゲーム オンライン版
**検証対象**: Phase 1 実装計画書 v1.0
**検証日**: 2025-10-20
**検証方法**: Gemini MCP + O3 MCP による技術レビュー

---

## エグゼクティブサマリー

Phase 1実装計画は**技術的に健全**であり、適切なアーキテクチャ方針と詳細なタスク分解がなされています。ただし、**スケジュールが非常にタイト**（15人日）であり、**Realtime性能リスク**と**本番環境に必要なタスクの不足**が指摘されました。

### 総合評価

| 観点 | Gemini評価 | O3評価 | 最終評価 |
|------|-----------|--------|---------|
| **技術的妥当性** | ◎ 非常に適切 | ○ 健全（プロトタイプとして） | ○ 適切 |
| **実装可能性** | ○ 可能（バッファ不足） | △ タイト（5-6週推奨） | △ リスク有 |
| **セキュリティ** | ○ 適切（一部改善余地） | ○ RLS + 匿名認証は妥当 | ○ 適切 |
| **パフォーマンス** | ○ 適切（一部改善余地） | △ Hobby planでP95<500msは楽観的 | △ 要検証 |

### 主要リスク

1. **🔴 高リスク**: スケジュールバッファ不足（15人日では遅延リスク高）
2. **🟡 中リスク**: Supabase Realtime のレイテンシ（特にクロスリージョン）
3. **🟡 中リスク**: 本番環境に必要なタスクの欠落（監視、CI/CD、セキュリティヘッダー等）

---

## 1. Gemini評価サマリー

### 評価観点別スコア

| 観点 | 評価 | コメント |
|------|------|---------|
| タスク分解の適切性 | ◎ 非常に適切 | 日別のタスク、具体的なコマンド、コード例まで記述 |
| 依存関係の整合性 | ◎ 非常に適切 | 環境構築→DB→RLS→APIの順序は理にかなっている |
| 技術スタックの一貫性 | ◎ 矛盾なし | Next.js + Supabase + XState の組み合わせは強力 |
| セキュリティ考慮 | ○ 適切 | RLS多層防御は万全、一部APIに改善余地 |
| パフォーマンス考慮 | ○ 適切 | Realtime最適化方針は適切、ルーム参加APIに懸念 |
| リスク管理 | ◎ 非常に適切 | 主要技術リスクが特定され、代替策まで定義 |
| コード例の品質 | ◎ 高品質 | そのまま実装のベースとして利用可能 |

### Gemini が挙げた主要改善提案

#### 1. ルーム参加APIのパフォーマンス改善

**課題**:
```typescript
// 現在の実装: 全ルームを取得してループで照合
const { data: rooms } = await supabase.from('rooms').select('id, passphrase_hash');
for (const room of rooms) {
  const isMatch = await verifyPassphrase(passphrase, room.passphrase_hash);
  // ...
}
```
- ルーム数が数百〜数千件にスケールした場合、API応答時間が致命的に長くなる
- タイミング攻撃の脆弱性にも繋がる

**改善案**:
1. `rooms` テーブルに `passphrase_key` カラム（TEXT、インデックス付き）を追加
2. ルーム作成時に `HMAC-SHA256(passphrase, SECRET_KEY)` を計算して保存
3. ルーム参加時は同じ計算で候補を1件に絞り込み
4. その後、Argon2 で最終検証

**効果**: 高コストなArgon2検証を1回に限定、スケール可能な設計に

#### 2. DB操作のトランザクション化

**課題**: 手動ロールバック処理が不完全
```typescript
if (playerError) {
  await supabase.from('rooms').delete().eq('id', room.id); // 手動ロールバック
}
```

**改善案**: Supabase RPC / Edge Function でトランザクション化
```sql
CREATE OR REPLACE FUNCTION create_room_with_host(
  p_passphrase_hash TEXT,
  p_nickname TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- 単一トランザクション内でRoom作成・Player作成・Host更新
  INSERT INTO rooms (passphrase_hash) VALUES (p_passphrase_hash) RETURNING id INTO v_room_id;
  INSERT INTO players (id, room_id, nickname, is_host) VALUES (p_user_id, v_room_id, p_nickname, true);
  UPDATE rooms SET host_id = p_user_id WHERE id = v_room_id;

  RETURN json_build_object('room_id', v_room_id);
EXCEPTION WHEN OTHERS THEN
  RAISE; -- 自動ロールバック
END;
$$ LANGUAGE plpgsql;
```

#### 3. スケジュールのリスク緩和

**改善案A（推奨）**: 各週の金曜日を「調整日」として確保
**改善案B**: Phase 1の期間を4週間（20人日）に延長
**改善案C**: スコープを限定（例: モバイル互換性テストを簡易確認に留める）

---

## 2. O3-low 評価サマリー

### 週別の技術的妥当性評価

#### Week 1 - Environment & DB
- **Day 1**: Next.js 14初期化 → ✅ 1日で十分
- **Day 2**: Supabase環境構築 → ✅ 1日で十分（connection pooling注意）
- **Day 3-4**: 9テーブル + RLS → ⚠️ タイト（マイグレーション、外部キー、インデックス設計で手戻り可能性）
- **Day 4**: RLS自動テスト → ⚠️ Day 3-4と重複（統合すべき）
- **Day 5**: XState + Tailwind → ✅ 実現可能

#### Week 2 - Room flow & Auth
- **匿名認証 + Argon2ハッシュ化**: 実装は0.5日、エッジケース（トークンリフレッシュ、失効）で長引く可能性
- **Argon2パラメータ**: Vercel edge/region λ で 45-110ms/hash（許容範囲）
- **レート制限**: Vercel middleware + KV/Supabase RLSで1日は妥当
- **リスク**: 2日間（Lobby + Realtime）でUI QA時間が不足

#### Week 3 - Realtime & State machine
- **Realtime P95 < 500ms**: 単一リージョンなら達成可能、グローバル展開では600-900msのリスク
- **XState 9フェーズ**: 最大の不確定要素、2日では足りない可能性
- **E2E + モバイル + 統合テスト**: 最終2日は高リスク

### タイムライン & リソースリスク

- **15人日は非常にアグレッシブ**: セキュリティ、テスト、モバイル対応を含めると余裕なし
- **休日、レトロスペクティブ、PRレビュー**: 未考慮（15-20%のバッファ = 3日必要）
- **開発者数**: 1名 = コンテキストスイッチオーバーヘッド、複数名 = コードレビュー時間

### 5つの質問への回答

#### Q1. Argon2パラメータは適切か？

**回答**: ✅ 適切だが改善余地あり
- `memoryCost: 19456 KiB` ≈ 19MB → Vercelの1024MB制限内で問題なし
- `timeCost: 2` は低め → **推奨: 3-4に引き上げ**（UX許容範囲内で<300ms）
- 代替案: クライアント側でハッシュ化（WebCrypto）してサーバーに送信

#### Q2. Realtime P95 < 500ms は現実的か？

**回答**: ⚠️ リージョン内なら達成可能、グローバルではリスク高
- **イントラリージョン**: 通常100-250ms
- **クロスリージョン**: 600-900ms超過の可能性
- **Hobby plan**: QoS保証なし
- **推奨**: **P95目標を800msに緩和** or **Pro planへのアップグレード**
- **Socket.io代替案**: チケット化は良いが、クリティカルパスには入れない

#### Q3. 本番環境に必要な欠落タスク

**O3が指摘した9項目**:

1. **監視・アラート**: Supabase Logs、Vercel Insights、Sentry
2. **CI/CD**: GitHub Actions（lint、型チェック、テスト、マイグレーションdiff）
3. **スキーマバージョニング**: ローカルオンボーディング用のseedデータ
4. **セキュリティヘッダー**: CORS、CSP、Secure Headers
5. **アクセシビリティ**: a11y チェック
6. **災害復旧**: DBバックアップ、Point-in-Time Recovery有効化
7. **法的対応**: プライバシーポリシー（IP/メールアドレス収集時）
8. **レート制限の抜け穴対策**: IPv6、プロキシ、アビューズハンドリング
9. **アナリティクス**: 実環境レイテンシ計測の早期導入

#### Q4. 3週間スケジュールは現実的か？

**回答**: △ プロトタイプなら可能、本番MVPなら5-6週推奨
- **ストリップダウン版**（ハッピーパスのみ）: 3週間で可能
- **本番MVP**（RLS強化、テストカバレッジ、a11y、監視）: **5-6週間 or スコープ削減**

#### Q5. RLS + 匿名認証のセキュリティレビュー

**回答**: ✅ 基本的に安全だが、追加対策必要

| 項目 | 現状 | 追加対策 |
|------|------|---------|
| **RLS** | 強力だがミス設定リスク | ネガティブケーステスト追加 |
| **匿名認証トークン** | リプレイ攻撃可能 | 短いTTL（24時間）+ リフレッシュ |
| **合言葉ハッシュ** | サーバー側保管で良好 | クライアントペイロードに露出させない |
| **Realtimeチャネル認証** | 確認必要 | `postgres_realtime.authenticated = true` を検証 |
| **ブルートフォース対策** | レート制限あり | IP単位 + ルーム単位でも制限 |

---

## 3. O3推奨スケジュール（修正案）

### Week 1
- **Day 1**: リポジトリ初期化、CIパイプラインスケルトン
- **Day 2-4**: スキーマ + RLS + テスト（3日間）
- **Day 5**: レイテンシスパイク、ステートチャート下書き

### Week 2
- **Day 1-2**: 認証 + 合言葉ハッシュ化
- **Day 3**: ルームCRUD API + RLS強化
- **Day 4**: ロビーRealtime + 負荷テストスクリプト
- **Day 5**: 監視/アラート、レート制限

### Week 3
- **Day 1-2**: XState統合 + reconciliation
- **Day 3**: モバイル + a11y修正、統合テスト
- **Day 4**: バグ修正バッファ
- **Day 5**: E2E + リリースチェックリスト

---

## 4. 統合された改善提案

### 必須対応（Phase 1実装前に修正）

#### 1. ルーム参加APIのスケーラビリティ修正
**優先度**: 🔴 高
**作業量**: 4時間

**実装方針**:
```typescript
// lib/crypto/hash.ts に追加
import { createHmac } from 'crypto';

export function generatePassphraseKey(passphrase: string): string {
  const secret = process.env.PASSPHRASE_HMAC_SECRET!;
  return createHmac('sha256', secret).update(passphrase).digest('hex');
}
```

**マイグレーション**:
```sql
ALTER TABLE rooms ADD COLUMN passphrase_key TEXT;
CREATE INDEX idx_rooms_passphrase_key ON rooms(passphrase_key);
```

**API修正**:
```typescript
// POST /api/rooms
const passphraseKey = generatePassphraseKey(passphrase);
const { data: room } = await supabase
  .from('rooms')
  .insert({ passphrase_hash: hashedPassphrase, passphrase_key: passphraseKey })
  .select()
  .single();

// POST /api/rooms/join
const passphraseKey = generatePassphraseKey(passphrase);
const { data: room } = await supabase
  .from('rooms')
  .select('id, passphrase_hash')
  .eq('passphrase_key', passphraseKey)
  .single();

if (!room) {
  return NextResponse.json({ error: '合言葉が一致しません' }, { status: 404 });
}

// Argon2で最終検証
const isMatch = await verifyPassphrase(passphrase, room.passphrase_hash);
if (!isMatch) {
  return NextResponse.json({ error: '合言葉が一致しません' }, { status: 404 });
}
```

#### 2. DB操作のトランザクション化
**優先度**: 🟡 中
**作業量**: 2時間

**実装方針**: Supabase Edge Function または RPC

```sql
-- supabase/migrations/xxxxx_create_room_function.sql
CREATE OR REPLACE FUNCTION create_room_with_host(
  p_passphrase_hash TEXT,
  p_passphrase_key TEXT,
  p_nickname TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_room_id UUID;
BEGIN
  INSERT INTO rooms (passphrase_hash, passphrase_key, host_id)
  VALUES (p_passphrase_hash, p_passphrase_key, p_user_id)
  RETURNING id INTO v_room_id;

  INSERT INTO players (id, room_id, nickname, is_host)
  VALUES (p_user_id, v_room_id, p_nickname, true);

  RETURN json_build_object('room_id', v_room_id, 'player_id', p_user_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**API修正**:
```typescript
const { data, error } = await supabase.rpc('create_room_with_host', {
  p_passphrase_hash: hashedPassphrase,
  p_passphrase_key: passphraseKey,
  p_nickname: nickname,
  p_user_id: authData.user.id,
});
```

#### 3. Argon2パラメータ調整
**優先度**: 🟢 低
**作業量**: 15分

```typescript
const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 3, // 2 → 3 に引き上げ
  parallelism: 1,
};
```

### 推奨対応（Phase 1期間中に追加）

#### 4. 欠落タスクの追加

| タスク | 追加週 | 作業量 | 優先度 |
|--------|-------|--------|--------|
| **CI/CD（GitHub Actions）** | Week 1 Day 1 | 2時間 | 🔴 高 |
| **監視・アラート（Sentry）** | Week 2 Day 5 | 2時間 | 🔴 高 |
| **セキュリティヘッダー** | Week 2 Day 5 | 1時間 | 🟡 中 |
| **Realtimeレイテンシ早期スパイク** | Week 1 Day 5 | 4時間 | 🔴 高 |
| **負荷テストスクリプト（k6/Artillery）** | Week 2 Day 4 | 3時間 | 🟡 中 |
| **DBバックアップ有効化** | Week 1 Day 2 | 30分 | 🟢 低 |
| **a11yチェック** | Week 3 Day 3 | 2時間 | 🟢 低 |

#### 5. スケジュール調整

**案A（推奨）**: 各週の金曜日を調整日として確保
```
Week 1: Day 1-4 実装 → Day 5 調整・レビュー
Week 2: Day 1-4 実装 → Day 5 調整・レビュー
Week 3: Day 1-4 実装 → Day 5 統合テスト・リリース準備
```

**案B**: Phase 1を4週間（20人日）に延長
```
Week 4: 統合テスト、バグ修正、ドキュメント整備
```

**案C**: スコープ削減
- モバイル互換性テスト → 簡易動作確認のみ
- E2Eテスト → 1シナリオのみ（当初計画通り）
- XState → フェーズ定義のみ（イベント遷移実装は Phase 2）

---

## 5. Realtime性能リスク詳細分析

### 現状の想定

| 指標 | 目標値 | 根拠 |
|------|-------|------|
| P95レイテンシ | <500ms | リアルタイムゲームのUX閾値 |
| 測定タイミング | Week 3 Day 3 | 実装後の検証 |
| 代替策 | Socket.io移行 | P95 > 500ms の場合 |

### O3の指摘

- **イントラリージョン**: 100-250ms（達成可能）
- **クロスリージョン**: 600-900ms（目標未達のリスク）
- **Hobby plan**: QoS保証なし

### 推奨対策

#### 対策1: 早期レイテンシスパイク（Week 1 Day 5）

**実施内容**:
```bash
# 3-4地域からのRealtime レイテンシ測定
# - 東京 → Supabase Tokyo
# - シンガポール → Supabase Tokyo
# - 米国西海岸 → Supabase Tokyo
# - 欧州 → Supabase Tokyo
```

**判断基準**:
- 日本国内ユーザー限定なら P95 < 500ms は達成可能
- グローバル展開を視野に入れるなら **P95目標を800msに緩和** or **Pro plan検討**

#### 対策2: P95目標の見直し

| シナリオ | P95目標 | 対応 |
|---------|--------|------|
| 国内限定 | <500ms | 現行計画のまま |
| アジア太平洋 | <800ms | 目標値緩和 + Supabase Pro検討 |
| グローバル | <1000ms | Socket.io移行を前提に設計 |

#### 対策3: Socket.io移行判断の前倒し

**現行計画**: Week 3 Day 3 測定後に判断
**推奨**: Week 1 Day 5 の早期スパイクで判断

**メリット**:
- Week 2-3の実装方針が明確になる
- Socket.ioが必要な場合、Week 2から並行実装可能

---

## 6. セキュリティ強化チェックリスト

### RLS ポリシー

- [ ] **ポジティブテスト**: 自分の役職が取得できる
- [ ] **ネガティブテスト**: 他人の役職が取得できない
- [ ] **ネガティブテスト**: お題が庶民には見えない
- [ ] **ネガティブテスト**: 他のルームのデータが見えない
- [ ] **エッジケース**: phase=RESULT時に全員の役職が見える

### 匿名認証

- [ ] トークンTTLを24時間に設定
- [ ] リフレッシュトークン実装
- [ ] トークンリプレイ攻撃対策（短いTTL + one-time use）
- [ ] セッション管理（ルーム退出時にトークン無効化）

### Realtime チャネル認証

- [ ] `postgres_realtime.authenticated = true` の確認
- [ ] チャネル名に推測困難なトークン使用（例: `room:${roomId}:${secret}`）
- [ ] RLSポリシーでチャネルフィルタリング

### レート制限

- [ ] IP単位: 5リクエスト/分
- [ ] **ルーム単位**: 10失敗/時間（ブルートフォース対策）
- [ ] **グローバル**: 100リクエスト/秒（DDoS対策）
- [ ] IPv6、プロキシ対策（X-Forwarded-For検証）

### セキュリティヘッダー

```typescript
// next.config.mjs
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' *.supabase.co;",
  },
];
```

---

## 7. 最終勧告

### ✅ Phase 1を開始して良い条件

1. **必須対応（改善提案1-3）** を実装完了
2. **スケジュール調整** を実施（4週間延長 or 各週調整日確保）
3. **Realtimeレイテンシ早期スパイク** を Week 1 Day 5 に追加
4. **CI/CD・監視** を Week 1-2 に追加

### ⚠️ 条件付き開始（リスク受容が必要）

- 15人日のままスケジュール変更なし → **遅延リスク高**（バッファ3日不足）
- Realtime P95 < 500ms を維持 → **グローバル展開時に未達リスク**
- 欠落タスク（監視、CI/CD）を Phase 2 に先送り → **本番リリース時に手戻り**

### 🔴 推奨しない

- 改善提案1（ルーム参加API）を未実装のまま開始 → **スケーラビリティ問題**
- Realtimeレイテンシスパイクを省略 → **Week 3で致命的な問題発覚の可能性**

---

## 8. まとめ

Phase 1実装計画は**高品質なアーキテクチャ設計**と**詳細なタスク分解**がなされており、技術的には実行可能です。ただし、**本番MVP水準**を目指す場合、以下の対応が必須です：

### 必須対応リスト

1. ✅ ルーム参加APIのパフォーマンス修正（4時間）
2. ✅ DB操作のトランザクション化（2時間）
3. ✅ Realtimeレイテンシ早期スパイク追加（Week 1 Day 5、4時間）
4. ✅ CI/CD環境構築（Week 1 Day 1、2時間）
5. ✅ 監視・アラート実装（Week 2 Day 5、2時間）
6. ✅ スケジュール調整（4週間に延長 or 各週調整日確保）

### 推奨スケジュール

**修正後の見積もり**: **20人日（4週間）**

- Week 1: 環境構築・DB設計・RLS（6日 → 5日）
- Week 2: ルーム管理・認証・監視（5日）
- Week 3: Realtime統合・XState設計（5日）
- Week 4: 統合テスト・バグ修正・ドキュメント（5日）

### 承認推奨事項

- [x] 技術的妥当性: 承認
- [x] 必須改善提案（1-6）の実施: 承認
- [ ] スケジュール: **4週間（20人日）への延長を推奨**
- [ ] Realtime P95目標: **国内限定なら<500ms、グローバルなら<800msに緩和を推奨**

---

**検証者**: Claude (Gemini MCP + O3 MCP)
**承認推奨**: Phase 1実装計画は**条件付き承認**（上記必須対応の実施を前提）
