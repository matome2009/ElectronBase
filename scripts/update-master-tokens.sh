#!/bin/bash
# マスタートークンデータを decimalsByNetwork 形式に更新するスクリプト
# Usage: bash scripts/update-master-tokens.sh
#
# 現在のマスターデータを読み取り、decimalsByNetwork を追加します。
# 既存の decimals フィールドは削除し、decimalsByNetwork に移行します。

set -e

PROJECT="token-batch-transfer"
ENV="${1:-dev}"  # dev or prd

echo "=== マスタートークン decimalsByNetwork 移行 ==="
echo "環境: $ENV"
echo ""

# 現在のマスターデータを取得
echo "📖 現在のマスタートークンデータを取得中..."
CURRENT=$(npx firebase database:get /$ENV/master/tokens --project "$PROJECT" 2>/dev/null)
echo "$CURRENT" | head -20
echo ""

echo "⚠️  以下の操作を行います:"
echo "  - 各トークンに decimalsByNetwork を追加（addressByNetwork と同じキー構成）"
echo "  - 旧 decimals フィールドを削除"
echo ""
read -p "続行しますか？ (y/N): " confirm
if [ "$confirm" != "y" ]; then
  echo "キャンセルしました"
  exit 0
fi

echo ""
echo "📝 decimalsByNetwork を設定してください。"
echo "   Firebase Console で直接編集するか、以下のコマンドを参考にしてください:"
echo ""
echo "例: USDC (全ネットワーク decimals: 6) の場合:"
echo '  npx firebase database:update /'$ENV'/master/tokens/0 \'
echo '    --project '$PROJECT' \'
echo '    --data '"'"'{"decimalsByNetwork":{"1":6,"137":6,"42161":6,"10":6,"56":18,"11155111":6,"80002":6,"421614":6,"11155420":6,"97":18}}'"'"' \'
echo '    --force'
echo ""
echo "例: USDT (全ネットワーク decimals: 6) の場合:"
echo '  npx firebase database:update /'$ENV'/master/tokens/1 \'
echo '    --project '$PROJECT' \'
echo '    --data '"'"'{"decimalsByNetwork":{"1":6,"137":6,"42161":6,"10":6,"56":18,"11155111":6,"80002":6,"421614":6,"11155420":6,"97":18}}'"'"' \'
echo '    --force'
echo ""
echo "decimals フィールドを削除する場合:"
echo '  npx firebase database:remove /'$ENV'/master/tokens/0/decimals --project '$PROJECT' --force'
echo '  npx firebase database:remove /'$ENV'/master/tokens/1/decimals --project '$PROJECT' --force'
echo ""
echo "💡 Firebase Console (https://console.firebase.google.com) で直接編集するのが最も簡単です。"
echo "   Realtime Database → /$ENV/master/tokens → 各トークンに decimalsByNetwork を追加"
