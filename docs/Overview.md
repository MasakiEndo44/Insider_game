# インサイダーゲーム オンライン対戦版 - プロジェクト概要

**プロジェクト名**: Insider Game Online
**バージョン**: 0.1.0 (Phase 1 MVP)
**最終更新**: 2025-10-20

---

## 📖 プロジェクト概要

### ビジョン
オインクゲームズの「インサイダーゲーム」をオンライン対戦可能なWebアプリケーションとして実装し、リモート環境でも友人・知人とスムーズに遊べる体験を提供する。

### 目的
1. **リモートプレイ実現**: 物理的に離れた場所でもゲームを楽しめる
2. **低遅延コミュニケーション**: Supabase Realtimeで即座にプレイヤー状態を同期
3. **アクセシビリティ重視**: WCAG 2.1 AA/AAA準拠で誰でも遊べる設計
4. **技術力の証明**: 最新技術スタックによる実装ポートフォリオ

---

## 🎮 ゲーム仕様

### ゲームルール
**インサイダーゲーム**は、クイズ×正体隠匿型の対話ゲームです。

#### 役職
- **マスター** (1人): お題を知っており、質問に答える
- **インサイダー** (1人): お題を知っているが、市民のフリをする正体隠匿役
- **市民** (残り全員): お題を推理し、インサイダーを見破る

#### ゲームフロー (9フェーズ)
1. **WAITING_FOR_PLAYERS**: プレイヤー待機 (4-8人)
2. **ROLE_ASSIGNMENT**: 役職割り当て
3. **THEME_SELECTION**: マスターがお題選択
4. **DISCUSSION**: お題を推理するディスカッション (制限時間あり)
5. **INSIDER_GUESS**: インサイダー推理フェーズ
6. **WORD_GUESS**: お題当てフェーズ
7. **VOTING**: インサイダー候補に投票
8. **RESULT**: 結果発表と役職公開
9. **GAME_END**: 次ゲームor解散選択

### プレイ人数
- **最小**: 4人
- **最大**: 8人
- **推奨**: 5-6人

---

## 🏗️ アーキテクチャ

### 技術スタック

#### フロントエンド
- **Next.js 14.2.18**: App Router (Server Components優先)
- **React 18**: UI構築
- **TypeScript 5**: 型安全性 (Strict Mode)
- **Tailwind CSS 3.4.18**: ユーティリティファーストCSS
- **shadcn/ui**: Radix UI + CVA ベースのコンポーネントライブラリ
- **Lucide React**: アイコン

#### バックエンド
- **Supabase 2.75.1**: BaaS (Backend as a Service)
  - **PostgreSQL 15.8**: リレーショナルDB
  - **Realtime**: WebSocketベースの即時同期
  - **Auth**: 匿名認証 (Anonymous sign-ins)
  - **Row Level Security (RLS)**: データアクセス制御

#### 状態管理
- **XState 5.23.0**: ゲーム状態機械 (9フェーズ管理)
- **Zustand 5.0.8**: グローバル状態管理

#### バリデーション・セキュリティ
- **Zod 4.1.12**: スキーマバリデーション
- **@node-rs/argon2 2.0.2**: パスワードハッシュ (HMAC-SHA256)

#### 開発ツール
- **ESLint 8**: コード静的解析
- **Prettier 3.6.2**: コードフォーマッター
- **Husky 9.1.7**: Git hooks
- **Lint-Staged 16.2.4**: Pre-commit lint
- **Playwright 1.56.1**: E2Eテスト

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                     User Browser                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Next.js 14 App Router (SSR/CSR)         │   │
│  │  ┌──────────────┐  ┌──────────────────────┐    │   │
│  │  │ Lobby Page   │  │ Room Pages           │    │   │
│  │  │ (Static)     │  │ (Dynamic [roomId])   │    │   │
│  │  └──────────────┘  └──────────────────────┘    │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │       shadcn/ui Components               │  │   │
│  │  │  (Button, Dialog, Card, Input, Select)   │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌──────────────┐  ┌──────────────────────┐    │   │
│  │  │ XState       │  │ Zustand              │    │   │
│  │  │ (Game Logic) │  │ (Global State)       │    │   │
│  │  └──────────────┘  └──────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS/WSS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Platform                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │            PostgreSQL 15.8 Database             │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ Tables (9):                             │   │   │
│  │  │ • users, rooms, room_participants       │   │   │
│  │  │ • games, game_roles, themes             │   │   │
│  │  │ • messages, votes, game_results         │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                  │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ Row Level Security (RLS)                │   │   │
│  │  │ • Room access control by passphrase     │   │   │
│  │  │ • Game data isolation by room           │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Realtime (WebSocket Server)            │   │
│  │  • Presence Tracking (Player join/leave)        │   │
│  │  • Broadcast (Chat messages)                    │   │
│  │  • Channel per room (`room:${roomId}`)          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Auth (Anonymous Sign-ins)              │   │
│  │  • No email/password required                   │   │
│  │  • UUID-based session management                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 ディレクトリ構造

```
Insider_game/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main lobby (WCAG AAA)
│   └── room/[roomId]/          # Dynamic room routes
│       ├── layout.tsx          # Room layout + RoomProvider
│       ├── page.tsx            # Waiting room (4-8 players)
│       └── play/
│           └── page.tsx        # Game page (9 phases)
│
├── components/
│   └── ui/                     # shadcn/ui components
│       ├── button.tsx          # 6 variants (default, outline, ghost, etc.)
│       ├── card.tsx            # Room display
│       ├── dialog.tsx          # Modal (Radix UI)
│       ├── input.tsx           # Form input
│       ├── label.tsx           # Accessible label
│       └── select.tsx          # Dropdown select
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Client-side Supabase instance
│   │   └── server.ts           # Server-side Supabase instance
│   └── utils.ts                # cn() utility (tailwind-merge)
│
├── providers/
│   └── RoomProvider.tsx        # Realtime presence context
│
├── supabase/
│   ├── config.toml             # Supabase Local config
│   └── migrations/             # Database migrations (TBD)
│
├── docs/
│   ├── output/                 # Generated specifications
│   │   ├── system_requirements.md
│   │   ├── technical_specification.md
│   │   ├── database_design.md
│   │   ├── development_roadmap.md
│   │   └── phase1_implementation_plan.md
│   ├── CONTRAST_ANALYSIS.md    # Accessibility analysis
│   ├── implementation_analysis_report.md
│   ├── Status.md               # Current status
│   └── Overview.md             # This file
│
├── .env.example                # Environment variables template
├── .env.local                  # Local environment (gitignored)
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config (strict mode)
├── tailwind.config.ts          # Tailwind CSS config
├── next.config.mjs             # Next.js config + security headers
└── README.md                   # Setup instructions
```

---

## 🚀 開発フェーズ

### Phase 1: MVP開発 (5週間) 🔄 進行中

#### Week 1: 基盤構築 (60% 完了)
- ✅ Day 1: プロジェクト初期化
- ✅ Day 2: Supabase Local セットアップ
- ✅ Day 3: UI基盤実装
- ⏳ Day 4: データベース実装
- ⏳ Day 5: XState状態管理

#### Week 2: コア機能実装
- Day 6-7: ルーム作成・参加機能
- Day 8-9: 役職割り当て・テーマ選択
- Day 10: ディスカッション機能

#### Week 3: ゲームロジック実装
- Day 11-12: 投票・推理機能
- Day 13-14: 結果判定ロジック
- Day 15: エラーハンドリング

#### Week 4: テスト・最適化
- Day 16-17: Unit Tests
- Day 18-19: E2E Tests (Playwright)
- Day 20: パフォーマンス最適化

#### Week 5: デプロイ準備
- Day 21-22: Vercel デプロイ設定
- Day 23-24: Supabase Production 設定
- Day 25: リリース前チェック

### Phase 2: 機能拡張 (3週間) ⏳ 未開始
- ユーザー登録・ログイン
- フレンドシステム
- ランキング機能
- リプレイ保存

### Phase 3: 運用・改善 (継続) ⏳ 未開始
- モニタリング・ログ分析
- パフォーマンスチューニング
- ユーザーフィードバック対応

---

## 📊 現在の実装状況

### 完了済み機能
1. **プロジェクト基盤** ✅
   - Next.js 14 + TypeScript Strict Mode
   - ESLint + Prettier設定
   - Git + Conventional Commits

2. **Supabase環境** ✅
   - PostgreSQL 15.8 (Docker)
   - Realtime WebSocket
   - Anonymous Auth
   - 開発環境構築完了

3. **UI基盤** ✅
   - shadcn/ui統合 (6コンポーネント)
   - WCAG 2.1 AA/AAA準拠
   - メインロビーページ
   - 待機室ページ
   - ゲームページ (9フェーズUI)
   - Realtime Presence tracking

### 実装中機能
- ⏳ データベーススキーマ (9テーブル)
- ⏳ XState状態機械 (9フェーズ遷移)
- ⏳ Zodバリデーション

### 未実装機能
- ❌ ルーム作成・参加ロジック (UIのみ)
- ❌ 役職割り当てロジック
- ❌ テーマ選択ロジック
- ❌ ディスカッションチャット
- ❌ 投票・推理判定
- ❌ 結果計算
- ❌ テストコード

---

## 🎯 成果物

### アプリケーション
- **メインロビー**: http://localhost:3000
- **待機室**: http://localhost:3000/room/[roomId]
- **ゲーム画面**: http://localhost:3000/room/[roomId]/play

### 管理ツール
- **Supabase Studio**: http://localhost:54323
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres

### ドキュメント
- [技術仕様書](output/technical_specification.md)
- [データベース設計](output/database_design.md)
- [実装計画](output/phase1_implementation_plan.md)
- [開発ロードマップ](output/development_roadmap.md)
- [アクセシビリティ分析](CONTRAST_ANALYSIS.md)
- [実装分析レポート](implementation_analysis_report.md)
- [ステータス](Status.md)

---

## 🛠️ セットアップ手順

### 前提条件
- Node.js 20+
- Docker Desktop
- Supabase CLI 2.51.0+

### インストール
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd Insider_game

# 2. 依存関係インストール
npm install

# 3. Docker Desktop起動

# 4. Supabase Local起動
supabase start

# 5. 環境変数設定
cp .env.example .env.local
# .env.localにSupabase URLとAnon Keyを設定

# 6. 開発サーバー起動
npm run dev
```

### アクセス
- **アプリ**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323

---

## 📈 品質指標

### コード品質
| メトリクス | 現在値 | 目標値 | 状態 |
|---------|-------|-------|-----|
| TypeScript Strict Mode | ✅ | ✅ | 達成 |
| ESLint Errors | 0 | 0 | 達成 |
| Build Success | 100% | 100% | 達成 |
| Test Coverage | 0% | 80%+ | 未達 |
| Lighthouse Score | TBD | 90+ | 未測定 |

### アクセシビリティ
| 項目 | 現在値 | 基準 | 状態 |
|-----|-------|-----|-----|
| WCAG準拠レベル | AA/AAA | AA | 達成 |
| 最低コントラスト比 | 4.62:1 | 4.5:1 | 達成 |
| キーボード操作 | ✅ | ✅ | 達成 |
| スクリーンリーダー | ✅ | ✅ | 達成 |

### パフォーマンス
| ページ | First Load JS | 目標 | 状態 |
|-------|--------------|------|-----|
| メインロビー | 108 kB | <150 kB | 良好 |
| 待機室 | 147 kB | <150 kB | 許容範囲 |
| ゲーム画面 | 147 kB | <150 kB | 許容範囲 |

---

## 🔐 セキュリティ

### 実装済み対策
- ✅ 環境変数の秘匿化 (`.env.local` gitignore)
- ✅ HMAC-SHA256によるパスフレーズハッシュ
- ✅ CSRFトークン (Supabase Auth内蔵)
- ✅ XSS対策 (React標準エスケープ)
- ✅ セキュリティヘッダー (next.config.mjs)

### 実装予定対策
- ⏳ Row Level Security (RLS) ポリシー
- ⏳ Input Sanitization (Zod)
- ⏳ Rate Limiting
- ⏳ Argon2パスワードハッシュ (ユーザー登録時)

---

## 📞 サポート・連絡先

### プロジェクトメンバー
- **開発者**: [Your Name]
- **AI Assistant**: Claude Code (SuperClaude Framework)

### 技術サポート
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com

### 課題管理
- GitHub Issues (TBD)

---

## 📄 ライセンス

Private Project (非公開)

---

## 🔄 更新履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-18 | 0.1.0 | プロジェクト初期化 |
| 2025-10-19 | 0.1.0 | Supabase Local セットアップ完了 |
| 2025-10-20 | 0.1.0 | UI基盤実装完了 (Week 1 Day 3) |

---

**次回更新予定**: Day 4完了時 (2025-10-21)
**ドキュメント管理**: Claude Code (SuperClaude Framework)
