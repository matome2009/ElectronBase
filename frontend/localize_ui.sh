#!/bin/bash

# UIコンポーネントの英語テキストを日本語化するスクリプト

# Dashboard.tsx
sed -i 's|Session: January Payroll|セッション: 1月給与|g' src/renderer/components/Dashboard.tsx
sed -i 's|Session: December Payroll|セッション: 12月給与|g' src/renderer/components/Dashboard.tsx
sed -i 's|Created 2 hours ago|2時間前に作成|g' src/renderer/components/Dashboard.tsx
sed -i 's|Completed yesterday|昨日完了|g' src/renderer/components/Dashboard.tsx
sed -i 's|Pending|保留中|g' src/renderer/components/Dashboard.tsx
sed -i 's|Completed|完了|g' src/renderer/components/Dashboard.tsx

# VerifiedAddressesView.tsx
sed -i "s|'Session Name'|'セッション名'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Recipient Address'|'受信者アドレス'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Original Amount'|'元の金額'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Test Amount'|'テスト金額'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Differential Amount'|'差分金額'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Token'|'トークン'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Network'|'ネットワーク'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Verification Time'|'検証時刻'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Transaction Hash'|'トランザクションハッシュ'|g" src/renderer/components/VerifiedAddressesView.tsx
sed -i "s|'Status'|'ステータス'|g" src/renderer/components/VerifiedAddressesView.tsx

# SessionList.tsx
sed -i 's|Copy|コピー|g' src/renderer/components/SessionList.tsx

echo "UI日本語化完了"
