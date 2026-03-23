#!/bin/bash
set -e

# Cloud Functions デプロイ
#
# 使い方:
#   ./scripts/deploy-functions.sh              → 全関数
#   ./scripts/deploy-functions.sh dev          → DEV関数のみ
#   ./scripts/deploy-functions.sh prd          → PRD関数のみ（確認あり）
#   ./scripts/deploy-functions.sh auth         → 認証関数のみ

PROJECT="token-batch-transfer"
TARGET="${1:-all}"

echo "📦 Building functions..."
(cd functions && npm install && npm run build)
echo "✅ Build succeeded"
echo ""

case "$TARGET" in
  dev)  FUNCTIONS="functions:sendKycNotificationsDev,functions:submitKycDev,functions:resendKycNotificationDev,functions:createCheckoutSessionDev,functions:verifyCheckoutSessionDev,functions:cancelSubscriptionDev,functions:reactivateSubscriptionDev,functions:reportUsageDev,functions:stripeWebhookDev,functions:getPointsSummaryDev,functions:updateKycEmailDev,functions:sendTestEmailDev,functions:rpcHealthCheckDev,functions:rpcHealthCheckManualDev,functions:getVersionsDev,functions:upsertVersionDev,functions:deleteVersionDev,functions:adminLoginDev,functions:getMaintenanceAllDev,functions:getMaintenanceDev,functions:upsertMaintenanceDev,functions:deleteMaintenanceDev,functions:getExcludeUsersDev,functions:addExcludeUserDev,functions:deleteExcludeUserDev" ;;
  prd)  FUNCTIONS="functions:sendKycNotificationsPrd,functions:submitKycPrd,functions:resendKycNotificationPrd,functions:createCheckoutSessionPrd,functions:verifyCheckoutSessionPrd,functions:cancelSubscriptionPrd,functions:reactivateSubscriptionPrd,functions:reportUsagePrd,functions:stripeWebhookPrd,functions:getPointsSummaryPrd,functions:updateKycEmailPrd,functions:sendTestEmailPrd,functions:rpcHealthCheckPrd,functions:rpcHealthCheckManualPrd,functions:getVersionsPrd,functions:upsertVersionPrd,functions:deleteVersionPrd,functions:adminLoginPrd,functions:getMaintenanceAllPrd,functions:getMaintenancePrd,functions:upsertMaintenancePrd,functions:deleteMaintenancePrd,functions:getExcludeUsersPrd,functions:addExcludeUserPrd,functions:deleteExcludeUserPrd" ;;
  auth) FUNCTIONS="functions:getNonce,functions:verifySignature" ;;
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
npx firebase functions:list --project "$PROJECT"
