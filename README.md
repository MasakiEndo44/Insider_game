<div align="center">
  <img src="./docs/insider_game_icon.png" alt="Insider Game Icon" width="120" height="120">
  
  # インサイダーゲーム V2
  
  オンラインで遊べる推理ゲーム「インサイダーゲーム」のWebアプリケーション。
</div>

## 📋 プロジェクト概要

マスター、インサイダー、庶民の3つの役職に分かれて遊ぶ推理ゲーム。音声通話（Discord/LINE等）と併用し、ゲームの進行管理とUI表示を担当するWebアプリです。

- **対象人数**: 3〜12人
- **プラットフォーム**: Web（モバイルファースト）
- **開発環境**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4

## 🎮 ゲームの流れ

1. **ルーム作成・参加**: 合言葉を設定してルームを作成、または既存ルームに参加
2. **ロビー**: プレイヤー集合、ゲーム設定（制限時間、お題カテゴリ）
3. **役職配布**: マスター、インサイダー、庶民がランダムに配布される
4. **お題確認**: マスターとインサイダーのみがお題を確認
5. **質問フェーズ**: 庶民がマスターに質問してお題を当てる（制限時間あり）
6. **討論フェーズ**: 誰がインサイダーかを議論
7. **投票フェーズ**: インサイダーを推理して投票
8. **結果発表**: 勝敗判定と役職公開

## 🛠️ 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript 5
- **UI ライブラリ**: React 19
- **スタイリング**: Tailwind CSS 4
- **コンポーネント**: Radix UI (アクセシビリティ対応)
- **アイコン**: Lucide React
- **フォント**: Noto Sans JP

### バックエンド（計画中）
- **データベース**: Supabase (PostgreSQL)
- **リアルタイム通信**: Supabase Realtime
- **サーバーレス関数**: Supabase Edge Functions
- **認証**: Supabase Auth (匿名認証)

### インフラ
- **ホスティング**: Vercel（予定）
- **バージョン管理**: Git & GitHub

## 📂 ディレクトリ構造

```
Insider_game/
├── app-v2/                    # メインアプリケーション (Next.js)
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx          # ホーム画面
│   │   ├── create-room/      # ルーム作成
│   │   ├── join-room/        # ルーム参加
│   │   ├── lobby/            # ロビー
│   │   └── game/             # ゲーム画面群
│   │       ├── role/         # 役職配布
│   │       ├── topic/        # お題確認
│   │       ├── question/     # 質問フェーズ
│   │       ├── debate/       # 討論フェーズ
│   │       ├── vote1/        # 第一投票
│   │       ├── vote2/        # 第二投票
│   │       └── result/       # 結果発表
│   ├── components/           # 共通UIコンポーネント
│   ├── context/              # React Context (状態管理)
│   │   ├── RoomContext.tsx  # ルーム情報・プレイヤー管理
│   │   └── GameContext.tsx  # ゲーム進行・フェーズ管理
│   ├── lib/                  # ユーティリティ・API
│   │   ├── mock-api.ts      # Mock API (開発用)
│   │   └── supabase/        # Supabase クライアント (準備中)
│   └── public/               # 静的ファイル
├── docs/                     # ドキュメント
│   ├── SYSTEM_REQUIREMENTS.md           # システム要件定義
│   ├── DESIGN_REQUIREMENTS.md           # デザイン要件
│   ├── IMPLEMENTATION_PLAN.md           # 実装計画 (Phase 1-6)
│   ├── SUPABASE_MIGRATION_PLAN.md      # Supabase移行計画
│   ├── Status.md                        # 開発ステータス
│   ├── UI_FLOWCHART.md                 # UI遷移図
│   └── SEQUENCE_DIAGRAMS.md            # シーケンス図
├── supabase/                 # Supabase設定 (準備中)
│   ├── functions/            # Edge Functions
│   └── migrations/           # データベーススキーマ
└── front_ui_proto/          # 初期UIプロトタイプ (参考)
```

## ✅ 実装済み機能 (Phase 5 完了)

### UI/UX
- ✅ 全画面の静的UI実装（ホーム、ルーム作成・参加、ロビー、全ゲームフェーズ）
- ✅ モバイルファーストのレスポンシブデザイン
- ✅ ダークモードベースのサイバーパンク風デザイン
- ✅ アニメーション・トランジション効果
- ✅ アクセシビリティ対応（ARIA属性、キーボード操作）
- ✅ 結果画面での詳細情報表示（役職、投票内訳）

### 状態管理
- ✅ React Context API による状態管理
  - `RoomContext`: ルーム情報、プレイヤーリスト、ゲーム設定
  - `GameContext`: ゲームセッション、フェーズ管理、役職、投票
- ✅ URLパラメータからContext経由へのリファクタリング
- ✅ TypeScript型定義の整備

### ゲームロジック (Supabase)
- ✅ ルーム作成・参加・退出
- ✅ プレイヤー管理（参加、退出、準備完了）
- ✅ ゲーム設定（制限時間、お題カテゴリ）
- ✅ 役職のランダム配布（マスター、インサイダー、庶民）
- ✅ お題のランダム選択
- ✅ フェーズ遷移管理（DBトリガーによる自動遷移）
- ✅ タイマー機能
- ✅ 投票システム（第一投票、第二投票、重複防止）
- ✅ 勝敗判定ロジック（DBトリガー）
- ✅ リアルタイムチャット機能（質問・回答）

### バリデーション
- ✅ ルーム作成時の入力チェック
- ✅ ルーム参加時の認証（ルームID、合言葉）
- ✅ ゲーム開始条件（最低人数、準備完了）
- ✅ フェーズ遷移の条件チェック

## 🚧 開発中・計画中の機能

### Phase 6: デプロイ・運用
- 🔲 Vercel へのデプロイ（設定完了、環境変数待ち）
- 🔲 本番環境での動作確認
- 🔲 モニタリング・ロギング設定

### 今後の改善
- 🔲 パフォーマンス最適化
- 🔲 エラーハンドリング強化
- 🔲 ネットワーク切断時の再接続処理
- 🔲 タイマーのサーバーサイド同期

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 20以上
- npm または yarn
- Git

### インストール手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/[your-username]/Insider_game.git
   cd Insider_game
   ```

2. **依存関係のインストール**
   ```bash
   cd app-v2
   npm install
   ```

3. **環境変数の設定**
   ```bash
   cp .env.local.example .env.local
   # .env.local を編集して必要な値を設定
   ```

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

5. **ブラウザでアクセス**
   ```
   http://localhost:3000
   ```

## 📖 ドキュメント

### システム設計
- [システム要件](./docs/SYSTEM_REQUIREMENTS.md) - 機能要件、データモデル、API仕様
- [デザイン要件](./docs/DESIGN_REQUIREMENTS.md) - UIデザイン、カラーシステム、コンポーネント仕様
- [技術仕様書](./docs/technical_specification.md) - アーキテクチャ、技術選定
- [詳細要件定義書](./docs/detailed_requirements_specification.md) - 詳細な機能仕様

### 実装計画
- [実装計画書](./docs/IMPLEMENTATION_PLAN.md) - Phase 1-6 の開発計画
- [Supabase移行計画](./docs/SUPABASE_MIGRATION_PLAN.md) - バックエンド統合の詳細手順
- [Phase 4 MCP計画](./docs/PHASE_4_MCP_PLAN.md) - Supabase MCP活用計画

### 進捗管理
- [開発ステータス](./docs/Status.md) - 現在の実装状況と課題
- [UI遷移図](./docs/UI_FLOWCHART.md) - 画面遷移フロー
- [シーケンス図](./docs/SEQUENCE_DIAGRAMS.md) - 処理フロー

## 🎯 現在の開発状況

**フェーズ**: Phase 3 完了 → Phase 4 準備中

**最終更新**: 2025-11-23

### 完了済み
- ✅ Phase 1: プロジェクト基盤構築
- ✅ Phase 2: 静的UI実装
- ✅ Phase 3: クライアント状態管理（Context API + Mock API）

### 進行中
- 🔄 Phase 4: Supabase統合の計画・準備

### 既知の課題
- シングルプレイヤーでの検証のみ（マルチプレイヤー同期は Phase 4 で実装予定）
- タイマーの厳密な同期は未実装（クライアントサイドのみ）
- Mock API による仮実装（実際のデータ永続化なし）

## 📝 コーディング規約

- **TypeScript**: 厳格な型チェック（`strict: true`）
- **コンポーネント**: 関数コンポーネント + Hooks
- **スタイリング**: Tailwind CSS のユーティリティクラス
- **状態管理**: React Context API
- **命名規則**: 
  - コンポーネント: PascalCase
  - 関数・変数: camelCase
  - 定数: UPPER_SNAKE_CASE
  - ファイル: kebab-case (ページ), PascalCase (コンポーネント)

## 🔄 アーカイブ情報

前バージョン（V1）は以下にアーカイブされています：
- **Tag**: `v1.0.0`
- **Branch**: `archive/v1`

V2 では、アーキテクチャを刷新し、モダンなスタックで再実装しています。

## 📄 ライセンス

このプロジェクトは個人開発プロジェクトです。

## 👤 開発者

- **Masaki Endo** - Initial work

---

**注意**: 現在このアプリケーションは開発中です。本番環境での使用は推奨されません。
