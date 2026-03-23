#!/bin/bash
set -e

# Cloud Functions ローカルテスト（Firebase Emulator）
# 本番環境に影響なし
#
# 使い方:
#   ./scripts/test-functions-local.sh

PROJECT="token-batch-transfer"

echo "📦 Building functions..."
(cd functions && npm install && npm run build)
echo "✅ Build succeeded"
echo ""

echo "🔥 Starting Firebase Emulator..."
echo "   Functions: http://localhost:5001"
echo "   Database:  http://localhost:9000"
echo ""
echo "   フロントエンドの .env.development を以下に変更してください:"
echo "   VITE_FUNCTIONS_URL=http://localhost:5001/$PROJECT/asia-northeast1"
echo ""

npx firebase emulators:start --only functions,database --project "$PROJECT"
