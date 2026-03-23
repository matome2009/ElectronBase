# 運用手順書

初回セットアップは [SETUP.md](SETUP.md) を参照。
本書はデプロイ・ビルド・インストール・DB管理など日常運用の手順をまとめたもの。

---

## 目次

1. [Firebase 権限設定](#1-firebase-権限設定)
2. [Realtime Database デプロイ](#2-realtime-database-デプロイ)
3. [Firebase Hosting デプロイ](#3-firebase-hosting-デプロイ)
4. [TiDB 初期化](#4-tidb-初期化)
5. [アプリビルド](#5-アプリビルド)
6. [インストール・アンインストール手順](#6-インストールアンインストール手順)

---

## 1. Firebase 権限設定

### 1-1. 必要なロール

| ロール | 対象者 | 付与方法 |
|--------|--------|---------|
| `Firebase Admin` | バックエンド担当 | Firebase Console → プロジェクト設定 → ユーザーと権限 |
| `Hosting Admin` | デプロイ担当 | 同上 |
| `Database Admin` | DB設計者 | 同上 |
| `Functions Admin` | Functions担当 | 同上 |
| `Viewer` | 閲覧のみ | 同上 |

### 1-2. Firebase Authentication の有効化

Firebase Console → Authentication → Sign-in method で以下を有効化:

| プロバイダ | 必須 | 備考 |
|-----------|------|------|
| Google | ○ | OAuth同意画面の設定が必要 |
| 匿名認証 | ○ | ゲストログインに使用 |
| カスタム認証 | ○ | WalletConnect ログインに使用 |

### 1-3. Firebase CLI ログイン確認

```bash
firebase login
firebase projects:list   # プロジェクトが表示されること
firebase use <project-id>
```

---

## 2. Realtime Database デプロイ

### ルールファイルの管理

編集元: `db/realtime-db-rules.json`
デプロイ元: `database.rules.json`（Firebase CLI が参照するファイル）

ルールを変更する場合は `db/` を編集してから反映する:

```bash
# db/realtime-db-rules.json を database.rules.json にコピー
cp db/realtime-db-rules.json database.rules.json

# デプロイ
firebase deploy --only database
```

### DB構造の確認

`db/realtime-db-schema.md` にスキーマ定義を記載。
Firebase Console → Realtime Database でデータを直接確認可能。

---

## 3. Firebase Hosting デプロイ

### ターゲット一覧

| ターゲット | 内容 | ビルド元 |
|-----------|------|---------|
| `website` | 静的サイト | `website/` |
| `dev` | フロントエンド（開発） | `frontend/dist/renderer/` |
| `prd` | フロントエンド（本番） | `frontend/dist/renderer/` |
| `admin-dev` | 管理画面（開発） | `admin/dist/` |
| `admin-prd` | 管理画面（本番） | `admin/dist/` |

### 3-1. Cloud Functions のデプロイ

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 3-2. 管理画面（Admin）のデプロイ

```bash
# 開発環境
cd admin && npm run build:dev && cd ..
firebase deploy --only hosting:admin-dev

# 本番環境
cd admin && npm run build:prd && cd ..
firebase deploy --only hosting:admin-prd
```

### 3-3. フロントエンド Web ビルドのデプロイ

```bash
# 開発環境
cd frontend && npm run build:web:dev && cd ..
firebase deploy --only hosting:dev

# 本番環境
cd frontend && npm run build:web:prd && cd ..
firebase deploy --only hosting:prd
```

### 3-4. 静的サイトのデプロイ

```bash
firebase deploy --only hosting:website
```

### 3-5. 全部まとめてデプロイ

```bash
firebase deploy --only hosting,functions,database
```

---

## 4. TiDB 初期化

### 4-1. テーブル作成

`db/tidb-create.sql` の内容を TiDB Cloud の SQL Editor、または MySQL クライアントで実行する。

```bash
# mysql クライアント経由の場合
# USER DB（dev）
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY \
  -D dev < db/tidb-create.sql

# ADMIN DB（dev_admin）
mysql -h <TIDB_HOST> -P 4000 -u <USER> -p --ssl-mode=VERIFY_IDENTITY \
  -D dev_admin < db/tidb-create.sql
```

> SQL ファイルはテーブルごとに `CREATE TABLE IF NOT EXISTS` で書かれているため、
> 冪等に実行可能（既存テーブルに影響なし）。

### 4-2. データベース分離

| DB名 | 用途 |
|------|------|
| `dev` | 開発環境ユーザーデータ（user_t, login_t, billing系） |
| `prd` | 本番環境ユーザーデータ |
| `dev_admin` | 開発環境マスターデータ（バージョン, メンテナンス, お知らせ等） |
| `prd_admin` | 本番環境マスターデータ |

---

## 5. アプリビルド

### 前提

```bash
cd frontend
npm install
```

### 5-1. Windows（.exe インストーラー）

```bash
npm run build:win
```

出力: `frontend/dist/*.exe`
配布: GitHub Releases / 自社サーバーにアップロード

### 5-2. Windows（Microsoft Store 向け .appx）

```bash
npm run build:win
# electron-builder が appx を生成（package.json の win.target に "appx" を追加が必要）
```

> Microsoft Store 申請には Developer Center アカウントとコード署名証明書が必要。

### 5-3. macOS（.dmg）

```bash
npm run build:mac
```

出力: `frontend/dist/*.dmg`
公証（Notarization）には Apple Developer Program への加入と証明書設定が必要。

### 5-4. Linux — Snap

```bash
npm run build:snap
# または
npm run build:linux
```

出力: `frontend/dist/*.snap`
Snap Store への公開:

```bash
snapcraft login
snapcraft upload --release=stable dist/*.snap
```

### 5-5. Linux — .deb（Debian/Ubuntu）

```bash
npm run build:linux
```

出力: `frontend/dist/*.deb`
インストール:

```bash
sudo dpkg -i dist/*.deb
```

### 5-6. Web ブラウザ版

```bash
# 開発環境向け
npm run build:web:dev

# 本番環境向け
npm run build:web:prd
```

出力: `frontend/dist/renderer/`
→ Firebase Hosting にデプロイ（[3-3 参照](#3-3-フロントエンド-web-ビルドのデプロイ)）

---

## 6. インストール・アンインストール手順

### 6-1. Windows

**インストール:**

1. `.exe` ファイルをダブルクリック
2. インストーラーの指示に従う
3. デスクトップまたはスタートメニューからアプリを起動

**アンインストール:**

- コントロールパネル → プログラムと機能 → アプリ名を選択 → アンインストール
- または: 設定 → アプリ → アプリ名を選択 → アンインストール

**残留データの削除（完全削除）:**

```
%APPDATA%\ElectronBase\
```

### 6-2. macOS

**インストール:**

1. `.dmg` ファイルを開く
2. アプリアイコンを `/Applications` にドラッグ

**アンインストール:**

1. `/Applications` からアプリを削除（ゴミ箱へ）
2. 残留データの削除（完全削除）:

```bash
rm -rf ~/Library/Application\ Support/ElectronBase
rm -rf ~/Library/Caches/ElectronBase
rm -rf ~/Library/Logs/ElectronBase
```

### 6-3. Linux — .deb

**インストール:**

```bash
sudo dpkg -i electronbase_*.deb
# 依存関係エラーが出た場合
sudo apt-get install -f
```

**アンインストール:**

```bash
sudo apt-get remove electronbase
# 設定ファイルも含めて完全削除
sudo apt-get purge electronbase
```

**残留データの削除:**

```bash
rm -rf ~/.config/ElectronBase
rm -rf ~/.local/share/ElectronBase
```

### 6-4. Linux — Snap

**インストール:**

```bash
sudo snap install electronbase_*.snap --dangerous
# Snap Store からの場合
sudo snap install electronbase
```

**アンインストール:**

```bash
sudo snap remove electronbase
```

> Snap はアンインストール時にデータも自動削除される。

---

## DB ファイル構成

```
db/
├── realtime-db-rules.json   # Firebase Realtime DB セキュリティルール（編集元）
├── realtime-db-schema.md    # Realtime DB のデータ構造ドキュメント
└── tidb-create.sql          # TiDB テーブル CREATE文（全環境共通）
```

`database.rules.json`（ルート）は Firebase CLI が参照するデプロイ用ファイル。
編集は `db/realtime-db-rules.json` で行い、デプロイ前にコピーすること。
