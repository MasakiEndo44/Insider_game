# インサイダーゲーム V2 - デザイン要件

## デザインコンセプト

### テーマ
**ダークモダン × ミニマル × スタイリッシュ**

シンプルで洗練されたダークテーマを基調とし、少ない色でインパクトのあるUIを実現する。日本語ゲームとして可読性を重視し、Noto Sans JPフォントを採用。

### デザイン原則
1. **明確性**: ゲームの状態とアクションを一目で理解できる
2. **一貫性**: 全画面で統一されたデザイン言語
3. **レスポンシブ**: モバイルファーストで全デバイス対応
4. **アクセシビリティ**: コントラスト比、タップ領域、スクリーンリーダー対応

## カラーシステム

### プライマリカラー

#### ゲームレッド
- **メイン**: `#E50012`（インサイダーゲームのブランドカラー）
- **ダーク**: `#B30010`（ホバー、アクティブ状態）
- **ライト**: `#FF1A2E`（強調、アクセント）

**用途**:
- 主要アクション（PLAY、ゲーム開始ボタン）
- インサイダー役職
- 重要な情報の強調
- アイコンのアクセント

### ベースカラー（ダークテーマ）

#### 背景
- **Background**: `#0a0a0f`（最も暗い背景）
- **Card**: `#1a1a24`（カード背景）
- **Card Hover**: `#24242e`（カードホバー）
- **Input**: `#24242e`（入力欄背景）

#### テキスト
- **Foreground**: `#ffffff`（メインテキスト）
- **Muted**: `#6b7280`（控えめなテキスト）
- **Muted Foreground**: `#d1d5db`（セカンダリテキスト）

#### ボーダー・装飾
- **Border**: `#3d3d4a`（境界線、区切り）

### 役職カラー

#### マスター（青）
- **Color**: `#3B82F6`
- **用途**: マスター役職、お題表示、マスター関連UI

#### インサイダー（赤）
- **Color**: `#E50012`
- **用途**: インサイダー役職、危険、警告

#### 庶民（緑）
- **Color**: `#10B981`
- **用途**: 庶民役職、成功、確認

### セマンティックカラー

#### 成功（グリーン）
- **Color**: `#10B981`
- **用途**: 準備完了、正解、成功メッセージ

#### 警告（イエロー）
- **Color**: `#F59E0B`
- **用途**: 時間切れ警告、注意喚起

#### エラー（レッド）
- **Color**: `#EF4444`
- **用途**: エラーメッセージ、失敗

## タイポグラフィ

### フォントファミリー
```css
font-family: 'Noto Sans JP', ui-sans-serif, system-ui, sans-serif;
```

**理由**: 日本語の可読性が高く、太さのバリエーションが豊富。

### フォントサイズ階層

#### ヘッダー
- **H1**: `text-5xl` (48px) - トップページタイトル
- **H2**: `text-3xl` (30px) - 役職名
- **H3**: `text-2xl` (24px) - フェーズタイトル
- **H4**: `text-xl` (20px) - セクションタイトル

#### ボディ
- **Large**: `text-lg` (18px) - 重要な説明文
- **Base**: `text-base` (16px) - 標準テキスト
- **Small**: `text-sm` (14px) - セカンダリ情報
- **XSmall**: `text-xs` (12px) - キャプション、補足

### フォントウェイト
- **Black**: `font-black` (900) - タイトル、強調
- **Bold**: `font-bold` (700) - ボタン、見出し
- **Medium**: `font-medium` (500) - 標準テキスト
- **Normal**: `font-normal` (400) - 本文

## レイアウト

### コンテナ
```css
max-width: 28rem; /* 448px, sm:max-w-md */
max-width: 32rem; /* 512px, max-w-lg */
max-width: 42rem; /* 672px, max-w-2xl */
```

**用途**: 
- モバイル: `max-w-md` (448px)
- タブレット: `max-w-lg` (512px)
- デスクトップ: `max-w-2xl` (672px)

### スペーシング

#### 垂直
- **XL**: `space-y-8` (32px) - 大セクション間
- **Large**: `space-y-6` (24px) - セクション間
- **Medium**: `space-y-4` (16px) - 要素間
- **Small**: `space-y-2` (8px) - 密接な要素間

#### パディング
- **カード**: `p-6` (24px) または `p-4` (16px)
- **ボタン**: `h-14` (56px) または `h-12` (48px)
- **ページ**: `p-4` (16px)

### グリッド
```css
/* プレイヤーチップ */
grid-cols-2 gap-3

/* 投票ボタン */
grid-cols-2 gap-4
```

## コンポーネント

### ボタン

#### プライマリ（赤）
```tsx
className="bg-[#E50012] hover:bg-[#B30010] text-white"
```
**用途**: メインアクション（PLAY、ゲーム開始）

#### アウトライン（白）
```tsx
className="bg-transparent hover:bg-white/5 text-white border-2 border-white/70 hover:border-white"
```
**用途**: セカンダリアクション（参加、確認）

#### アウトライン（赤ホバー）
```tsx
className="bg-transparent hover:bg-[#E50012]/10 text-white border-2 border-white/80 hover:border-[#E50012] hover:text-[#E50012]"
```
**用途**: 重要だがプライマリほどではないアクション

#### サイズ
- **Large**: `h-16` (64px) - 最重要ボタン
- **Medium**: `h-14` (56px) - 主要ボタン
- **Small**: `h-12` (48px) - 標準ボタン

### カード

#### 標準カード
```tsx
className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-xl p-6"
```

#### 役職カード
```tsx
className="bg-card/50 backdrop-blur-sm border-2 rounded-2xl p-8"
style={{ borderColor: roleInfo.color }}
```

### インプット

#### テキストフィールド
```tsx
className="bg-input border-border placeholder:text-muted-foreground h-12"
```

**特徴**:
- 左パディングでアイコンスペース確保 (`pl-10`)
- 最大文字数制限（合言葉: 20、プレイヤー名: 10）

### アイコン

#### サイズ
- **XL**: `w-12 h-12` - インパクト重視
- **Large**: `w-8 h-8` - フェーズアイコン
- **Medium**: `w-6 h-6` - ボタン内アイコン
- **Small**: `w-5 h-5` - リストアイコン
- **XSmall**: `w-4 h-4` - 補助アイコン

#### セット
**Lucide React** を使用:
- `Play` - 再生、ゲーム開始
- `Users` - プレイヤー、参加
- `Crown` - ホスト
- `LogOut` - 退出
- `Copy` / `Check` - コピー/完了
- `Lock` - 合言葉
- `User` - プレイヤー名
- `MessageSquare` - 質問、会話
- `Vote` - 投票
- `ThumbsUp` / `ThumbsDown` - 賛成/反対

### タイマー（円形プログレスバー）

#### 仕様
```tsx
<TimerRing remaining={120} total={300} size={200} />
```

**視覚**:
- 円形SVG、半径45、ストローク幅8
- 残り時間 > 10秒: 白
- 残り時間 ≤ 10秒: 赤 (`#E50012`)
- スムーズなアニメーション (`transition-all duration-1000`)

**表示**:
- 中央に時間（`5:00` 形式）
- 下部に「残り時間」ラベル

### プレイヤーチップ

#### 構造
```tsx
<PlayerChip
  name="たろう"
  isHost={true}
  isReady={true}
  isCurrentPlayer={false}
  animationDelay={100}
/>
```

**デザイン**:
- 高さ: `h-16` (64px)
- 背景: `bg-card/50 backdrop-blur-sm`
- ボーダー: `border-2 border-border`
- ホスト: `border-[#E50012]` + 王冠アイコン
- 準備完了: 緑のチェックマーク
- 自分: 強調表示

## 背景・装飾

### サーキットボード背景

#### CSS実装
```css
.circuit-bg {
  background-color: #0a0a0f;
  background-image:
    linear-gradient(rgba(45, 45, 58, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 45, 58, 0.3) 1px, transparent 1px),
    linear-gradient(rgba(45, 45, 58, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45, 45, 58, 0.2) 1px, transparent 1px);
  background-size: 50px 50px, 50px 50px, 10px 10px, 10px 10px;
}
```

#### グラデーション装飾
```css
.circuit-pattern::before {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(229, 0, 18, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(229, 0, 18, 0.03) 0%, transparent 50%);
}
```

**用途**: 全画面の背景として適用

## アニメーション

### フェードイン
```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
```

**用途**: ページ遷移時、コンテンツの表示

### パルスグロー
```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(229, 0, 18, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(229, 0, 18, 0.6);
  }
}
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

**用途**: ロゴ、重要なアイコンの強調

### スライドイン
```css
@keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
```

**用途**: プレイヤーチップの登場

### トランジション
```css
/* ボタン */
transition-all duration-200

/* タイマー円形バー */
transition-all duration-1000 ease-linear
```

## レスポンシブデザイン

### ブレークポイント
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

### モバイルファースト戦略
1. デフォルトはモバイル向けスタイリング
2. `sm:` 以上でタブレット・デスクトップ調整
3. 最大幅を制限してデスクトップでも見やすく

### タッチ領域
- 最小サイズ: `44px × 44px`
- ボタン高さ: `h-12` (48px) 以上
- アイコンボタン: `w-10 h-10` (40px) 以上

## アクセシビリティ

### コントラスト比
- **AA準拠**: 4.5:1 以上（通常テキスト）
- **AAA準拠**: 7:1 以上（重要テキスト）

### ARIA属性
- ボタン: `aria-label`、`aria-disabled`
- ダイアログ: `role="dialog"`、`aria-modal`
- プログレスバー: `role="progressbar"`、`aria-valuenow`

### フォーカス管理
- キーボードナビゲーション対応
- フォーカス可視化（`outline-ring/50`）

## アセット

### 画像
- **ロゴ**: `/images/insider-logo.png` (128×128)
- **役職アイコン**:
  - マスター: `/images/master-icon.png`
  - インサイダー: `/images/insider-mark.png`
  - 庶民: `/images/common-icon.png`
- **フェーズアイコン**:
  - 会話: `/images/conversation-icon.png`
  - タイマー: `/images/timer-icon.png`
  - etc.

### アイコン形式
- **SVG優先**: スケーラブル、軽量
- **PNG**: 必要に応じて（ロゴ等）

## デザイントークン（Tailwind設定）

### カスタムカラー
```js
colors: {
  'game-red': '#E50012',
  'game-red-dark': '#B30010',
  'game-red-light': '#FF1A2E',
}
```

### 角丸
```js
borderRadius: {
  'sm': '0.375rem',
  'md': '0.5rem',
  'lg': '0.75rem',
  'xl': '1rem',
  '2xl': '1.5rem',
}
```

### シャドウ
```js
boxShadow: {
  'glow': '0 0 20px rgba(229, 0, 18, 0.3)',
  'glow-strong': '0 0 30px rgba(229, 0, 18, 0.6)',
}
```

## ブランディング

### ロゴ使用ガイドライン
- 最小サイズ: 48×48px
- クリアスペース: 周囲に12px以上
- 背景: ダークテーマで使用

### カラー使用優先度
1. **ゲームレッド**: 最重要アクション、ブランドアイデンティティ
2. **白**: テキスト、ボーダー
3. **役職カラー**: 役職関連UIのみ
4. **セマンティック**: 状態表示のみ

## UI/UXのベストプラクティス

### フィードバック
- **即時**: ボタンクリック時のホバー、アクティブ状態
- **プログレス**: ローディング表示、投票済み表示
- **成功/エラー**: トースト通知、インラインメッセージ

### プログレッシブディスクロージャー
- 必要な情報のみを段階的に表示
- モーダルで詳細設定を隠す

### 状態管理
- 明確な状態表示（ローディング、成功、エラー、空）
- ディスエーブル状態の視覚化

### エラー防止
- バリデーション（入力時、送信前）
- 確認ダイアログ（破壊的アクション）
- ディスエーブル状態（条件未満足時）
