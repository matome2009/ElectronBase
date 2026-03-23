# セットアップガイド

## 前提条件

| ツール | バージョン |
|--------|-----------|
| Node.js | 20.x 以上 |
| npm | 9.x 以上 |
| Firebase CLI | 最新版 |

```bash
npm install -g firebase-tools
```

---

## 1. リポジトリのクローン

```bash
git clone <repository-url>
cd ElectronBase
```

---

## 2. Firebase プロジェクトの設定

### 2-1. Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** を有効化（Google / ウォレット認証 を使用する場合はそれぞれ有効化）
3. **Realtime Database** を有効化し、リージョンを選択
4. **Hosting** を有効化

### 2-2. .firebaserc を更新

```json
{
  "projects": {
    "default": "<your-firebase-project-id>"
  },
  "targets": {
    "<your-firebase-project-id>": {
      "hosting": {
        "dev": ["<your-dev-hosting-site>"],
        "prd": ["<your-prd-hosting-site>"],
        "admin-dev": ["<your-admin-dev-hosting-site>"],
        "admin-prd": ["<your-admin-prd-hosting-site>"],
        "website": ["<your-website-hosting-site>"]
      }
    }
  }
}
```

### 2-3. Firebase CLI でログイン・初期化

```bash
firebase login
firebase use <your-firebase-project-id>
```

### 2-4. Realtime Database セキュリティルールをデプロイ

```bash
firebase deploy --only database
```

---

## 3. TiDB の設定

[TiDB Cloud](https://tidbcloud.com/) でクラスターを作成し、接続情報を取得する。

| 設定項目 | 説明 |
|---------|------|
| TIDB_HOST | クラスターのホスト名（例: `gateway01.ap-northeast-1.prod.aws.tidbcloud.com`） |
| TIDB_PORT | ポート番号（通常: `4000`） |
| TIDB_USER | ユーザー名 |
| TIDB_PASS | パスワード |
| TIDB_DB_DEV | 開発用データベース名 |
| TIDB_DB_ADMIN_DEV | 開発用管理データベース名 |
| TIDB_DB_PRD | 本番用データベース名 |
| TIDB_DB_ADMIN_PRD | 本番用管理データベース名 |

---

## 4. Stripe の設定

[Stripe Dashboard](https://dashboard.stripe.com/) でキーを取得する。

| 設定項目 | 説明 |
|---------|------|
| STRIPE_SECRET_KEY_DEV | テスト用シークレットキー（`sk_test_...`） |
| STRIPE_SECRET_KEY_PRD | 本番用シークレットキー（`sk_live_...`） |
| STRIPE_PRICE_ID_DEV | テスト用従量課金プライスID |
| STRIPE_PRICE_ID_PRD | 本番用従量課金プライスID |
| STRIPE_WEBHOOK_SECRET_DEV | テスト用WebhookシークレットID（`whsec_...`） |
| STRIPE_WEBHOOK_SECRET_PRD | 本番用WebhookシークレットID（`whsec_...`） |
| STRIPE_METER_EVENT_NAME | 従量課金イベント名 |

---

## 5. 環境変数ファイルの設定

### 5-1. frontend（Electron アプリ）

```bash
cp frontend/.env.example frontend/.env.development
cp frontend/.env.example frontend/.env.production
```

`frontend/.env.development` と `frontend/.env.production` を編集し、Firebase の値を設定する。

- Firebase Console → プロジェクト設定 → マイアプリ → SDK の設定と構成 から取得

```env
VITE_ENV=development
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_DB_ROOT=dev
VITE_FUNCTIONS_URL=https://asia-northeast1-your_project.cloudfunctions.net
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

`frontend/.env.production` は `VITE_ENV=production` / `VITE_DB_ROOT=prd` に変更し、本番用 Stripe キーを設定する。

### 5-2. admin（管理ダッシュボード）

```bash
cp admin/.env.example admin/.env.development
cp admin/.env.example admin/.env.production
```

frontend と同じ Firebase 値を設定する（`VITE_ENV` は `dev` / `prd`）。

### 5-3. functions（Firebase Cloud Functions）

```bash
cp functions/.env.example functions/.env
```

`functions/.env` を編集し、TiDB・Stripe・SMTP の実際の値を設定する。

---

## 6. 依存パッケージのインストール

```bash
# frontend（Electron）
cd frontend && npm install && cd ..

# admin
cd admin && npm install && cd ..

# Firebase Functions
cd functions && npm install && cd ..
```

---

## 7. 開発サーバーの起動

### frontend（Electron）

```bash
cd frontend
npm run dev
```

### admin（管理ダッシュボード）

```bash
cd admin
npm run dev
```

### Firebase Functions（ローカルエミュレーター）

```bash
firebase emulators:start --only functions,database
```

---

## 8. ビルド

### Electron デスクトップアプリ

```bash
cd frontend
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Web ビルド（Firebase Hosting 向け）

```bash
cd frontend
npm run build:web
```

### Admin ダッシュボード

```bash
cd admin
npm run build:dev   # 開発環境
npm run build:prd   # 本番環境
```

---

## 9. Firebase へのデプロイ

### Functions

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Hosting（開発環境）

```bash
firebase deploy --only hosting:dev
firebase deploy --only hosting:admin-dev
```

### Hosting（本番環境）

```bash
firebase deploy --only hosting:prd
firebase deploy --only hosting:admin-prd
```

---

## ファイル構成

```
ElectronBase/
├── frontend/           # Electron デスクトップアプリ（React + TypeScript）
│   ├── src/
│   │   ├── main/       # Electron メインプロセス
│   │   ├── preload/    # プリロードスクリプト
│   │   └── renderer/   # React フロントエンド
│   ├── .env.development
│   ├── .env.production
│   └── .env.example
├── admin/              # 管理ダッシュボード（React + TypeScript）
│   ├── .env.development
│   ├── .env.production
│   └── .env.example
├── functions/          # Firebase Cloud Functions（Node.js 20）
│   ├── .env            # ← gitignore 済み（実際の認証情報）
│   └── .env.example    # ← テンプレート
├── website/            # 静的ウェブサイト
├── firebase.json       # Firebase 設定
├── .firebaserc         # Firebase プロジェクト設定
└── database.rules.json # Realtime Database セキュリティルール
```
