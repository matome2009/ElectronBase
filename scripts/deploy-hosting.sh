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

PROJECT="${FIREBASE_PROJECT_ID:-${PROJECT_ID:-}}"
TARGET="${1:-dev}"

if [ -z "${PROJECT}" ]; then
  PROJECT=$(node -e "try{console.log(require('./.firebaserc').projects.default||'')}catch(e){console.log('')}")
fi

if [ -z "${PROJECT}" ]; then
  echo "❌ Firebase project is not configured. Set FIREBASE_PROJECT_ID or update .firebaserc."
  exit 1
fi

case "$TARGET" in
  dev)        HOSTING="hosting:dev" ;;
  prd)        HOSTING="hosting:prd" ;;
  web)        HOSTING="hosting:website" ;;
  admin-dev)  HOSTING="hosting:admin-dev" ;;
  admin-prd)  HOSTING="hosting:admin-prd" ;;
  *)          echo "❌ Unknown target: $TARGET (use 'dev', 'prd', 'web', 'admin-dev', or 'admin-prd')"; exit 1 ;;
esac

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
  echo "📄 Web is static, skipping build..."
fi

echo ""
echo "🚀 Deploying: $TARGET"
npx firebase deploy --only "$HOSTING" --project "$PROJECT"

echo ""
echo "✅ Done!"
