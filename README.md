# アプリ

クロスプラットフォーム対応のWeb3給与支払い管理デスクトップアプリケーション

## 概要

Web3 Payroll Guardianは、ブロックチェーン上での給与支払いを安全かつ効率的に管理するためのデスクトップアプリケーションです。Electron + React + TypeScriptで構築されており、Windows、Mac、Linuxで動作します。

## 主な機能

- **ウォレット接続**
  - WalletConnect (QRコード) - モバイルウォレット対応
  - 秘密鍵入力 - テスト用アカウント対応

- **CSV一括インポート**
  - 給与データのCSVインポート
  - 重複検出と検証
  - テンプレートダウンロード

- **セッション管理**
  - 支払いセッションの作成・編集・削除
  - フィルタリングと検索
  - 統計情報の表示

- **ネットワーク・トークン設定**
  - 10種類のネットワーク対応（メインネット5 + テストネット5）
  - カスタムトークンの追加・編集・削除
  - デフォルト設定へのリセット

- **ブロックチェーン機能**
  - ERC20トークン送金
  - 残高確認
  - トランザクション履歴チェック
  - バッチ処理（100件ずつ分割）

## 対応ネットワーク

### メインネット
- Ethereum (Chain ID: 1)
- Polygon (Chain ID: 137)
- Arbitrum One (Chain ID: 42161)
- Optimism (Chain ID: 10)
- BSC (Chain ID: 56)

### テストネット
- Ethereum Sepolia (Chain ID: 11155111)
- Polygon Amoy (Chain ID: 80002)
- Arbitrum Sepolia (Chain ID: 421614)
- Optimism Sepolia (Chain ID: 11155420)
- BSC Testnet (Chain ID: 97)

## 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **デスクトップ**: Electron
- **ビルドツール**: Vite + electron-vite
- **スタイリング**: TailwindCSS
- **Web3**: wagmi + viem + Web3Modal v3
- **認証**: Firebase Authentication
- **バックエンド**: Firebase Cloud Functions (Node.js 20)
- **リモートDB**: TiDB（MySQL互換）
- **リアルタイムDB**: Firebase Realtime Database（補助）
- **ローカルDB**: IndexedDB
- **課金**: Stripe

## セットアップ

### 必要要件
- Node.js 18以上
- npm または yarn

詳細は [SETUP.md](./SETUP.md) を参照してください。

### フロントエンド

```bash
cd frontend
npm install
npm run dev        # 開発モード
npm run build:win  # Windows (.exe)
npm run build:mac  # Mac (.dmg)
npm run build:linux # Linux (.AppImage)
```

### Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## プロジェクト構造

```
ElectronBase/
├── frontend/           # Electron アプリ（React）
│   └── src/
│       ├── main/       # Electron メインプロセス
│       ├── preload/    # Preload スクリプト
│       └── renderer/   # React アプリケーション
│           ├── components/  # UI コンポーネント
│           ├── services/    # ビジネスロジック
│           ├── hooks/       # カスタムフック
│           ├── config/      # Web3設定
│           └── types/       # TypeScript型定義
├── functions/          # Firebase Cloud Functions
├── admin/              # 管理ダッシュボード（React）
├── db/                 # DB スキーマ・ルール
└── firebase.json       # Firebase 設定
```

## Git 除外済み設定ファイル

> これらのファイルは `.gitignore` により追跡されません。
> 各 `.env.example` をコピーして値を設定してください。

| ファイル | テンプレート | 説明 |
|--------|------------|------|
| `frontend/.env.development` | `frontend/.env.example` | フロントエンド開発環境の環境変数 |
| `frontend/.env.production` | `frontend/.env.example` | フロントエンド本番環境の環境変数 |
| `functions/.env` | `functions/.env.example` | Cloud Functions の環境変数（TiDB・Resend・Stripe） |
| `admin/.env.development` | `admin/.env.example` | 管理画面開発環境の環境変数 |
| `admin/.env.production` | `admin/.env.example` | 管理画面本番環境の環境変数 |
| `service-account.json` | — | Firebase Admin SDK サービスアカウントキー（Firebase コンソールから取得） |

セットアップ時は以下のコマンドで一括コピーできます:

```bash
cp frontend/.env.example frontend/.env.development
cp frontend/.env.example frontend/.env.production
cp functions/.env.example functions/.env
cp admin/.env.example    admin/.env.development
cp admin/.env.example    admin/.env.production
```

---

## 設定ファイル一覧

### ルートレベル

| ファイル | 用途 |
|--------|------|
| `firebase.json` | Firebase デプロイ設定。hosting ターゲット（dev/prd/admin-dev/admin-prd）、Cloud Functions のランタイム（Node.js 20）、API→Functions のリライトルールを定義 |
| `.firebaserc` | Firebase プロジェクトエイリアス。デフォルトプロジェクト `token-batch-transfer` と hosting ターゲットのマッピングを管理 |
| `database.rules.json` | Realtime Database セキュリティルール（デプロイ用）。アクセス制御・nonce 管理・billing/points のインデックス設定を含む |
| `db/realtime-db-rules.json` | 上記ルールの編集元ソースファイル |
| `db/tidb-create.sql` | TiDB テーブル定義（CREATE文） |
| `db/realtime-db-schema.md` | Realtime DB スキーマ定義ドキュメント |

---

### フロントエンド（`frontend/`）

| ファイル | 用途 |
|--------|------|
| `.env.example` | 環境変数テンプレート。実際の値を `.env.development` / `.env.production` にコピーして設定する |
| `.env.development` | 開発環境の環境変数（`.gitignore` 対象） |
| `.env.production` | 本番環境の環境変数（`.gitignore` 対象） |
| `electron.vite.config.ts` | Electron アプリのビルド設定。メインプロセス・preload・React レンダラーの出力先、Vite エイリアス（`@`）、dev サーバープロキシを定義 |
| `vite.web.config.ts` | Firebase Hosting 向け Web ビルド用の Vite 設定（Electron なしで renderer のみデプロイする場合に使用） |
| `vitest.config.ts` | Vitest（ユニットテスト）設定。jsdom 環境・グローバル API・パスエイリアスを設定 |
| `tsconfig.json` | レンダラーコードの TypeScript コンパイラ設定（ES2020・strict・React JSX） |
| `tsconfig.node.json` | ビルドスクリプト（electron-vite）向け TypeScript 設定 |
| `tailwind.config.js` | Tailwind CSS 設定。renderer/src 配下のファイルをスキャンしてクラスを生成 |
| `postcss.config.js` | PostCSS 設定。Tailwind CSS と Autoprefixer を有効化 |

#### フロントエンド 環境変数（`.env.example` より）

| 変数名 | 説明 |
|-------|------|
| `VITE_ENV` | 環境識別子（`development` / `production`）。LoggingService のログレベル切り替えに使用 |
| `VITE_FIREBASE_API_KEY` 等 | Firebase プロジェクト設定（Firebase コンソールから取得） |
| `VITE_DB_ROOT` | Realtime DB のルートパス（`dev` / `prd`） |
| `VITE_CLOUD_FUNCTIONS_URL` | Cloud Functions のベース URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe 公開キー |

---

### Cloud Functions（`functions/`）

| ファイル | 用途 |
|--------|------|
| `.env.example` | 環境変数テンプレート。実際の値を `.env` にコピーして設定する |
| `.env` | Cloud Functions の環境変数（`.gitignore` 対象） |
| `tsconfig.json` | Cloud Functions の TypeScript 設定（ES2017・CommonJS・Node.js 20 互換） |
| `jest.config.js` | Jest（ユニットテスト）設定 |
| `master-data-dev.json` | 開発環境用マスターデータのシードファイル |

#### Cloud Functions 環境変数（`.env.example` より）

| 変数名 | 説明 |
|-------|------|
| `TIDB_HOST_DEV` / `TIDB_HOST_PRD` | TiDB ホスト（dev/prd） |
| `TIDB_USER` / `TIDB_PASSWORD` | TiDB 接続認証情報 |
| `TIDB_DATABASE_DEV` / `TIDB_DATABASE_PRD` | TiDB データベース名（dev/prd） |
| `SMTP_HOST` 等 | メール送信用 SMTP 設定 |
| `STRIPE_SECRET_KEY_DEV` / `STRIPE_SECRET_KEY_PRD` | Stripe シークレットキー（dev/prd） |
| `STRIPE_WEBHOOK_SECRET_DEV` / `STRIPE_WEBHOOK_SECRET_PRD` | Stripe Webhook 署名シークレット |
| `STRIPE_PRICE_*` | Stripe 料金プラン ID |

---

### 管理ダッシュボード（`admin/`）

| ファイル | 用途 |
|--------|------|
| `.env.example` | 環境変数テンプレート。Firebase 設定・Cloud Functions URL を含む |
| `.env.development` | 開発環境の環境変数（`.gitignore` 対象） |
| `.env.production` | 本番環境の環境変数（`.gitignore` 対象） |
| `vite.config.ts` | Vite ビルド設定（React プラグイン・dist 出力） |
| `tsconfig.json` | TypeScript 設定 |

---

## WalletConnect設定

Project ID: `1deeae95c54f33e5e3f5f3310982191e`

## ライセンス

MIT
