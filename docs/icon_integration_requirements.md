# アイコン統合要件定義書

**プロジェクト名**: インサイダーゲーム オンライン版
**文書バージョン**: 1.0
**作成日**: 2025-10-21
**ステータス**: Draft
**関連文書**: [UI/UXデザイン要件定義書](./output/ui_ux_design_requirements.md)

---

## 目次

1. [背景と目的](#1-背景と目的)
2. [スコープ：アイコン活用領域](#2-スコープアイコン活用領域)
3. [技術戦略：ハイブリッドアプローチ](#3-技術戦略ハイブリッドアプローチ)
4. [PNG→SVG変換要件](#4-pngsvg変換要件)
5. [デザイン統合ガイドライン](#5-デザイン統合ガイドライン)
6. [アクセシビリティ要件](#6-アクセシビリティ要件)
7. [実装計画](#7-実装計画)
8. [品質保証基準](#8-品質保証基準)
9. [リスクと対策](#9-リスクと対策)
10. [付録](#10-付録)

---

## 1. 背景と目的

### 1.1 背景

`/icon` ディレクトリに以下のカスタムアイコンが用意されている：

| ファイル名 | 用途 | 優先度 |
|-----------|------|--------|
| `master.png` | マスター役割表示 | 高 |
| `insider.png` | インサイダー役割表示 | 高 |
| `timer.png` | タイマー表示 | 中 |
| `conversation.png` | 会話/質問フェーズ | 中 |
| `network.png` | 接続状態表示 | 中 |
| `common.png` | 庶民役割表示 | 高 |
| `Insider_eye_logo_1.png` | ブランドロゴ（バリエーション1） | 高 |
| `Insider_eye_logo_2.png` | ブランドロゴ（バリエーション2） | 高 |
| `Insider_eye_logo_3.png` | ブランドロゴ（バリエーション3） | 高 |

現在、UIでは `lucide-react` を主要アイコンライブラリとして使用しているが、これらのカスタムアイコンが活用されていない。

### 1.2 目的

カスタムアイコンを効果的に活用することで、以下を実現する：

1. **視認性向上**: 役割・フェーズ・状態を直感的に識別可能に
2. **ブランディング強化**: 独自デザインでゲーム体験の一貫性を向上
3. **アクセシビリティ向上**: 色だけでなく形状でも情報を伝達
4. **デザイン統一**: lucide-reactとの一貫したビジュアル言語確立

### 1.3 成功指標

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| **視認性スコア** | ユーザーテスト正答率 ≥ 90% | 役割識別タスク（5秒以内） |
| **アクセシビリティ** | Lighthouse Accessibility ≥ 95 | 自動化テスト |
| **コントラスト比** | アイコン vs 背景 ≥ 3:1 | Figma Stark Plugin |
| **ファイルサイズ** | カスタムアイコン合計 < 20KB | Webpack Bundle Analyzer |

---

## 2. スコープ：アイコン活用領域

### 2.1 役割表示（Priority: 最高）

#### 使用箇所
- ロビー画面のプレイヤーリスト
- 役職配布画面
- 投票画面の候補者表示
- 結果画面の役職公開

#### アイコン仕様

| 役職 | カスタムアイコン | フォールバック（lucide） | サイズ | カラー |
|------|----------------|----------------------|--------|--------|
| **マスター** | `master.svg`（変換後） | `Crown` | 20px | `#3B82F6` |
| **インサイダー** | `insider.svg`（変換後） | `Eye` | 20px | `#E50012` |
| **庶民** | `common.svg`（変換後） | `User` | 20px | `#10B981` |

#### デザイン要件
- **形状差別化**: 色覚異常対応のため、各役職で明確に異なる形状
- **ラベル併用**: アイコン単独ではなく、必ず役職名テキストと併記
- **ホバー効果**: `hover:scale-110 transition-transform`

### 2.2 ゲームフェーズUI（Priority: 高）

#### 使用箇所
- ヘッダー部分のフェーズ表示
- フェーズ遷移通知トースト
- ゲーム進行タイムライン

#### アイコン仕様

| フェーズ | カスタムアイコン | フォールバック（lucide） | サイズ | カラー |
|---------|----------------|----------------------|--------|--------|
| **質問フェーズ** | `conversation.svg` | `MessageCircle` | 24px | `#FFFFFF` |
| **討論フェーズ** | `conversation.svg` | `MessageSquare` | 24px | `#FFFFFF` |
| **投票中** | lucideのみ | `Vote` | 24px | `#E50012` |
| **結果発表** | lucideのみ | `Trophy` | 24px | `#10B981` |

### 2.3 ステータス表示（Priority: 中）

#### 使用箇所
- 接続状態インジケーター
- タイマー表示
- 準備完了ステータス

#### アイコン仕様

| ステータス | カスタムアイコン | フォールバック（lucide） | サイズ | カラー |
|-----------|----------------|----------------------|--------|--------|
| **接続中** | `network.svg` | `Wifi` | 16px | `#10B981` |
| **切断** | lucideのみ | `WifiOff` | 16px | `#EF4444` |
| **タイマー** | `timer.svg` | `Clock` | 16px | `#FFFFFF` |

### 2.4 ブランディング（Priority: 高）

#### 使用箇所
- トップページのロゴ
- ローディング画面
- Favicon（512×512px）

#### アイコン仕様

| 用途 | カスタムアイコン | サイズ | 備考 |
|------|----------------|--------|------|
| **メインロゴ** | `Insider_eye_logo_1.svg` | 128×128px | Pulse glowアニメーション付き |
| **Favicon** | `Insider_eye_logo_2.svg` | 512×512px | 複数サイズ生成（16/32/180px） |
| **ローディング** | `Insider_eye_logo_3.svg` | 64×64px | Spinアニメーション |

### 2.5 アクションボタン（Priority: 低）

**方針**: lucide-reactを継続使用（カスタムアイコン不使用）

| アクション | lucideアイコン | サイズ |
|-----------|---------------|--------|
| ゲーム開始 | `Play` | 20px |
| 退室 | `LogOut` | 20px |
| コピー | `Copy` | 14px |
| 設定 | `Settings` | 20px |

---

## 3. 技術戦略：ハイブリッドアプローチ

### 3.1 基本方針

**lucide-react（メイン）+ カスタムSVG（特殊用途）のハイブリッド構成**

#### 採用理由
1. **保守性**: lucide-reactの豊富なアイコンセットを活用し、メンテナンスコスト削減
2. **一貫性**: すべてのアイコンを統一インターフェース（IconBaseラッパー）で提供
3. **パフォーマンス**: Tree-shakingにより未使用アイコンを自動除外
4. **拡張性**: 将来的な新アイコン追加が容易

### 3.2 ディレクトリ構造

```
/components
  /ui
    /icons
      ├── index.ts                 # バレルファイル（全アイコンをエクスポート）
      ├── icon-base.tsx            # 統一インターフェースラッパー
      ├── lucide/
      │   └── index.ts             # lucide-reactからの再エクスポート
      └── custom/
          ├── master-icon.tsx
          ├── insider-icon.tsx
          ├── common-icon.tsx
          ├── timer-icon.tsx
          ├── conversation-icon.tsx
          ├── network-icon.tsx
          └── insider-logo.tsx
```

### 3.3 IconBase統一インターフェース

```tsx
// /components/ui/icons/icon-base.tsx
import { cn } from "@/lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}

export function IconBase({
  size = 24,
  strokeWidth = 2,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden = !ariaLabel,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={cn("inline-block", className)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      focusable="false"
      role={ariaLabel ? "img" : undefined}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}
```

### 3.4 使用例

```tsx
// ✅ lucide-reactアイコン
import { Play, Settings } from "@/components/ui/icons";

<Button>
  <Play size={20} aria-label="ゲームを開始" />
  開始
</Button>

// ✅ カスタムアイコン
import { MasterIcon, InsiderIcon } from "@/components/ui/icons/custom";

<div>
  <MasterIcon size={20} aria-label="マスター" />
  <span>マスター</span>
</div>
```

---

## 4. PNG→SVG変換要件

### 4.1 変換方針

**手動再描画を推奨** - 自動トレースツールは以下の問題がある：
- パス数が膨大になりファイルサイズ増加（>40KB）
- スケール時にジャギー発生
- lucide-reactとの視覚的不一致（ストローク vs 塗りつぶし）

### 4.2 変換手順

#### Step 1: 元PNGの分析
1. 各PNGを128×128pxで表示し、視覚的特徴を記録
2. 主要要素（形状、線、塗りつぶし領域）を特定
3. lucide-reactスタイル（2pxストローク、角丸）との整合性確認

#### Step 2: ベクター再描画
**推奨ツール**: Figma / Adobe Illustrator / Inkscape（無料）

1. **キャンバス設定**: 24×24px グリッド（lucide標準）
2. **ストローク設定**:
   - 線幅: 2px
   - strokeLinecap: `round`
   - strokeLinejoin: `round`
3. **カラー設定**: すべてのパスを `currentColor`（親要素から色を継承）
4. **パスの簡素化**: 不要なノードを削除し、滑らかな曲線に

#### Step 3: SVGエクスポート
1. **フォーマット**: SVG 1.1
2. **精度**: 小数点以下2桁まで
3. **最適化**: 不要な属性削除（id, class, fill="none"は保持）

#### Step 4: SVGO最適化
```bash
npx svgo --config=svgo.config.js custom-icon.svg
```

**svgo.config.js**:
```javascript
module.exports = {
  plugins: [
    { name: 'preset-default' },
    { name: 'removeViewBox', active: false },
    { name: 'removeDimensions', active: true },
    { name: 'convertColors', params: { currentColor: true } },
  ],
};
```

### 4.3 品質検証基準

| 項目 | 基準 | 検証方法 |
|------|------|---------|
| **ファイルサイズ** | < 2KB/icon | `ls -lh *.svg` |
| **パス数** | < 20 paths | SVGエディタで確認 |
| **視認性** | 16px〜48pxで鮮明 | ブラウザで各サイズ表示 |
| **lucide一貫性** | ストローク幅2px、角丸 | 並べて比較 |
| **currentColor対応** | テーマ切り替えで色変化 | CSS変数で検証 |

---

## 5. デザイン統合ガイドライン

### 5.1 サイズ規格

既存UI仕様書（4.4節）と整合：

| サイズ名 | ピクセル | Tailwind Class | 用途 |
|---------|---------|---------------|------|
| **Small** | 16px | `w-4 h-4` | インラインアイコン、ステータス |
| **Medium** | 20px | `w-5 h-5` | ボタン、役割表示 |
| **Large** | 24px | `w-6 h-6` | フェーズ表示、ヘッダー |
| **XLarge** | 32px | `w-8 h-8` | プレイヤーアバター |

### 5.2 カラーパレット

| 用途 | Tailwind Class | Hex | 適用例 |
|------|---------------|-----|--------|
| **プライマリ** | `text-primary` | `#E50012` | インサイダーアイコン、重要アクション |
| **セカンダリ** | `text-white` | `#FFFFFF` | 通常アイコン（ダークテーマ） |
| **成功** | `text-green-500` | `#10B981` | 庶民アイコン、準備完了 |
| **情報** | `text-blue-500` | `#3B82F6` | マスターアイコン |
| **ミュート** | `text-muted-foreground` | `#9ca3af` | 非アクティブアイコン |

### 5.3 間隔ルール

| 配置 | 間隔 | Tailwind Class |
|------|------|---------------|
| アイコン + テキスト（横並び） | 8px | `gap-2` |
| アイコン + テキスト（縦並び） | 4px | `gap-1` |
| 複数アイコン（横並び） | 12px | `gap-3` |

### 5.4 アニメーション

| アニメーション | 用途 | 実装 |
|-------------|------|------|
| **Pulse Glow** | ロゴ、重要通知 | `animate-pulse-glow` |
| **Spin** | ローディング | `animate-spin` |
| **Scale on Hover** | インタラクティブアイコン | `hover:scale-110 transition-transform` |
| **Fade In** | アイコン出現 | `animate-fade-in` |

---

## 6. アクセシビリティ要件

### 6.1 最低限レベル定義

以下の要件をすべて満たすこと：

#### 必須要件（WCAG 2.2 Level A/AA）

| 要件 | 基準 | 実装方法 |
|------|------|---------|
| **1. テキスト代替** | すべての情報伝達アイコンに代替テキスト | `aria-label="役職名"` |
| **2. 装飾アイコン** | 装飾のみのアイコンはスクリーンリーダーから隠す | `aria-hidden="true"` |
| **3. コントラスト** | アイコン vs 背景 ≥ 3:1 | Stark Pluginで検証 |
| **4. 色非依存** | 色だけでなく形状+ラベルで情報伝達 | 各役職で異なる形状 |
| **5. フォーカス可視化** | インタラクティブアイコンにフォーカスリング | `focus-visible:ring-2` |

### 6.2 色覚異常対応（最低限）

#### 形状差別化戦略

| 役職 | 形状特徴 | 色覚異常でも識別可能な理由 |
|------|---------|-------------------------|
| **マスター** | 王冠型（三角形3つ） | 他と明確に異なる輪郭 |
| **インサイダー** | 目型（楕円+瞳孔） | 対称的な内部構造 |
| **庶民** | 人型（円形頭部+体） | シンプルな人物シルエット |

#### 検証方法
- **ツール**: Figma "Color Blind" プラグイン
- **検証対象**: Protanopia（1型）、Deuteranopia（2型）、Tritanopia（3型）
- **合格基準**: すべての色覚タイプで3役職が区別可能

### 6.3 実装チェックリスト

```tsx
// ✅ 良い例：情報伝達アイコン
<MasterIcon
  size={20}
  aria-label="マスター"
  className="text-blue-500"
/>
<span className="ml-2">田中さん</span>

// ✅ 良い例：装飾アイコン
<Button>
  <Play size={20} aria-hidden="true" />
  開始
</Button>

// ❌ 悪い例：aria-labelなし
<MasterIcon size={20} />  // スクリーンリーダーで意味不明

// ❌ 悪い例：色のみで区別
<div className="text-red-500">
  <Circle />  // 「赤い円 = インサイダー」は色覚異常で判別不可
</div>
```

---

## 7. 実装計画

### 7.1 フェーズ分割

#### Phase 1: 基盤構築（優先度: 最高）
**期間**: 2日
**成果物**:
- IconBaseコンポーネント実装
- PNG→SVG変換（役割アイコン3つ優先）
- バレルファイル作成

**タスク**:
1. `icon-base.tsx` 実装
2. `master.png`, `insider.png`, `common.png` を手動SVG変換
3. SVGO最適化スクリプト作成
4. `/components/ui/icons/index.ts` 作成

#### Phase 2: 役割表示統合（優先度: 高）
**期間**: 1日
**成果物**:
- ロビー画面でカスタム役割アイコン表示
- 投票画面での適用

**タスク**:
1. `PlayerChip` コンポーネントにカスタムアイコン統合
2. アクセシビリティ検証（aria-label、コントラスト）
3. 色覚異常シミュレーション実施

#### Phase 3: フェーズ・ステータスUI（優先度: 中）
**期間**: 1日
**成果物**:
- `timer.svg`, `conversation.svg`, `network.svg` 変換・統合

**タスク**:
1. 残りPNG→SVG変換
2. ヘッダー・ステータスバーへの適用
3. アニメーション追加（pulse, scale）

#### Phase 4: ブランディング（優先度: 高）
**期間**: 1日
**成果物**:
- トップページロゴ更新
- Favicon生成（複数サイズ）

**タスク**:
1. `Insider_eye_logo_1.png` → SVG変換
2. Pulse glowアニメーション実装
3. Favicon生成（512/180/32/16px）

#### Phase 5: 品質保証・最適化（優先度: 中）
**期間**: 1日
**成果物**:
- アクセシビリティ監査レポート
- パフォーマンス最適化

**タスク**:
1. Lighthouse Accessibility テスト（目標 ≥ 95）
2. Bundle Analyzer でファイルサイズ検証（< 20KB）
3. Storybook でアイコンカタログ作成

### 7.2 マイルストーン

| マイルストーン | 完了基準 | 期日 |
|-------------|---------|------|
| **M1: IconBase完成** | すべてのアイコンが統一インターフェースで利用可能 | Day 2 |
| **M2: 役割アイコン統合** | ロビー・投票画面でカスタムアイコン表示 | Day 3 |
| **M3: 全アイコン統合** | すべてのカスタムアイコンがSVG化・適用済み | Day 5 |
| **M4: QA完了** | Lighthouse ≥ 95、バンドルサイズ < 20KB | Day 6 |

---

## 8. 品質保証基準

### 8.1 自動化テスト

#### 8.1.1 アクセシビリティテスト

```bash
# Lighthouse CI設定
npm run lighthouse:a11y

# 合格基準
- Accessibility Score ≥ 95
- 0 critical a11y errors
- すべてのアイコンに適切なaria属性
```

#### 8.1.2 ビジュアルリグレッションテスト

```bash
# Chromatic（Storybook統合）
npm run chromatic

# 検証項目
- アイコンサイズの一貫性
- カラーテーマ切り替え時の表示
- ホバー・フォーカス状態
```

#### 8.1.3 バンドルサイズ監視

```bash
# Webpack Bundle Analyzer
npm run build:analyze

# 合格基準
- カスタムアイコン合計 < 20KB
- lucide-react未使用アイコンが除外されている
```

### 8.2 手動検証

#### 8.2.1 色覚異常シミュレーション

| テスト | ツール | 合格基準 |
|--------|--------|---------|
| Protanopia（1型） | Figma Color Blind Plugin | 3役職すべて区別可能 |
| Deuteranopia（2型） | Chrome DevTools Rendering | 同上 |
| Tritanopia（3型） | 同上 | 同上 |

#### 8.2.2 実機テスト

| デバイス | 検証項目 | 合格基準 |
|---------|---------|---------|
| iPhone 13/14 | VoiceOver操作 | すべてのアイコンが音声で識別可能 |
| Android（Pixel） | TalkBack操作 | 同上 |
| iPad | タッチターゲットサイズ | 最小44×44px確保 |

### 8.3 パフォーマンス基準

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| **LCP（Largest Contentful Paint）** | < 2.0秒 | Lighthouse Mobile |
| **アイコン読み込み時間** | < 100ms | Network タブ |
| **アニメーションFPS** | 60 fps | Chrome DevTools Performance |

---

## 9. リスクと対策

### 9.1 技術的リスク

| リスク | 影響度 | 確率 | 対策 |
|--------|--------|------|------|
| **PNG→SVG変換品質低下** | 高 | 中 | 手動再描画を徹底、自動トレース禁止 |
| **lucide-reactとの視覚的不一致** | 中 | 中 | IconBase統一インターフェース、ストローク幅2px固定 |
| **バンドルサイズ増加** | 中 | 低 | SVGOで最適化、Tree-shaking有効化 |
| **アクセシビリティ不適合** | 高 | 低 | Phase 5でLighthouse監査必須 |

### 9.2 スケジュールリスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **手動SVG変換に予想以上の時間** | 中 | Phase 1で3アイコン先行実施し、工数見積もり再調整 |
| **色覚異常対応で形状調整が必要** | 低 | 初期段階でシミュレーション実施、早期フィードバック |

### 9.3 ユーザー体験リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **新アイコンが直感的でない** | 高 | Phase 2でユーザーテスト（役割識別タスク）実施 |
| **アニメーションが過剰で気が散る** | 中 | `prefers-reduced-motion` 対応、控えめなデフォルト設定 |

---

## 10. 付録

### 10.1 参考資料

#### 技術文書
- [Lucide React Documentation](https://lucide.dev/guide/packages/lucide-react)
- [WCAG 2.2 Level AA Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [SVGO Documentation](https://github.com/svg/svgo)

#### デザインリソース
- [Material Design Icons Guidelines](https://m3.material.io/styles/icons/overview)
- [Apple Human Interface Guidelines - SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

### 10.2 ツール

| ツール | 用途 | URL |
|--------|------|-----|
| **SVGOMG** | SVG最適化（Web UI） | https://jakearchibald.github.io/svgomg/ |
| **Figma** | ベクター再描画 | https://www.figma.com/ |
| **Inkscape** | 無料ベクターエディタ | https://inkscape.org/ |
| **Stark Plugin** | アクセシビリティ検証 | https://www.getstark.co/ |
| **Chrome DevTools** | 色覚異常シミュレーション | Rendering > Emulate vision deficiencies |

### 10.3 用語集

| 用語 | 定義 |
|------|------|
| **Tree-shaking** | ビルド時に未使用コードを自動削除する最適化手法 |
| **currentColor** | 親要素の `color` プロパティを継承するSVG値 |
| **SVGO** | SVG Optimizer - SVGファイルを圧縮・最適化するツール |
| **IconBase** | すべてのアイコンに統一インターフェースを提供するラッパーコンポーネント |
| **バレルファイル** | 複数モジュールを一括エクスポートする `index.ts` |

### 10.4 承認記録

| 承認項目 | 承認者 | 承認日 | ステータス |
|---------|--------|--------|----------|
| **技術戦略（ハイブリッドアプローチ）** | - | - | ☐ Pending |
| **PNG→SVG変換方針** | - | - | ☐ Pending |
| **アクセシビリティ要件** | - | - | ☐ Pending |
| **実装計画（6日間）** | - | - | ☐ Pending |
| **品質保証基準** | - | - | ☐ Pending |

---

**文書終了**

本要件定義書は、既存の [UI/UXデザイン要件定義書](./output/ui_ux_design_requirements.md) と整合性を保ちつつ、カスタムアイコン統合の具体的な実装指針を提供します。実装時は両文書を参照し、不明点がある場合はステークホルダーと協議の上、変更履歴に記録してください。
