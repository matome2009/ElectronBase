# セットアップガイド

このテンプレートを新規案件へ流用するための初期設定手順です。

## 前提条件

- Node.js 20 以上
- npm 9 以上
- Rust / Cargo
- Firebase CLI
- TiDB に接続できるクライアント

```bash
npm install -g firebase-tools
```

## 1. テンプレート値の反映

```bash
cp template.config.example.json template.config.json
npm run template:bootstrap
```

`template.config.json` には少なくとも以下を入れてください。

- アプリ名
- アプリ説明
- bundle identifier
- Admin Console URL
- Firebase project ID
- Functions region
- WalletConnect project ID

## 2. Firebase 設定

Firebase Console で次を有効化します。

- Authentication
- Realtime Database
- Hosting
- Functions

Authentication では次を有効化します。

- Google
- 匿名認証
- カスタム認証

必要に応じて Firebase CLI でログインします。

```bash
firebase login
firebase use <your-firebase-project-id>
```

## 3. 環境変数ファイル作成

```bash
cp frontend/.env.example frontend/.env.development
cp frontend/.env.example frontend/.env.production
cp admin/.env.example admin/.env.development
cp admin/.env.example admin/.env.production
cp functions/.env.example functions/.env
```

最低限ここは設定します。

### frontend

- `VITE_FIREBASE_*`
- `VITE_FUNCTIONS_REGION`
- `VITE_FUNCTIONS_PROJECT_ID`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_ADMIN_CONSOLE_URL`
- `VITE_ENABLE_*`

### admin

- `VITE_FIREBASE_*`
- `VITE_FUNCTIONS_REGION`
- `VITE_FUNCTIONS_PROJECT_ID`

### functions

- `FIREBASE_DATABASE_URL`
- `TIDB_*`
- `GOOGLE_CLIENT_ID_DESKTOP`
- `GOOGLE_CLIENT_SECRET_DESKTOP`
- `STRIPE_*`（使う場合）
- `ENABLE_*_API`

optional API を使う場合は、frontend と functions の flag を対で揃えます。

- Billing: `VITE_ENABLE_BILLING=true` + `ENABLE_BILLING_API=true`
- Watched Wallets: `VITE_ENABLE_WATCHED_WALLETS=true` + `ENABLE_WALLET_API=true`
- Transactions: `VITE_ENABLE_TRANSACTIONS=true` + `ENABLE_TRANSACTION_API=true`
- Contacts: `VITE_ENABLE_CONTACTS=true` + `ENABLE_CONTACT_API=true`
- Labels: `VITE_ENABLE_LABELS=true` + `ENABLE_LABEL_API=true`

## 4. TiDB 初期化

USER DB と ADMIN DB を用意して、まず `db/core/tidb-create.sql` を適用します。

```bash
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY -D dev < db/core/tidb-create.sql
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY -D dev_admin < db/core/tidb-create.sql
```

次に ADMIN DB へ seed を入れます。

```bash
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY -D dev_admin < db/core/tidb-seed.sql
```

optional 機能を使う場合だけ、追加で以下を適用します。

```bash
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY -D dev < db/optional/tidb-create.sql
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY -D dev_admin < db/optional/tidb-create.sql
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY -D dev_admin < db/optional/tidb-seed.sql
```

管理者アカウントの INSERT 文はスクリプトで生成できます。

```bash
npm run template:admin-user -- --email admin@example.com --password change-me --level admin
```

## 5. 依存パッケージのインストール

```bash
cd frontend && npm install && cd ..
cd admin && npm install && cd ..
cd functions && npm install && cd ..
```

## 6. ローカル起動

### desktop

```bash
cd frontend
npm run dev
```

### admin

```bash
cd admin
npm run dev
```

### functions

```bash
cd functions
npm run build
firebase emulators:start --only functions,database
```

## 7. テストと型チェック

### frontend

```bash
cd frontend
npm run test
npm run typecheck
```

### functions

```bash
cd functions
npm test
npm run build
```

GitHub Actions では `.github/workflows/template-validation.yml` で同じ検証を自動実行します。

## 8. ビルド

### desktop

```bash
cd frontend
npm run build:win
npm run build:mac
npm run build:linux
```

### admin

```bash
cd admin
npm run build:dev
npm run build:prd
```

詳しい運用手順は [SETUP.RUNNING.md](./SETUP.RUNNING.md) を参照してください。
