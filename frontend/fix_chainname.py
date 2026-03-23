#!/usr/bin/env python3

# ファイルを読み込む
with open('src/renderer/components/MainLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# useAccountにchainを追加
content = content.replace(
    "const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();",
    "const { address: wagmiAddress, isConnected: wagmiConnected, chain } = useAccount();"
)

# chainNameを動的に取得
content = content.replace(
    "const chainName = 'Ethereum';",
    "const chainName = chain?.name || 'Ethereum';"
)

# ファイルに書き込む
with open('src/renderer/components/MainLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("chainName修正完了！")
print("wagmiのchainから実際のネットワーク名を取得するようになりました。")
