# Tauri App Base Template

`desktop + admin + Firebase Functions + TiDB` をまとめて持つ、業務アプリ向けの Tauri テンプレートです。Google ログイン、WalletConnect ログイン、管理画面、バージョン管理、メンテナンス告知、お知らせ管理を標準搭載しています。

## 標準搭載

- Tauri + React + TypeScript デスクトップアプリ
- Firebase Authentication（Google / Custom Token）
- WalletConnect ログイン
- Firebase Functions
- TiDB 接続基盤
- 管理画面（Admin）
- バージョン管理
- メンテナンス管理
- お知らせ管理
- Firebase Realtime Database 連携

## テンプレートとして使う流れ

1. `cp template.config.example.json template.config.json`
2. `template.config.json` を案件用に編集
3. `npm run template:bootstrap`
4. `TEMPLATE.md` と `SETUP.md` を見ながら `.env.dev` / `.env.prd` と DB を設定
5. `db/core/tidb-create.sql` と `db/core/tidb-seed.sql` を適用
6. 必要なら `db/optional/tidb-create.sql` と `db/optional/tidb-seed.sql` を適用
7. `npm run template:admin-user -- --email admin@example.com --password change-me`

詳しい初期化手順は [TEMPLATE.md](./TEMPLATE.md) を参照してください。

## ディレクトリ構成

```text
project-root/
├── frontend/   # Tauri デスクトップアプリ
│   └── src/renderer/
│       ├── views/      # core 画面
│       └── optional/   # optional 機能群
├── admin/      # 管理画面
├── functions/  # Firebase Functions
├── db/         # TiDB / Realtime DB 定義
├── scripts/    # bootstrap / deploy 補助スクリプト
└── website/    # 任意の静的サイト
```

## 主要ファイル

- `template.config.example.json`: 案件ごとの初期設定ひな形
- `scripts/bootstrap-template.mjs`: アプリ名や Firebase 設定の一括反映
- `scripts/generate-admin-user-sql.mjs`: 初回管理者作成 SQL 生成
- `db/tidb-create.sql`: TiDB テーブル定義
- `db/tidb-seed.sql`: 管理画面向け初期データ
- `db/core/`: core 用の TiDB スキーマ / seed
- `db/optional/`: optional 用の TiDB スキーマ / seed

## 環境変数

基本はリポジトリ直下の `.env.example` を `.env.dev` と `.env.prd` にコピーして使います。

```bash
cp .env.example .env.dev
cp .env.example .env.prd
npm run env:sync:functions:dev
```

`frontend` と `admin` は build / dev の種類に応じて `.env.dev` または `.env.prd` を読みます。`functions/.env` は選ばれたルート env から自動生成します。
静的 `website` を使う場合は `npm run env:sync:website:dev` または `npm run env:sync:website:prd` で `website/js/firebaseConfig.js` を生成できます。
Google Cloud の Service Account は `GOOGLE_APPLICATION_CREDENTIALS` にパスを入れるか、`GOOGLE_APPLICATION_CREDENTIALS_JSON` / `GOOGLE_APPLICATION_CREDENTIALS_BASE64` に直接入れられます。
Functions は `.env.dev` / `.env.prd` を切り替えて別ビルドでデプロイします。TiDB や Stripe の env 変数は `*_DEV` / `*_PRD` ではなく素の名前を使ってください。

WalletConnect は標準搭載のままなので、ルート `.env.dev` / `.env.prd` の `VITE_WALLETCONNECT_PROJECT_ID` を設定してください。
optional 機能は `VITE_ENABLE_BILLING` などの feature flag で有効化できます。Functions 側も `ENABLE_*_API` を合わせて設定してください。

## Functions API 構成

### core APIs

- Auth: `getNonce` `verifyWalletConnect` `verifyGoogleToken` `verifyLineToken` `verifyAppleToken` `startAsGuest` `linkLogin` `exchangeGoogleAuthCode` `linkGoogleAuthCode`
- Public/Admin Core: `getVersions` `getMaintenance` `getMaintenanceAll` `getInformation`
- Admin Core: `adminLogin` `upsertVersion` `deleteVersion` `upsertMaintenance` `deleteMaintenance` `getExcludeUsers` `addExcludeUser` `deleteExcludeUser` `getInformationAll` `upsertInformation` `deleteInformation`

### optional APIs

- Billing: `getPlanStatus` `createPlanCheckout` `verifyPlanPayment` `getBillingPlans` `upsertBillingPlan` `deleteBillingPlan` `stripeWebhook`
  Required flags: `VITE_ENABLE_BILLING=true` and `ENABLE_BILLING_API=true`
- Watched Wallets: `addWatchedWallet` `getWatchedWallets` `deleteWatchedWallet` `toggleWatchedWallet` `updateWalletLabel`
  Required flags: `VITE_ENABLE_WATCHED_WALLETS=true` and `ENABLE_WALLET_API=true`
- Transactions: `getTransactions` `getUserTransactionDeltas` `syncTransactions` `updateTransactionState` `backfillBlockTimestamps` `rpcHealthCheck`
  Required flags: `VITE_ENABLE_TRANSACTIONS=true` and `ENABLE_TRANSACTION_API=true`
- Contacts: `getContacts` `addContact` `updateContact` `deleteContact`
  Required flags: `VITE_ENABLE_CONTACTS=true` and `ENABLE_CONTACT_API=true`
- Labels: `getLabels` `createLabel` `updateLabel` `deleteLabel` `assignLabel` `removeLabel`
  Required flags: `VITE_ENABLE_LABELS=true` and `ENABLE_LABEL_API=true`

`frontend/vite.functions.ts` は上の `VITE_ENABLE_*` が `false` の optional API について、dev server の proxy 自体を出しません。

## 開発コマンド

```bash
# desktop
cd frontend
npm install
npm run dev

# admin
cd admin
npm install
npm run dev

# functions
cd functions
npm install
npm run build
```

## 補足

- 業務固有の機能は `frontend/src/renderer/views` や `services` から段階的に切り離して、案件ごとに差し替える運用を想定しています。
- optional 機能は `frontend/src/renderer/optional/` にまとめ、`MainLayout` から lazy import しています。
- `website/` は任意です。不要ならテンプレ利用時に外せます。
- CI は [template-validation.yml](./.github/workflows/template-validation.yml) で `frontend / admin / functions` を自動検証します。
