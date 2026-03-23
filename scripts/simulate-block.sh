#!/bin/bash
# requires_subscription 状態をシミュレーション
#
# 使い方:
#   ./scripts/simulate-block.sh on    → ブロック状態にする
#   ./scripts/simulate-block.sh off   → 元に戻す

set -e

DB_URL="https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app"
ACTION="${1:-on}"

if [ "$ACTION" = "on" ]; then
  echo "🚫 ブロック状態をシミュレーション中..."

  # 1. 過去月（2026-02）に100ptのテストレコードを追加
  npx firebase database:set /dev/points/test-block-record \
    --project token-batch-transfer \
    --data '{
      "id": "test-block-record",
      "type": "transaction",
      "description": "テスト: 100pt超過シミュレーション",
      "points": 100,
      "createdAt": "2026-02-15T00:00:00.000Z",
      "sessionName": "テスト用"
    }' \
    --force

  # 2. billing の stripeSubscriptionId を削除
  npx firebase database:set /dev/billing/stripeSubscriptionId \
    --project token-batch-transfer \
    --data 'null' \
    --force

  echo ""
  echo "✅ ブロック状態になりました"
  echo "   アプリをリロードすると 🚫 赤バナーが表示されます"
  echo "   元に戻すには: ./scripts/simulate-block.sh off"

elif [ "$ACTION" = "off" ]; then
  echo "🔄 ブロック状態を解除中..."

  # テストレコードを削除
  npx firebase database:remove /dev/points/test-block-record \
    --project token-batch-transfer \
    --force

  echo ""
  echo "✅ 元に戻しました"
  echo "   アプリをリロードしてください"

else
  echo "❌ 使い方: ./scripts/simulate-block.sh [on|off]"
  exit 1
fi
