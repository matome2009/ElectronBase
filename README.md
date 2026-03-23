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
- **データ永続化**: localStorage

## セットアップ

### 必要要件
- Node.js 18以上
- npm または yarn

### インストール

```bash
cd frontend
npm install
```

### 開発モード

```bash
npm run dev
```

### ビルド

#### Windows (.exe)
```bash
npm run build:win
```

#### Mac (.dmg)
```bash
npm run build:mac
```

#### Linux (.AppImage)
```bash
npm run build:linux
```

## プロジェクト構造

```
frontend/
├── src/
│   ├── main/           # Electronメインプロセス
│   ├── preload/        # Preloadスクリプト
│   └── renderer/       # Reactアプリケーション
│       ├── components/ # UIコンポーネント
│       ├── services/   # ビジネスロジック
│       ├── hooks/      # カスタムフック
│       ├── config/     # Web3設定
│       └── types/      # TypeScript型定義
├── dist/               # ビルド成果物
└── out/                # パッケージ済みアプリ
```

## WalletConnect設定

Project ID: `1deeae95c54f33e5e3f5f3310982191e`

## ライセンス

MIT

## 開発履歴

このプロジェクトは当初C# + Avaloniaで開発されていましたが、Web3統合（特にブラウザ拡張機能との連携）の制約により、TypeScript + Electronに移行しました。

詳細は以下のドキュメントを参照してください：
- [MIGRATION_SUMMARY_JP.md](./MIGRATION_SUMMARY_JP.md) - 移行の経緯と理由
- [TYPESCRIPT_MIGRATION_COMPLETE.md](./TYPESCRIPT_MIGRATION_COMPLETE.md) - 実装完了レポート
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ設計


# 1. .NET SDK をインストール
sudo apt install -y dotnet-sdk-8.0

# 2. バックエンドを起動
cd backend
./run.sh

# 3. 別のターミナルでフロントエンドを起動
cd frontend
npm run dev


# SNAP 
sudo snap remove tokenbatchtransfer 
cd ~/workspace/PayrollGuardian/electron
npm run build:dev:snap
sudo snap install ./dist-electron/TokenBatchTransfer_1.0.0_amd64.snap --dangerous 
snap run tokenbatchtransfer
# snap store
snapcraft login
snapcraft register token-batch-transfer
snapcraft upload --release=stable ./dist/TicketSystem.snap
