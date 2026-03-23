#!/usr/bin/env python3

# ファイルを読み込む
with open('src/renderer/components/MainLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# useNetworkをimport
content = content.replace(
    "import { useAccount, useDisconnect } from 'wagmi';",
    "import { useAccount, useDisconnect, useNetwork } from 'wagmi';"
)

# useNetworkを使用
content = content.replace(
    "const { address: wagmiAddress, isConnected: wagmiConnected, chain } = useAccount();",
    "const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();\n  const { chain } = useNetwork();"
)

# ファイルに書き込む
with open('src/renderer/components/MainLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("useNetwork追加完了！")
print("wagmi v1のuseNetworkフックでchainを取得するようになりました。")
