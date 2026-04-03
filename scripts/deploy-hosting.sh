#!/bin/bash
set -euo pipefail

# Firebase Hosting デプロイ
#
# 使い方:
#   ./scripts/deploy-hosting.sh dev        → DEV Hosting (frontend)
#   ./scripts/deploy-hosting.sh prd        → PRD Hosting (frontend)（確認あり）
#   ./scripts/deploy-hosting.sh web        → Website Hosting（確認あり）
#   ./scripts/deploy-hosting.sh admin-dev  → Admin DEV Hosting
#   ./scripts/deploy-hosting.sh admin-prd  → Admin PRD Hosting（確認あり）

TARGET="${1:-dev}"
PROFILE="${WORKSPACE_ENV_PROFILE:-dev}"

case "$TARGET" in
  dev)        HOSTING="hosting:dev"; PROFILE="dev" ;;
  prd)        HOSTING="hosting:prd"; PROFILE="prd" ;;
  web)        HOSTING="hosting:website"; PROFILE="${WORKSPACE_ENV_PROFILE:-prd}" ;;
  admin-dev)  HOSTING="hosting:admin-dev"; PROFILE="dev" ;;
  admin-prd)  HOSTING="hosting:admin-prd"; PROFILE="prd" ;;
  *)          echo "❌ Unknown target: $TARGET (use 'dev', 'prd', 'web', 'admin-dev', or 'admin-prd')"; exit 1 ;;
esac

export WORKSPACE_ENV_PROFILE="${PROFILE}"

PROJECT="${FIREBASE_PROJECT_ID:-${PROJECT_ID:-}}"
if [ -z "${PROJECT}" ]; then
  PROJECT="$(node -e "const {loadWorkspaceEnv}=require('./scripts/lib/workspace-env.cjs');const env=loadWorkspaceEnv(process.argv[1]).values;console.log(env.FIREBASE_PROJECT_ID||'');" "$PROFILE")"
fi

GOOGLE_CREDENTIALS_PATH="$(node scripts/resolve-google-credentials-path.mjs "$PROFILE")"

if [ -n "${GOOGLE_CREDENTIALS_PATH}" ]; then
  export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_CREDENTIALS_PATH}"
  echo "🔑 Loaded Google application credentials from .env.${PROFILE}"
fi

if [ -z "${PROJECT}" ]; then
  PROJECT=$(node -e "try{console.log(require('./.firebaserc').projects.default||'')}catch(e){console.log('')}")
fi

if [ -z "${PROJECT}" ]; then
  echo "❌ Firebase project is not configured. Set FIREBASE_PROJECT_ID in .env.${PROFILE} or update .firebaserc."
  exit 1
fi

if [ "$TARGET" = "prd" ] || [ "$TARGET" = "web" ] || [ "$TARGET" = "admin-prd" ]; then
  read -p "⚠️  ${TARGET} Hostingをデプロイします。続行しますか？ (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "キャンセルしました"; exit 0
  fi
fi

if [ "$TARGET" = "admin-dev" ] || [ "$TARGET" = "admin-prd" ]; then
  ADMIN_ENV="${TARGET#admin-}"
  echo "📦 Building admin ($ADMIN_ENV)..."
  (cd admin && npm install && npm run build:$ADMIN_ENV)
  echo "✅ Build succeeded"
elif [ "$TARGET" != "web" ]; then
  echo "📦 Building frontend ($TARGET)..."
  (cd frontend && npm run build:web:$TARGET)
  echo "✅ Build succeeded"
else
  echo "📄 Generating static website Firebase config..."
  (npm run env:sync:website -- "$PROFILE")
  echo "✅ Website config generated"
fi

echo ""
echo "🚀 Deploying: $TARGET"
npx firebase deploy --only "$HOSTING" --project "$PROJECT"

echo ""
echo "✅ Done!"
