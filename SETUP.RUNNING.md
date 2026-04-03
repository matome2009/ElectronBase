# 運用手順書

このドキュメントは、初回セットアップ完了後の日常運用で使う操作をまとめたものです。
新規案件の立ち上げ、env 作成、TiDB 初期化、初回管理者作成は [SETUP.md](./SETUP.md) を先に実施してください。

## 0. このドキュメントの前提

- `template:bootstrap` が完了している
- Firebase project と env 設定が完了している
- `db/core/tidb-create.sql` と `db/core/tidb-seed.sql` の適用が終わっている
- 初回管理者アカウントの作成が終わっている
- `frontend` `admin` `functions` がローカル起動できている

## 1. Firebase / GCP

### 必要な有効化

- Authentication
- Realtime Database
- Hosting
- Functions

### 推奨プロバイダ

- Google
- 匿名認証
- カスタム認証

### CLI

```bash
firebase login
firebase use <project-id>
firebase projects:list
```

## 2. Realtime Database

ルールを更新したら `database.rules.json` をデプロイします。

```bash
firebase deploy --only database
```

編集元として `db/realtime-db-rules.json` を使う場合は、反映内容を確認してから `database.rules.json` に同期してください。

## 3. Functions デプロイ

```bash
cd functions
npm install
npm run sync:env:dev
npm run build
cd ..
firebase deploy --only functions
```

`scripts/deploy-functions.sh` は対象に応じて `.env.dev` / `.env.prd` を使い、実行前に対応する設定から `functions/.env` を同期します。

## 4. Hosting デプロイ

### admin

```bash
cd admin
npm install
npm run build:dev
cd ..
firebase deploy --only hosting:admin-dev
```

```bash
cd admin
npm install
npm run build:prd
cd ..
firebase deploy --only hosting:admin-prd
```

### desktop web build

```bash
cd frontend
npm install
npm run build:web:dev
cd ..
firebase deploy --only hosting:dev
```

```bash
cd frontend
npm install
npm run build:web:prd
cd ..
firebase deploy --only hosting:prd
```

### website

`website/` を使う場合だけデプロイします。

```bash
npm run env:sync:website
firebase deploy --only hosting:website
```

## 5. TiDB 運用

### 初期化について

初回の schema / seed 適用は [SETUP.md](./SETUP.md) の「4. TiDB 初期化」を参照してください。ここでは運用中の管理者追加と管理 DB の用途だけを扱います。

### 管理者追加・再発行

```bash
npm run template:admin-user -- --email admin@example.com --password change-me --level admin
```

生成された SQL を `admin_users` へ適用します。

### 管理DBの主な用途

- `platform_versions`
- `maintenance_m`
- `information_m`
- `admin_users`

## 6. デスクトップビルド

### Windows

```bash
cd frontend
npm run build:win
```

Microsoft Store 向け AppX は PowerShell スクリプトからパスを差し替えられます。

```powershell
.\scripts\build-win-appx.ps1 -Environment prd -WslRoot \\wsl$\Ubuntu\home\user\project
```

### macOS

```bash
cd frontend
npm run build:mac
```

### Linux

```bash
cd frontend
npm run build:linux
```

Snap を使う場合:

```bash
cd frontend
npm run build:snap:dev
```

## 7. バージョン管理

管理画面から `platform_versions` を更新すると、desktop 側の更新判定に反映されます。強制更新を入れたい場合は、Functions 側と画面側で使っているバージョン判定ルールを合わせて運用してください。

## 8. 管理者認証

管理者 API は Firebase トークンだけでなく、custom claim の `admin` / `adminLevel` / `env` を使って判定します。管理画面ログインは `admin_users` を通し、`delete_flg = 0` のアカウントだけが有効です。

## 9. CI

`.github/workflows/template-validation.yml` で以下を自動検証します。

- `frontend`: typecheck / test
- `admin`: typecheck / build:prd
- `functions`: build / test
