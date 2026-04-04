#!/bin/bash
set -euo pipefail

# Cloud Functions デプロイ
#
# 使い方:
#   ./scripts/deploy-functions.sh              → 全関数
#   ./scripts/deploy-functions.sh dev          → DEV関数のみ
#   ./scripts/deploy-functions.sh prd          → PRD関数のみ（確認あり）
#   ./scripts/deploy-functions.sh auth         → 認証関数のみ
#   ./scripts/deploy-functions.sh auth-dev     → DEV 認証関数のみ
#   ./scripts/deploy-functions.sh auth-prd     → PRD 認証関数のみ

TARGET="${1:-all}"
PROFILE="${WORKSPACE_ENV_PROFILE:-dev}"

if [ "$TARGET" = "all" ]; then
  "$0" dev
  "$0" prd
  exit 0
fi

if [ "$TARGET" = "auth" ]; then
  "$0" auth-dev
  "$0" auth-prd
  exit 0
fi

if [ "$TARGET" = "prd" ] || [ "$TARGET" = "auth-prd" ]; then
  PROFILE="prd"
elif [ "$TARGET" = "dev" ] || [ "$TARGET" = "auth-dev" ]; then
  PROFILE="dev"
fi

export WORKSPACE_ENV_PROFILE="${PROFILE}"

PROJECT="${FIREBASE_PROJECT_ID:-${PROJECT_ID:-}}"
if [ -z "${PROJECT}" ]; then
  PROJECT="$(node -e "const {loadWorkspaceEnv}=require('./scripts/lib/workspace-env.cjs');const env=loadWorkspaceEnv(process.argv[1]).values;console.log(env.FIREBASE_PROJECT_ID||'');" "$PROFILE")"
fi

REGION="${FIREBASE_FUNCTIONS_REGION:-}"
if [ -z "${REGION}" ]; then
  REGION="$(node -e "const {loadWorkspaceEnv}=require('./scripts/lib/workspace-env.cjs');const env=loadWorkspaceEnv(process.argv[1]).values;console.log(env.FIREBASE_FUNCTIONS_REGION||'asia-northeast1');" "$PROFILE")"
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

echo "📦 Building functions..."
(npm run env:sync:functions -- "$PROFILE")
(cd functions && npm install && npm run build)
echo "✅ Build succeeded"
echo ""

case "$TARGET" in
  dev)  FUNCTIONS=$(node -e "const m=require('./functions/lib/index');console.log(Object.keys(m).filter(k=>k.endsWith('Dev')).map(k=>'functions:'+k).join(','))") ;;
  prd)  FUNCTIONS=$(node -e "const m=require('./functions/lib/index');console.log(Object.keys(m).filter(k=>k.endsWith('Prd')).map(k=>'functions:'+k).join(','))") ;;
  auth-dev) FUNCTIONS="functions:getNonceDev,functions:verifyWalletConnectDev,functions:verifyGoogleTokenDev,functions:verifyLineTokenDev,functions:startAsGuestDev,functions:linkLoginDev" ;;
  auth-prd) FUNCTIONS="functions:getNoncePrd,functions:verifyWalletConnectPrd,functions:verifyGoogleTokenPrd,functions:verifyLineTokenPrd,functions:startAsGuestPrd,functions:linkLoginPrd" ;;
  *)    echo "❌ Unknown target: $TARGET (use 'all', 'dev', 'prd', 'auth', 'auth-dev', or 'auth-prd')"; exit 1 ;;
esac

if [ "$TARGET" = "prd" ] || [ "$TARGET" = "auth-prd" ]; then
  read -p "⚠️  PRD関数をデプロイします。続行しますか？ (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "キャンセルしました"; exit 0
  fi
fi

echo "🚀 Deploying: $TARGET"
DEPLOY_RESULT_FILE="$(mktemp)"
DEPLOY_STDERR_FILE="$(mktemp)"
cleanup_deploy_logs() {
  rm -f "$DEPLOY_RESULT_FILE" "$DEPLOY_STDERR_FILE"
}
trap cleanup_deploy_logs EXIT

set +e
NO_UPDATE_NOTIFIER=1 npx firebase deploy --only "$FUNCTIONS" --project "$PROJECT" --json >"$DEPLOY_RESULT_FILE" 2>"$DEPLOY_STDERR_FILE"
DEPLOY_EXIT=$?
set -e

if [ -s "$DEPLOY_STDERR_FILE" ]; then
  cat "$DEPLOY_STDERR_FILE" >&2
fi

DEPLOY_STATUS="$(node -e "const fs=require('fs');try{const json=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(json.status||'');}catch{console.log('');}" "$DEPLOY_RESULT_FILE")"
CLEANUP_POLICY_WARNING="Functions successfully deployed but could not set up cleanup policy in location"

if grep -q "$CLEANUP_POLICY_WARNING" "$DEPLOY_RESULT_FILE" || grep -q "$CLEANUP_POLICY_WARNING" "$DEPLOY_STDERR_FILE"; then
  echo ""
  echo "⚠ Functions deployed, but Artifact Registry cleanup policy is not configured."
  echo "  Run once to set it up:"
  echo "  firebase functions:artifacts:setpolicy --project \"$PROJECT\" --location \"$REGION\" --days 30 --force"
  DEPLOY_EXIT=0
  DEPLOY_STATUS="success"
fi

if [ "$DEPLOY_EXIT" -ne 0 ] || [ "$DEPLOY_STATUS" != "success" ]; then
  node -e "const fs=require('fs');const raw=fs.readFileSync(process.argv[1],'utf8').trim();if(!raw){process.exit(0)};try{const json=JSON.parse(raw);if(json.error){console.error(json.error)}else{console.error(JSON.stringify(json,null,2))}}catch{console.error(raw)}" "$DEPLOY_RESULT_FILE"
  echo ""
  echo "❌ Deploy failed. IAM update is skipped."
  exit 1
fi

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

if [ "$TARGET" = "dev" ] || [ "$TARGET" = "auth-dev" ]; then
  set_iam_for_suffix "Dev" "Dev"
fi

if [ "$TARGET" = "prd" ] || [ "$TARGET" = "auth-prd" ]; then
  set_iam_for_suffix "Prd" "Prd"
fi

npx firebase functions:list --project "$PROJECT"
