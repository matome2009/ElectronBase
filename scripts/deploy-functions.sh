#!/bin/bash
set -euo pipefail

# Cloud Functions デプロイ
#
# 使い方:
#   ./scripts/deploy-functions.sh              → 全関数
#   ./scripts/deploy-functions.sh dev          → DEV関数のみ
#   ./scripts/deploy-functions.sh prd          → PRD関数のみ（確認あり）
#   ./scripts/deploy-functions.sh auth         → 認証関数のみ

PROJECT="${FIREBASE_PROJECT_ID:-${PROJECT_ID:-}}"
REGION="${FIREBASE_FUNCTIONS_REGION:-asia-northeast1}"
TARGET="${1:-all}"

if [ -z "${PROJECT}" ]; then
  PROJECT=$(node -e "try{console.log(require('./.firebaserc').projects.default||'')}catch(e){console.log('')}")
fi

if [ -z "${PROJECT}" ]; then
  echo "❌ Firebase project is not configured. Set FIREBASE_PROJECT_ID or update .firebaserc."
  exit 1
fi

echo "📦 Building functions..."
(cd functions && npm install && npm run build)
echo "✅ Build succeeded"
echo ""

case "$TARGET" in
  dev)  FUNCTIONS=$(node -e "const m=require('./functions/lib/index');console.log(Object.keys(m).filter(k=>k.endsWith('Dev')).map(k=>'functions:'+k).join(','))") ;;
  prd)  FUNCTIONS=$(node -e "const m=require('./functions/lib/index');console.log(Object.keys(m).filter(k=>k.endsWith('Prd')).map(k=>'functions:'+k).join(','))") ;;
  auth) FUNCTIONS="functions:getNonceDev,functions:getNoncePrd,functions:verifyWalletConnectDev,functions:verifyWalletConnectPrd,functions:verifyGoogleTokenDev,functions:verifyGoogleTokenPrd,functions:verifyLineTokenDev,functions:verifyLineTokenPrd,functions:startAsGuestDev,functions:startAsGuestPrd,functions:linkLoginDev,functions:linkLoginPrd" ;;
  all)  FUNCTIONS="functions" ;;
  *)    echo "❌ Unknown target: $TARGET (use 'all', 'dev', 'prd', or 'auth')"; exit 1 ;;
esac

if [ "$TARGET" = "prd" ]; then
  read -p "⚠️  PRD関数をデプロイします。続行しますか？ (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "キャンセルしました"; exit 0
  fi
fi

echo "🚀 Deploying: $TARGET"
npx firebase deploy --only "$FUNCTIONS" --project "$PROJECT"

echo ""
echo "✅ Done!"

# 未認証アクセスが必要な関数にIAMを設定
# （Firebase Functions v1 はデプロイ時に自動設定されないため手動で付与）
set_iam_for_suffix() {
  local suffix="$1"
  local label="$2"
  echo ""
  echo "🔓 Setting public IAM for $label functions..."
  local fns
  fns=$(node -e "const m=require('./functions/lib/index');console.log(Object.keys(m).filter(k=>k.endsWith('$suffix')).join(' '))")
  for fn in $fns; do
    gcloud functions add-iam-policy-binding "$fn" \
      --region="$REGION" \
      --project="$PROJECT" \
      --member="allUsers" \
      --role="roles/cloudfunctions.invoker" \
      --quiet && echo "  ✓ $fn" || echo "  ⚠ $fn (IAM already set or skipped)"
  done
}

if [ "$TARGET" = "all" ] || [ "$TARGET" = "auth" ] || [ "$TARGET" = "dev" ]; then
  set_iam_for_suffix "Dev" "Dev"
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "auth" ] || [ "$TARGET" = "prd" ]; then
  set_iam_for_suffix "Prd" "Prd"
fi

npx firebase functions:list --project "$PROJECT"
