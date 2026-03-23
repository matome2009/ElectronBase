#!/usr/bin/env python3
import re

file_path = 'src/renderer/components/MainLayout.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. useNetworkをimportに追加
content = re.sub(
    r"import { useAccount, useDisconnect, useWalletClient } from 'wagmi';",
    r"import { useAccount, useDisconnect, useWalletClient, useNetwork } from 'wagmi';",
    content
)

# 2. useNetwork()を追加
content = re.sub(
    r"(  const { disconnect: wagmiDisconnect } = useDisconnect\(\);)",
    r"\1\n  const { chain } = useNetwork();",
    content
)

# 3. chainNameを動的に変更
content = re.sub(
    r"  const chainName = 'Ethereum';",
    r"  const chainName = chain?.name || 'UNKNOWN';",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ MainLayout.tsx修正完了")
print("  - useNetworkをimport")
print("  - const { chain } = useNetwork()を追加")
print("  - chainNameをchain?.name || 'UNKNOWN'に変更")
