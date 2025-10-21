# アイコン統合実装サマリー

**作成日**: 2025-10-21
**ステータス**: 要件定義完了 → 実装準備完了
**対象**: 開発チーム全員

---

## 📝 このドキュメントについて

`/icon` ディレクトリのカスタムアイコン（PNG）をプロジェクトに統合するための要件定義と実装ガイドの**総まとめ**です。

---

## 🎯 目的

カスタムアイコンを活用し、以下を実現する：

| 目標 | 現状 | 改善後 |
|------|------|--------|
| **視認性** | テキストのみ | アイコン + テキストで直感的 |
| **ブランディング** | 汎用アイコンのみ | 独自デザインでゲーム体験向上 |
| **アクセシビリティ** | 色のみで区別 | 形状 + ラベルで情報伝達 |
| **一貫性** | lucide-reactとバラバラ | 統一インターフェースで管理 |

---

## 📂 関連ドキュメント

以下の順序で読むことを推奨：

| No. | ドキュメント | 内容 | 対象読者 |
|-----|------------|------|---------|
| **1** | **[アイコン統合要件定義書](./icon_integration_requirements.md)** | 全体方針、技術戦略、実装計画 | 全員必読 |
| **2** | [PNG→SVG変換ガイド](./png_to_svg_conversion_guide.md) | 実践的な変換手順（Figma/Inkscape） | デザイナー・開発者 |
| **3** | [IconBase実装ガイド](./iconbase_implementation_guide.md) | コンポーネント実装、テスト戦略 | 開発者 |
| **4** | このドキュメント | 実装サマリー（クイックリファレンス） | 全員 |

---

## ⚙️ 技術戦略（ハイブリッドアプローチ）

### 構成

```
lucide-react（メイン） + カスタムSVG（特殊用途）
```

| アイコン種類 | 使用ライブラリ | 例 |
|------------|--------------|-----|
| **汎用アイコン** | lucide-react | Play, Settings, Copy, Lock, Clock |
| **役割表示** | **カスタムSVG** | Master, Insider, Common（庶民） |
| **ゲーム要素** | **カスタムSVG** | Timer, Conversation, Network |
| **ブランディング** | **カスタムSVG** | Insider Logo（3バリエーション） |

### メリット

✅ **保守性**: lucide-reactの豊富なセット活用 → メンテナンスコスト削減
✅ **一貫性**: IconBaseラッパーで統一API
✅ **パフォーマンス**: Tree-shakingで未使用アイコン自動除外
✅ **拡張性**: 新アイコン追加が容易

---

## 🚀 実装フェーズ（6日間）

| Phase | 内容 | 期間 | 成果物 |
|-------|------|------|--------|
| **Phase 1** | IconBase構築 + 役割アイコン3つ変換 | 2日 | IconBase、master/insider/common.svg |
| **Phase 2** | ロビー・投票画面統合 | 1日 | PlayerChipにカスタムアイコン表示 |
| **Phase 3** | フェーズ・ステータスUI | 1日 | timer/conversation/network.svg |
| **Phase 4** | ブランディング | 1日 | ロゴ更新、Favicon生成 |
| **Phase 5** | QA・最適化 | 1日 | Lighthouse ≥ 95、バンドル < 20KB |

---

## 🎨 PNG→SVG変換要件

### 方針

**手動再描画（必須）** - 自動トレースツールは**禁止**

| 項目 | 基準 |
|------|------|
| **ツール** | Figma（推奨）または Inkscape（無料） |
| **キャンバス** | 24×24px グリッド（lucide標準） |
| **ストローク** | 2px幅、round cap/join |
| **カラー** | currentColor（固定色禁止） |
| **最適化** | SVGO実行（< 2KB/icon） |

### 変換対象（優先順）

| 優先度 | ファイル | 期限 |
|--------|---------|------|
| **P1** | `master.png`, `insider.png`, `common.png` | Phase 1 |
| **P2** | `timer.png`, `conversation.png`, `network.png` | Phase 3 |
| **P3** | `Insider_eye_logo_1-3.png` | Phase 4 |

**詳細**: [PNG→SVG変換ガイド](./png_to_svg_conversion_guide.md)

---

## 🧩 IconBaseコンポーネント

### 概要

すべてのアイコン（lucide + カスタム）に統一インターフェースを提供

```tsx
import { MasterIcon, Play } from '@/components/ui/icons';

// lucide-reactもカスタムも同じAPI
<MasterIcon size={20} aria-label="マスター" />
<Play size={20} aria-label="開始" />
```

### 主要Props

| Props | デフォルト | 説明 |
|-------|----------|------|
| `size` | `24` | width/height（lucide標準） |
| `strokeWidth` | `2` | ストローク幅 |
| `aria-label` | `undefined` | スクリーンリーダー用ラベル |
| `aria-hidden` | `!aria-label` | ラベルがなければ装飾扱い |
| `className` | `""` | Tailwind CSSクラス |

### ディレクトリ構造

```
/components/ui/icons
├── index.ts               # バレルファイル
├── icon-base.tsx          # IconBaseコンポーネント
├── lucide/
│   └── index.ts           # lucide-react再エクスポート
└── custom/
    ├── master-icon.tsx
    ├── insider-icon.tsx
    └── common-icon.tsx
```

**詳細**: [IconBase実装ガイド](./iconbase_implementation_guide.md)

---

## ♿ アクセシビリティ要件（最低限レベル）

### 必須要件

| 要件 | 実装方法 | 検証 |
|------|---------|------|
| **1. テキスト代替** | `aria-label="役職名"` | axe DevTools |
| **2. 装飾アイコン** | `aria-hidden="true"` | 同上 |
| **3. コントラスト** | アイコン vs 背景 ≥ 3:1 | Stark Plugin |
| **4. 色非依存** | 形状 + ラベルで情報伝達 | 色覚異常シミュレーション |
| **5. フォーカス** | `focus-visible:ring-2` | キーボードテスト |

### 色覚異常対応（形状差別化）

| 役職 | 形状特徴 | 識別性 |
|------|---------|--------|
| **マスター** | 王冠型（三角形3つ） | ✅ 他と明確に異なる |
| **インサイダー** | 目型（楕円+瞳孔） | ✅ 対称的構造 |
| **庶民** | 人型（円形頭部+体） | ✅ シンプルシルエット |

**検証**: Figma Color Blind Plugin（Protanopia/Deuteranopia/Tritanopia）

---

## 📊 品質保証基準

### 自動化テスト

| テスト | ツール | 合格基準 |
|--------|--------|---------|
| **アクセシビリティ** | Lighthouse CI | スコア ≥ 95 |
| **ビジュアルリグレッション** | Chromatic | 差分なし |
| **バンドルサイズ** | Webpack Bundle Analyzer | カスタムアイコン合計 < 20KB |

### 手動検証

| 項目 | 合格基準 |
|------|---------|
| **VoiceOver（iOS）** | すべてのアイコンが音声で識別可能 |
| **TalkBack（Android）** | 同上 |
| **色覚異常** | 3役職がすべての色覚タイプで区別可能 |

---

## 🛠️ 実装クイックスタート

### 1. IconBase作成

```bash
# ディレクトリ作成
mkdir -p components/ui/icons/{custom,lucide}

# IconBase実装
touch components/ui/icons/icon-base.tsx

# コピペ: iconbase_implementation_guide.md の "4.1 IconBase本体"
```

### 2. lucide-react再エクスポート

```bash
# components/ui/icons/lucide/index.ts
```

```tsx
export {
  Play, Settings, Crown, Eye, User,
  Clock, Check, Copy, Lock, Hash
} from 'lucide-react';
```

### 3. カスタムアイコン変換

```bash
# Figmaで master.png を再描画 → master-icon.svg 生成
npx svgo --config=svgo.config.js master-icon.svg

# TSXファイル作成
touch components/ui/icons/custom/master-icon.tsx
```

### 4. バレルファイル作成

```tsx
// components/ui/icons/index.ts
export { IconBase } from './icon-base';
export * from './custom';
export * from './lucide';
```

### 5. 使用例

```tsx
import { MasterIcon, Play } from '@/components/ui/icons';

<MasterIcon
  size={20}
  aria-label="マスター"
  className="text-blue-500"
/>
```

---

## ⚠️ よくある質問（FAQ）

### Q1: なぜ自動トレースツールを使わないのか？

**A**: 以下の問題があるため：
- ファイルサイズ肥大化（2KB → 40KB以上）
- パス数増加でレンダリング負荷
- lucide-reactとの視覚的不一致（ストローク vs 塗りつぶし）

### Q2: PNG→SVG変換にどれくらい時間がかかるか？

**A**:
- 初回: 約30分/アイコン（ツールの習熟含む）
- 慣れた後: 約15分/アイコン
- 9個すべて: 約3-4時間（Phase 1〜4分散実施）

### Q3: lucide-reactに同じアイコンがあったらどうするか？

**A**:
- 視覚的に十分近い → lucide-reactを使用（例: Clock, User）
- ブランド固有のデザイン → カスタムSVG使用（例: 役割アイコン）

### Q4: Faviconのサイズは？

**A**:
- 元SVG: 512×512px
- 生成サイズ: 512/180/32/16px（複数サイズ）
- ツール: `sharp` または `favicon.io`

### Q5: ダークモード対応は？

**A**:
`currentColor` 使用により自動対応：

```tsx
<div className="text-white dark:text-blue-400">
  <MasterIcon size={20} />  {/* 自動的に色変化 */}
</div>
```

---

## 🚨 注意事項・禁止事項

### DO（すべきこと）

✅ 手動でSVGを再描画
✅ `currentColor` 使用
✅ `aria-label` または `aria-hidden` 必ず設定
✅ SVGOで最適化
✅ Phase 1で3アイコン先行実施（学習コスト吸収）

### DON'T（してはいけないこと）

❌ 自動トレースツール使用
❌ 固定色指定（`stroke="#3B82F6"`）
❌ `aria-label` なしで情報伝達
❌ lucide-reactを `* as Icons` で一括インポート
❌ Phase間の依存関係無視（Phase 1完了前にPhase 2開始）

---

## 📞 サポート・問い合わせ

| 内容 | 参照先 |
|------|--------|
| **全体方針・計画** | [アイコン統合要件定義書](./icon_integration_requirements.md) |
| **変換手順** | [PNG→SVG変換ガイド](./png_to_svg_conversion_guide.md) |
| **実装詳細** | [IconBase実装ガイド](./iconbase_implementation_guide.md) |
| **技術的質問** | チーム内Slackチャンネル（例: #icon-integration） |

---

## ✅ 最終チェックリスト（実装完了時）

### Phase 5完了基準

- [ ] IconBase実装完了、すべてのアイコンが統一API
- [ ] カスタムアイコン9個すべてSVG化・最適化済み
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Bundle Analyzerでカスタムアイコン < 20KB
- [ ] VoiceOverテスト合格（すべて識別可能）
- [ ] 色覚異常シミュレーション合格（3役職区別可能）
- [ ] Storybookでアイコンカタログ作成
- [ ] README更新（アイコン使用方法記載）

---

**サマリー終了**

実装開始前に、必ず [アイコン統合要件定義書](./icon_integration_requirements.md) を精読してください。Phase 1開始時には、チーム全体でキックオフミーティングを実施し、役割分担と期限を明確化することを推奨します。
