#!/bin/bash
set -e

# master-data-dev.json を Firebase Realtime Database に同期するスクリプト
#
# 使い方:
#   ./scripts/sync-master-data.sh           # dev のみ（デフォルト）
#   ./scripts/sync-master-data.sh prd       # prd のみ
#   ./scripts/sync-master-data.sh both      # dev と prd 両方

ENV=${1:-dev}

if [[ "$ENV" != "dev" && "$ENV" != "prd" && "$ENV" != "both" ]]; then
  echo "引数は dev / prd / both のいずれかを指定してください"
  exit 1
fi

node "$(dirname "$0")/sync-master-data.js" --env "$ENV"
