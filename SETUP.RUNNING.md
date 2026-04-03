# 運用手順書

初回セットアップは [SETUP.md](./SETUP.md) を参照してください。ここでは日常運用で使う操作だけをまとめています。

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
npm run build
cd ..
firebase deploy --only functions
```

`scripts/deploy-functions.sh` は `FIREBASE_PROJECT_ID` と `FIREBASE_FUNCTIONS_REGION` を優先して使います。

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
firebase deploy --only hosting:website
```

## 5. TiDB 運用

### 初期化

- USER DB に `db/core/tidb-create.sql`
- ADMIN DB に `db/core/tidb-create.sql`
- ADMIN DB に `db/core/tidb-seed.sql`
- optional 機能を使う場合だけ `db/optional/tidb-create.sql` と `db/optional/tidb-seed.sql`

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
