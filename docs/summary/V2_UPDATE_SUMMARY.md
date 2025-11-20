# 技術仕様書 V2 アップデート概要

## V2 での主要変更点

### 技術スタックの更新
- **Next.js**: 14 → 15.5.4
- **React**: 18 → 19.1.0
- **Tailwind CSS**: 3.x → 4.1.9
- **TypeScript**: 5.x (継続)

### 新しいUI設計システム

#### デザインシステム
- **カラーパレット**:
  - ゲームレッド: `#E50012` (ブランドカラー)
  - ダークテーマ: `#0a0a0f` (背景)、`#1a1a24` (カード)
  - 役職カラー: マスター(`#3B82F6`)、インサイダー(`#E50012`)、庶民(`#10B981`)
- **フォント**: Noto Sans JP (日本語最適化)
- **背景**: サーキットボードパターン + 微細グリッド

#### UIコンポーネント
以下のコンポーネントが実装されています:
- `CreateRoomModal` / `JoinRoomModal` - ルーム作成・参加
- `PlayerChip` - プレイヤー表示チップ
- `RoomInfoCard` - ルーム情報カード
- `GameSettings` - ゲーム設定 (ホスト専用)
- `TimerRing` - 円形タイマー (SVG)

### ゲームフロー更新

V2では以下7フェーズで構成:
1. **役職配布** (`/game/role-assignment`)
2. **お題確認** (`/game/topic`)
3. **質問** (`/game/question`)
4. **討論** (`/game/debate`)
5. **第一投票** (`/game/vote1`)
6. **第二投票** (`/game/vote2`)
7. **結果** (`/game/result`)

### ルーティング構造

```
/                       - トップページ (ルーム作成/参加)
/lobby                  - ロビー (プレイヤー待機)
/game/role-assignment   - 役職配布
/game/topic             - お題確認 (マスター/インサイダー)
/game/question          - 質問フェーズ
/game/debate            - 討論フェーズ
/game/vote1             - 第一投票 (告発)
/game/vote2             - 第二投票 (選択)
/game/result            - 結果表示
```

### データモデルの変更

#### rooms テーブル (変更なし)
- `passphrase_hash`: 合言葉ハッシュ (20文字まで入力)
- ルームID: 6文字英数字自動生成

#### players テーブル (変更)
- `is_ready`: 準備完了フラグ (新規追加)
- `nickname`: 最大10文字 (20文字から変更)

#### game_sessions テーブル (変更)
- `time_limit`: 制限時間 (分単位、選択肢: 3/5/7/10/15)
- `category`: お題カテゴリ (全般/動物/食べ物/場所/物)

### 実装の詳細

#### タイマーコンポーネント
```typescript
function TimerRing({ remaining, total, size = 200 }) {
  // 円形SVGプログレスバー
  // 残り10秒以下で赤色に変化
  // スムーズなアニメーション (1秒transition)
}
```

#### 役職表示
```typescript
const ROLES = {
  master: { name: "マスター", icon: "/images/master-icon.png", color: "#3B82F6" },
  insider: { name: "インサイダー", icon: "/images/insider-mark.png", color: "#E50012" },
  common: { name: "庶民", icon: "/images/common-icon.png", color: "#10B981" }
}
```

#### ロビー機能
- リアルタイムプレイヤーリスト更新
- グリッド表示 (2列)
- 空きスロット表示 (最大12人)
- ホスト専用ゲーム設定
- 合言葉コピー機能

### アニメーション

```css
/* フェードイン */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* パルスグロー */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(229, 0, 18, 0.3); }
  50% { box-shadow: 0 0 30px rgba(229, 0, 18, 0.6); }
}

/* スライドイン */
@keyframes slide-in {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

### レスポンシブ対応

- **モバイルファースト**: デフォルト320px-430px
- **最大幅制限**: `max-w-md` (448px), `max-w-2xl` (672px)
- **タップ領域**: 最小44px × 44px
- **ボタン高さ**: 48px以上

### アクセシビリティ

- Radix UI コンポーネント使用 (ARIA属性自動)
- WCAG 2.1 AA 準拠目標
- コントラスト比 4.5:1 以上
- キーボードナビゲーション対応

### 参考プロトタイプ

完全な実装例は `/online-board-game/` ディレクトリを参照してください。

---

**注**: 詳細な技術仕様は `SYSTEM_REQUIREMENTS.md` および `DESIGN_REQUIREMENTS.md` を参照してください。
