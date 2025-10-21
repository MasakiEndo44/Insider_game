# PNG→SVG変換ガイド（実践マニュアル）

**対象読者**: 開発者・デザイナー
**所要時間**: 約30分/アイコン（初回）、15分/アイコン（慣れた後）
**必要ツール**: Figma（推奨）または Inkscape（無料）
**関連文書**: [アイコン統合要件定義書](./icon_integration_requirements.md)

---

## 📋 変換対象アイコン一覧

| 優先度 | ファイル名 | 用途 | 目標サイズ | 期限 |
|--------|-----------|------|-----------|------|
| **P1** | `master.png` | マスター役割表示 | 24×24px | Phase 1 |
| **P1** | `insider.png` | インサイダー役割表示 | 24×24px | Phase 1 |
| **P1** | `common.png` | 庶民役割表示 | 24×24px | Phase 1 |
| **P2** | `timer.png` | タイマー表示 | 24×24px | Phase 3 |
| **P2** | `conversation.png` | 質問フェーズ | 24×24px | Phase 3 |
| **P2** | `network.png` | 接続状態 | 24×24px | Phase 3 |
| **P3** | `Insider_eye_logo_1.png` | メインロゴ | 128×128px | Phase 4 |
| **P3** | `Insider_eye_logo_2.png` | Favicon | 512×512px | Phase 4 |
| **P3** | `Insider_eye_logo_3.png` | ローディング | 64×64px | Phase 4 |

---

## 🎯 変換の基本原則

### DO（すべきこと）
✅ **手動で再描画** - 元PNGを参考に、ベクターツールで一から描く
✅ **2pxストローク** - lucide-reactと視覚的に統一
✅ **currentColor使用** - テーマ切り替え対応
✅ **パスを簡素化** - ノード数を最小限に
✅ **24×24pxグリッド** - lucide標準サイズ

### DON'T（してはいけないこと）
❌ **自動トレースツール** - ファイルサイズ肥大化、品質低下
❌ **塗りつぶしメイン** - lucide-reactはストローク中心
❌ **固定色指定** - `fill="#E50012"` などは使わない
❌ **過度な装飾** - シンプルな形状を心がける
❌ **不要なメタデータ** - id, class属性は削除

---

## 📐 Figmaを使った変換手順（推奨）

### 準備

1. **Figmaを開く**: https://www.figma.com/
2. **新規ファイル作成**: "Insider Icons"
3. **フレーム作成**: 24×24px（役割アイコン用）、128×128px（ロゴ用）

### Step 1: 元PNGの分析（5分）

```
1. PNGファイルをFigmaにドラッグ&ドロップ
2. 拡大表示（200%〜400%）して主要要素を確認：
   - 主な形状（円、四角、三角など）
   - 線の太さ
   - 塗りつぶし領域
   - 特徴的なディテール
3. スクリーンショットを撮影（参考用）
```

**例: master.png分析**
```
主要要素:
- 王冠の形状（三角形3つ）
- 中央の宝石（円形）
- 線の太さ: 約2-3px
- 色: 青系（#3B82F6相当）
```

### Step 2: ベクター再描画（15分）

#### 2.1 キャンバス設定

```
1. Figmaで新規フレーム作成: 24×24px
2. グリッド表示: View > Layout Grids > Grid (2px間隔)
3. スナップ有効化: Snap to pixel grid
```

#### 2.2 基本形状の配置

```
ツールバー:
- Rectangle (R): 四角形
- Ellipse (O): 円形
- Line (L): 直線
- Pen (P): 自由曲線
```

**王冠の例（master.png）**:
```
1. Triangle #1: 幅8px × 高さ6px（中央）
2. Triangle #2: 幅6px × 高さ5px（左）
3. Triangle #3: 幅6px × 高さ5px（右）
4. Circle: 直径3px（中央上部、宝石）
```

#### 2.3 ストローク設定

```
右パネル > Stroke:
- Color: currentColor（後で設定）
- Width: 2px
- Cap: Round
- Join: Round
- Align: Center
```

#### 2.4 パスの結合と簡素化

```
1. すべての要素を選択（Cmd+A）
2. 右クリック > Flatten（パスをフラット化）
3. 右クリック > Simplify Path（ノード削減）
4. 不要なノードを手動削除（Pen Tool）
```

### Step 3: SVGエクスポート（5分）

#### 3.1 エクスポート設定

```
右パネル > Export:
1. Format: SVG
2. Settings:
   - Include "id" attribute: OFF
   - Outline text: ON
   - Simplify stroke: ON
3. Export master-icon（ファイル名: master-icon.svg）
```

#### 3.2 currentColor変換

エクスポート後、テキストエディタで開く：

```xml
<!-- ❌ Before -->
<svg viewBox="0 0 24 24">
  <path stroke="#3B82F6" ... />
</svg>

<!-- ✅ After -->
<svg viewBox="0 0 24 24">
  <path stroke="currentColor" ... />
</svg>
```

**一括置換**:
```bash
# すべての固定色をcurrentColorに変換
sed -i '' 's/stroke="#[0-9A-Fa-f]\{6\}"/stroke="currentColor"/g' master-icon.svg
sed -i '' 's/fill="#[0-9A-Fa-f]\{6\}"/fill="none"/g' master-icon.svg
```

### Step 4: SVGO最適化（3分）

#### 4.1 SVGO設定ファイル作成

`/svgo.config.js`:
```javascript
module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,  // viewBoxは保持
          removeDimensions: true, // width/height削除（親で制御）
        },
      },
    },
    {
      name: 'convertColors',
      params: {
        currentColor: true,  // currentColor変換
      },
    },
    {
      name: 'removeAttrs',
      params: {
        attrs: ['class', 'id', 'data-*'],  // 不要属性削除
      },
    },
  ],
};
```

#### 4.2 最適化実行

```bash
# 単一ファイル
npx svgo --config=svgo.config.js master-icon.svg

# 複数ファイル一括
npx svgo --config=svgo.config.js -f ./icon/svg-output/
```

### Step 5: 品質検証（5分）

#### 5.1 ファイルサイズ確認

```bash
ls -lh master-icon.svg

# 合格基準: < 2KB
# 例: -rw-r--r--  1 user  staff   1.2K  master-icon.svg ✅
```

#### 5.2 ブラウザ表示確認

HTMLテストファイル作成：

```html
<!-- test-icons.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    svg { margin: 20px; border: 1px solid #ccc; }
    .size-16 { width: 16px; height: 16px; }
    .size-24 { width: 24px; height: 24px; }
    .size-48 { width: 48px; height: 48px; }
    .color-blue { color: #3B82F6; }
    .color-red { color: #E50012; }
    .color-white { color: #FFFFFF; background: #0a0a0f; }
  </style>
</head>
<body>
  <h2>Size Test</h2>
  <img src="master-icon.svg" class="size-16" />
  <img src="master-icon.svg" class="size-24" />
  <img src="master-icon.svg" class="size-48" />

  <h2>Color Test (currentColor)</h2>
  <div class="color-blue">
    <img src="master-icon.svg" class="size-24" />
  </div>
  <div class="color-red">
    <img src="master-icon.svg" class="size-24" />
  </div>
  <div class="color-white">
    <img src="master-icon.svg" class="size-24" />
  </div>
</body>
</html>
```

**検証項目**:
- [ ] 16px〜48pxすべてで鮮明に表示
- [ ] currentColorでテーマカラー変更可能
- [ ] エッジがジャギーなく滑らか

#### 5.3 lucide-reactとの比較

```tsx
import { Crown } from 'lucide-react';  // lucide標準
import { MasterIcon } from './master-icon';  // カスタム

// 並べて表示して視覚的に比較
<div>
  <Crown size={24} strokeWidth={2} />
  <MasterIcon size={24} strokeWidth={2} />
</div>
```

**合格基準**:
- [ ] ストローク幅がほぼ同じ（視覚的に違和感なし）
- [ ] 角の丸み（strokeLinecap）が一致
- [ ] 全体のバランスが調和

---

## 🆓 Inkscape（無料）を使った代替手順

### インストール

```bash
# macOS
brew install inkscape

# Windows
# https://inkscape.org/release/ からダウンロード
```

### 変換手順

#### 1. PNGインポート

```
File > Import > master.png
Object > Trace Bitmap > Detection mode: Edge detection
Threshold: 0.45（調整して最適化）
```

⚠️ **注意**: トレース後、必ずパスを手動で簡素化

#### 2. パス簡素化

```
Path > Simplify (Ctrl+L)
繰り返し実行してノード数を削減（元の50%程度まで）
```

#### 3. ストローク設定

```
Object > Fill and Stroke:
- Fill: None
- Stroke paint: currentColor (手動でXMLに記載)
- Stroke style: Width 2px, Round cap, Round join
```

#### 4. SVGエクスポート

```
File > Save As > Plain SVG
（Inkscape SVGではなくPlain SVGを選択）
```

---

## 🚀 Reactコンポーネント化

### Step 6: TSXファイル作成

`/components/ui/icons/custom/master-icon.tsx`:

```tsx
import { IconBase, IconProps } from '../icon-base';

export function MasterIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* SVGのpathをここにコピー */}
      <path d="M12 2L15 8L21 9L16 14L18 21L12 17L6 21L8 14L3 9L9 8L12 2Z" />
    </IconBase>
  );
}
```

### エクスポート

`/components/ui/icons/custom/index.ts`:
```tsx
export { MasterIcon } from './master-icon';
export { InsiderIcon } from './insider-icon';
export { CommonIcon } from './common-icon';
```

---

## ✅ 完成チェックリスト

### 技術要件
- [ ] ファイルサイズ < 2KB
- [ ] パス数 < 20
- [ ] viewBox="0 0 24 24" 設定済み
- [ ] stroke="currentColor" 使用
- [ ] strokeWidth="2" 統一
- [ ] strokeLinecap="round" 設定
- [ ] strokeLinejoin="round" 設定
- [ ] 不要属性削除済み（id, class, data-*）

### デザイン要件
- [ ] 16px〜48pxで鮮明表示
- [ ] lucide-reactと視覚的に調和
- [ ] 形状が他の役職と明確に区別可能
- [ ] グリッドに整列（pixel-perfect）

### アクセシビリティ要件
- [ ] currentColorでテーマ対応
- [ ] 色覚異常シミュレーション合格
- [ ] aria-label用のコメント記載
- [ ] 装飾/情報伝達の区分明確

---

## 🐛 トラブルシューティング

### 問題1: ファイルサイズが大きい（>5KB）

**原因**: パス数が多すぎる、または精度が高すぎる

**解決策**:
```bash
# 精度を下げて再エクスポート
npx svgo --precision=2 master-icon.svg

# 手動でノード削減
# Figma: Simplify Path
# Inkscape: Path > Simplify (Ctrl+L × 3回)
```

### 問題2: 小さいサイズでぼやける

**原因**: パスがグリッドに整列していない

**解決策**:
```
Figma: Snap to pixel grid を有効化
すべての座標を整数に丸める（例: 12.3px → 12px）
```

### 問題3: currentColorが効かない

**原因**: SVGに固定色が残っている

**解決策**:
```bash
# すべての固定色を検索
grep -E 'stroke="#|fill="#' master-icon.svg

# 一括置換
sed -i '' 's/stroke="#[0-9A-Fa-f]\{6\}"/stroke="currentColor"/g' master-icon.svg
```

### 問題4: lucide-reactと見た目が違う

**原因**: ストローク幅またはcap/joinの設定ミス

**解決策**:
```tsx
// lucide-reactのデフォルト設定を確認
<Crown size={24} strokeWidth={2} />

// カスタムアイコンを同じ設定に
<MasterIcon size={24} strokeWidth={2} />

// SVGのデフォルト値も修正
<svg strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
```

---

## 📊 作業時間の目安

| タスク | 初回 | 2回目以降 |
|--------|------|----------|
| PNG分析 | 5分 | 3分 |
| ベクター再描画 | 20分 | 10分 |
| SVGエクスポート | 5分 | 2分 |
| SVGO最適化 | 3分 | 1分 |
| 品質検証 | 10分 | 5分 |
| TSX化 | 5分 | 3分 |
| **合計** | **48分** | **24分** |

---

## 🎓 学習リソース

### Figma基礎
- [Figma Tutorial - Vector Networks](https://www.youtube.com/watch?v=5x2uHUB_pzw)
- [Creating Icon Sets in Figma](https://www.figma.com/community/file/1234567890)

### SVG最適化
- [SVGO Documentation](https://github.com/svg/svgo)
- [A Practical Guide to SVGs](https://svgontheweb.com/)

### アクセシビリティ
- [Accessible SVG Icons](https://css-tricks.com/accessible-svg-icons/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**ガイド終了**

実際の変換作業を開始する前に、P1アイコン（master/insider/common）で練習し、プロセスに慣れてから本番実施を推奨します。不明点があれば、[アイコン統合要件定義書](./icon_integration_requirements.md)を参照してください。
