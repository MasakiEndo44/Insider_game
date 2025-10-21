# IconBase実装ガイド

**対象読者**: 開発者
**技術スタック**: React 19 + TypeScript + Tailwind CSS v4
**関連文書**: [アイコン統合要件定義書](./icon_integration_requirements.md)

---

## 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [IconBaseコンポーネント仕様](#2-iconbaseコンポーネント仕様)
3. [ディレクトリ構造](#3-ディレクトリ構造)
4. [実装コード](#4-実装コード)
5. [使用例](#5-使用例)
6. [アクセシビリティチェックリスト](#6-アクセシビリティチェックリスト)
7. [テスト戦略](#7-テスト戦略)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. アーキテクチャ概要

### 1.1 設計思想

**統一インターフェース原則**: lucide-reactとカスタムSVGの両方を同じAPIで扱う

```
┌─────────────────────────────────────┐
│      Icon Usage (Consumer)          │
│   <MasterIcon size={20} />          │
│   <Play size={20} />                │
└──────────────┬──────────────────────┘
               │ 統一API
┌──────────────┴──────────────────────┐
│         IconBase Wrapper            │
│  - size, strokeWidth, className     │
│  - aria-label, aria-hidden          │
│  - currentColor適用                 │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐    ┌─────▼─────┐
│  lucide   │    │  custom   │
│  (Crown)  │    │  (Master) │
└───────────┘    └───────────┘
```

### 1.2 主要機能

| 機能 | 説明 | メリット |
|------|------|---------|
| **Props統一** | すべてのアイコンが同じPropsを受け取る | 保守性向上 |
| **自動a11y** | aria属性の自動設定 | アクセシビリティ担保 |
| **テーマ対応** | currentColorで親の色を継承 | ダークモード対応容易 |
| **Tree-shaking** | 未使用アイコンを自動除外 | バンドルサイズ削減 |

---

## 2. IconBaseコンポーネント仕様

### 2.1 Props定義

```tsx
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /**
   * アイコンのサイズ（width/height両方に適用）
   * @default 24
   */
  size?: number | string;

  /**
   * ストローク幅（lucide-reactとの整合性のため）
   * @default 2
   */
  strokeWidth?: number | string;

  /**
   * Tailwind CSSクラス
   */
  className?: string;

  /**
   * スクリーンリーダー用のラベル
   * - 指定した場合: role="img", aria-hidden="false"
   * - 未指定の場合: aria-hidden="true"（装飾扱い）
   */
  'aria-label'?: string;

  /**
   * スクリーンリーダーから隠すかどうか
   * @default !aria-label（aria-labelがあればfalse）
   */
  'aria-hidden'?: boolean;
}
```

### 2.2 デフォルト値

| Props | デフォルト値 | 理由 |
|-------|------------|------|
| `size` | `24` | lucide-reactのデフォルトと一致 |
| `strokeWidth` | `2` | lucide-reactのデフォルトと一致 |
| `aria-hidden` | `!aria-label` | ラベルがあれば表示、なければ装飾扱い |
| `focusable` | `false` | SVG自体はフォーカス不要（親要素で制御） |
| `fill` | `"none"` | ストローク中心のデザイン |
| `stroke` | `"currentColor"` | 親要素の色を継承 |

---

## 3. ディレクトリ構造

### 3.1 完成形

```
/components
  /ui
    /icons
      ├── index.ts                    # バレルファイル（すべてエクスポート）
      ├── icon-base.tsx               # IconBaseコンポーネント
      ├── icon-base.test.tsx          # ユニットテスト
      ├── types.ts                    # 型定義
      ├── lucide/
      │   └── index.ts                # lucide-reactから再エクスポート
      └── custom/
          ├── index.ts                # カスタムアイコンをまとめてエクスポート
          ├── master-icon.tsx
          ├── insider-icon.tsx
          ├── common-icon.tsx
          ├── timer-icon.tsx
          ├── conversation-icon.tsx
          ├── network-icon.tsx
          └── insider-logo.tsx
```

### 3.2 インポートパス

```tsx
// ✅ 推奨: バレルファイルから一括インポート
import { MasterIcon, Play, Settings } from '@/components/ui/icons';

// ⚠️ 非推奨: 個別インポート（Tree-shakingは効くが冗長）
import { MasterIcon } from '@/components/ui/icons/custom/master-icon';
import { Play } from 'lucide-react';
```

---

## 4. 実装コード

### 4.1 IconBase本体

`/components/ui/icons/icon-base.tsx`:

```tsx
import { cn } from "@/lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}

/**
 * IconBase - すべてのアイコンに統一インターフェースを提供
 *
 * @example
 * ```tsx
 * // 情報伝達アイコン（aria-label必須）
 * <IconBase aria-label="マスター" size={20}>
 *   <path d="..." />
 * </IconBase>
 *
 * // 装飾アイコン（aria-hidden自動設定）
 * <IconBase>
 *   <path d="..." />
 * </IconBase>
 * ```
 */
export function IconBase({
  size = 24,
  strokeWidth = 2,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden = !ariaLabel, // ラベルがなければ装飾扱い
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      focusable="false"
      role={ariaLabel ? "img" : undefined}
      {...rest}
    >
      {children}
    </svg>
  );
}
```

### 4.2 型定義

`/components/ui/icons/types.ts`:

```tsx
export { IconProps } from './icon-base';

/**
 * カスタムアイコンコンポーネントの型
 */
export type CustomIconComponent = (props: IconProps) => JSX.Element;
```

### 4.3 カスタムアイコン実装例

`/components/ui/icons/custom/master-icon.tsx`:

```tsx
import { IconBase, IconProps } from '../icon-base';

/**
 * MasterIcon - マスター役割を示すアイコン
 *
 * デザイン: 王冠型（三角形3つ + 中央の宝石）
 * デフォルトカラー: #3B82F6（blue-500）
 *
 * @example
 * ```tsx
 * // 情報伝達用（aria-label必須）
 * <MasterIcon size={20} aria-label="マスター" className="text-blue-500" />
 *
 * // ラベル併用
 * <div className="flex items-center gap-2">
 *   <MasterIcon size={16} aria-hidden="true" className="text-blue-500" />
 *   <span>マスター</span>
 * </div>
 * ```
 */
export function MasterIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/*
        TODO: FigmaでSVG作成後、ここにpathを貼り付け
        例: <path d="M12 2L15 8L21 9L16 14L18 21L12 17L6 21L8 14L3 9L9 8L12 2Z" />
      */}
      <path d="M12 2L15 8L21 9L16 14L18 21L12 17L6 21L8 14L3 9L9 8L12 2Z" />
    </IconBase>
  );
}
```

`/components/ui/icons/custom/insider-icon.tsx`:

```tsx
import { IconBase, IconProps } from '../icon-base';

/**
 * InsiderIcon - インサイダー役割を示すアイコン
 *
 * デザイン: 目型（楕円 + 瞳孔）
 * デフォルトカラー: #E50012（Game Red）
 *
 * @example
 * ```tsx
 * <InsiderIcon size={20} aria-label="インサイダー" className="text-[#E50012]" />
 * ```
 */
export function InsiderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* TODO: FigmaでSVG作成後、ここにpathを貼り付け */}
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}
```

`/components/ui/icons/custom/common-icon.tsx`:

```tsx
import { IconBase, IconProps } from '../icon-base';

/**
 * CommonIcon - 庶民役割を示すアイコン
 *
 * デザイン: 人型シルエット
 * デフォルトカラー: #10B981（green-500）
 *
 * @example
 * ```tsx
 * <CommonIcon size={20} aria-label="庶民" className="text-green-500" />
 * ```
 */
export function CommonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* TODO: FigmaでSVG作成後、ここにpathを貼り付け */}
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}
```

### 4.4 バレルファイル

`/components/ui/icons/custom/index.ts`:

```tsx
export { MasterIcon } from './master-icon';
export { InsiderIcon } from './insider-icon';
export { CommonIcon } from './common-icon';
export { TimerIcon } from './timer-icon';
export { ConversationIcon } from './conversation-icon';
export { NetworkIcon } from './network-icon';
export { InsiderLogo } from './insider-logo';
```

`/components/ui/icons/lucide/index.ts`:

```tsx
/**
 * lucide-reactアイコンの再エクスポート
 *
 * 使用するアイコンのみインポートし、未使用アイコンはTree-shakingで除外
 */
export {
  Play,
  Users,
  LogOut,
  Settings,
  Crown,
  Eye,
  User,
  Clock,
  Check,
  Copy,
  Lock,
  Hash,
  Tag,
  Menu,
  X,
  MessageCircle,
  MessageSquare,
  Vote,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
```

`/components/ui/icons/index.ts`:

```tsx
// 型定義
export type { IconProps, CustomIconComponent } from './types';

// IconBase
export { IconBase } from './icon-base';

// カスタムアイコン
export * from './custom';

// lucide-reactアイコン
export * from './lucide';
```

---

## 5. 使用例

### 5.1 基本的な使い方

```tsx
import { MasterIcon, InsiderIcon, CommonIcon, Play } from '@/components/ui/icons';

// 1. 情報伝達アイコン（aria-label必須）
<MasterIcon
  size={20}
  aria-label="マスター"
  className="text-blue-500"
/>

// 2. 装飾アイコン（ボタン内で使用）
<Button>
  <Play size={20} aria-hidden="true" />
  開始
</Button>

// 3. アイコン + テキスト（推奨パターン）
<div className="flex items-center gap-2">
  <InsiderIcon size={16} aria-hidden="true" className="text-[#E50012]" />
  <span>インサイダー</span>
</div>
```

### 5.2 PlayerChipでの使用

```tsx
import { MasterIcon, InsiderIcon, CommonIcon } from '@/components/ui/icons';

interface PlayerChipProps {
  name: string;
  role?: 'MASTER' | 'INSIDER' | 'COMMON';
  isHost: boolean;
}

export function PlayerChip({ name, role, isHost }: PlayerChipProps) {
  const getRoleIcon = () => {
    if (!role) return null;

    const iconProps = {
      size: 16,
      'aria-hidden': true, // テキストがあるので装飾扱い
    };

    switch (role) {
      case 'MASTER':
        return <MasterIcon {...iconProps} className="text-blue-500" />;
      case 'INSIDER':
        return <InsiderIcon {...iconProps} className="text-[#E50012]" />;
      case 'COMMON':
        return <CommonIcon {...iconProps} className="text-green-500" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
      {/* Role Icon */}
      {role && (
        <div className="flex items-center gap-1">
          {getRoleIcon()}
          <span className="text-xs">
            {role === 'MASTER' ? 'マスター' :
             role === 'INSIDER' ? 'インサイダー' : '庶民'}
          </span>
        </div>
      )}

      {/* Name */}
      <p className="font-bold">{name}</p>

      {/* Host Badge */}
      {isHost && (
        <span className="text-xs text-[#E50012]">ホスト</span>
      )}
    </div>
  );
}
```

### 5.3 動的サイズ変更

```tsx
import { MasterIcon } from '@/components/ui/icons';

// Tailwind CSSで制御
<div className="w-4 h-4">
  <MasterIcon className="w-full h-full" />
</div>

// Propsで直接指定
<MasterIcon size={32} />  // 32px
<MasterIcon size="2rem" />  // 2rem
```

### 5.4 カラーテーマ対応

```tsx
// 親要素のtext-*カラーを継承（currentColor）
<div className="text-blue-500 dark:text-blue-400">
  <MasterIcon size={20} />  {/* 自動的に青色 */}
</div>

<div className="text-white">
  <MasterIcon size={20} />  {/* 自動的に白色 */}
</div>
```

---

## 6. アクセシビリティチェックリスト

### 6.1 実装時チェック

#### すべてのアイコンで必須

- [ ] `aria-label` または `aria-hidden` を明示的に設定
- [ ] `focusable="false"` 設定（SVG自体はフォーカス不要）
- [ ] `role="img"` は `aria-label` がある場合のみ設定

#### 情報伝達アイコン（役割表示など）

- [ ] `aria-label="役職名"` 設定
- [ ] `aria-hidden="false"` （デフォルト）
- [ ] コントラスト比 ≥ 3:1 検証
- [ ] 形状差別化（色だけに依存しない）

#### 装飾アイコン（ボタン内など）

- [ ] `aria-hidden="true"` 設定
- [ ] 親要素（Button）に適切なラベル
- [ ] アイコン単独でクリッカブルにしない

### 6.2 テストチェック

```tsx
// ✅ 良い例
test('MasterIcon with aria-label', () => {
  render(<MasterIcon aria-label="マスター" />);

  const icon = screen.getByRole('img', { name: 'マスター' });
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute('aria-hidden', 'false');
});

// ✅ 良い例: 装飾アイコン
test('MasterIcon decorative', () => {
  render(<MasterIcon />);

  const icon = screen.getByRole('img', { hidden: true });
  expect(icon).toHaveAttribute('aria-hidden', 'true');
});
```

### 6.3 VoiceOverテスト（手動）

**手順**:
1. iPhone Safari で該当ページを開く
2. VoiceOverを有効化（設定 > アクセシビリティ > VoiceOver）
3. 画面を右スワイプでアイコンに移動
4. 読み上げ内容を確認

**合格基準**:
- 情報伝達アイコン: 「マスター、イメージ」と読み上げ
- 装飾アイコン: スキップされる（読み上げなし）

---

## 7. テスト戦略

### 7.1 ユニットテスト

`/components/ui/icons/icon-base.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { IconBase } from './icon-base';

describe('IconBase', () => {
  test('renders with default props', () => {
    render(
      <IconBase>
        <path d="M12 2L15 8" />
      </IconBase>
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  test('applies custom size', () => {
    render(
      <IconBase size={32}>
        <path d="M12 2L15 8" />
      </IconBase>
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  test('sets aria-label correctly', () => {
    render(
      <IconBase aria-label="Test Icon">
        <path d="M12 2L15 8" />
      </IconBase>
    );

    const svg = screen.getByRole('img', { name: 'Test Icon' });
    expect(svg).toHaveAttribute('aria-label', 'Test Icon');
    expect(svg).toHaveAttribute('aria-hidden', 'false');
  });

  test('hides from screen readers when no aria-label', () => {
    render(
      <IconBase>
        <path d="M12 2L15 8" />
      </IconBase>
    );

    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });
});
```

### 7.2 ビジュアルリグレッションテスト

**Storybook + Chromatic**:

`/components/ui/icons/icon-base.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MasterIcon, InsiderIcon, CommonIcon } from './index';

const meta: Meta = {
  title: 'UI/Icons',
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const RoleIcons: StoryObj = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-blue-500">
        <MasterIcon size={24} aria-label="マスター" />
      </div>
      <div className="text-[#E50012]">
        <InsiderIcon size={24} aria-label="インサイダー" />
      </div>
      <div className="text-green-500">
        <CommonIcon size={24} aria-label="庶民" />
      </div>
    </div>
  ),
};

export const Sizes: StoryObj = {
  render: () => (
    <div className="flex items-center gap-4">
      <MasterIcon size={16} className="text-blue-500" />
      <MasterIcon size={20} className="text-blue-500" />
      <MasterIcon size={24} className="text-blue-500" />
      <MasterIcon size={32} className="text-blue-500" />
      <MasterIcon size={48} className="text-blue-500" />
    </div>
  ),
};
```

---

## 8. トラブルシューティング

### 問題1: currentColorが効かない

**症状**: アイコンの色が親要素の `text-*` クラスを継承しない

**原因**: SVG内に固定色（`stroke="#3B82F6"`）が残っている

**解決策**:
```tsx
// ❌ 悪い例
<path stroke="#3B82F6" d="..." />

// ✅ 良い例
<path d="..." />  // IconBaseがstroke="currentColor"を自動設定
```

### 問題2: Tree-shakingが効かない

**症状**: 未使用アイコンがバンドルに含まれる

**原因**: lucide-reactから `* as Icons` で一括インポート

**解決策**:
```tsx
// ❌ 悪い例
import * as Icons from 'lucide-react';

// ✅ 良い例
export { Play, Settings, Crown } from 'lucide-react';
```

### 問題3: TypeScriptエラー

**症状**: `Property 'aria-label' does not exist on type 'IconProps'`

**原因**: `aria-label` のハイフン区切り属性の型定義ミス

**解決策**:
```tsx
// ✅ 正しい定義
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  'aria-label'?: string;  // シングルクォートで囲む
  'aria-hidden'?: boolean;
}
```

---

**ガイド終了**

IconBaseの実装完了後、必ず以下を実行してください：
1. ユニットテスト実行（`npm test icon-base.test.tsx`）
2. Storybookで視覚確認（`npm run storybook`）
3. Lighthouse Accessibilityテスト（目標 ≥ 95）

不明点があれば、[アイコン統合要件定義書](./icon_integration_requirements.md)を参照してください。
