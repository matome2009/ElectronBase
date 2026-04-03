#!/bin/bash
set -e

# Cloud Functions ローカルテスト（Firebase Emulator）
# 本番環境に影響なし
#
# 使い方:
#   ./scripts/test-functions-local.sh

PROFILE="${WORKSPACE_ENV_PROFILE:-dev}"
export WORKSPACE_ENV_PROFILE="${PROFILE}"
PROJECT="$(node -e "const {loadWorkspaceEnv}=require('./scripts/lib/workspace-env.cjs');const env=loadWorkspaceEnv(process.argv[1], undefined, { required: false }).values;console.log(env.FIREBASE_PROJECT_ID||'token-batch-transfer');" "$PROFILE")"
GOOGLE_CREDENTIALS_PATH="$(node scripts/resolve-google-credentials-path.mjs "$PROFILE")"

if [ -n "${GOOGLE_CREDENTIALS_PATH}" ]; then
  export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_CREDENTIALS_PATH}"
  echo "🔑 Loaded Google application credentials from .env.${PROFILE}"
fi

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
