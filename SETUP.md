# セットアップガイド

このドキュメントは、新規案件としてテンプレートを立ち上げるときの初回セットアップ手順です。
日常運用、再デプロイ、リリース作業は [SETUP.RUNNING.md](./SETUP.RUNNING.md) を参照してください。

## 前提条件

- Node.js 20 以上
- npm 9 以上
- Rust / Cargo
- Firebase CLI
- TiDB に接続できるクライアント

```bash
npm install -g firebase-tools
```

## 最短で core-only 起動する手順

まずは optional 機能をすべて OFF にして、core だけで起動確認するのをおすすめします。新規案件では次の順番で進めると詰まりにくいです。

1. `template.config.json` を作って `npm run template:bootstrap` を実行する
2. Firebase プロジェクトを用意して Authentication / Realtime Database / Hosting / Functions を有効化する
3. `frontend` `admin` `functions` の env を作成し、`VITE_ENABLE_*` と `ENABLE_*_API` をすべて `false` のままにする
4. `db/core/tidb-create.sql` と `db/core/tidb-seed.sql` を適用し、`npm run template:admin-user` で初回管理者アカウントを作成する
5. `frontend` `admin` `functions` の依存パッケージをインストールする
6. `functions` `admin` `frontend` をローカル起動して、Sign in / Dashboard / Settings / Admin の core 導線だけで動作確認する
7. core が安定したあとで、必要な optional 機能だけ flag と SQL を追加する

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

新規案件の初回確認では、まず core-only 構成にします。optional 機能の flag は全部 `false` のままで構いません。

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

core-only の起動確認だけなら、上の optional 用 flag はすべて `false` のままで進めます。

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

新規案件の初回確認は、optional をすべて OFF にした core-only 構成で進めます。

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

### 初回確認のポイント

- desktop の Sign in 画面に Google ログインと WalletConnect ログインの導線が出る
- desktop 側の初期画面が `Dashboard` と `Settings` 中心になっていて、optional メニューが出ていない
- admin 側で初回管理者アカウントでログインできる
- version / maintenance / information の管理導線が開ける

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
