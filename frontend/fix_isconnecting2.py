#!/usr/bin/env python3

# ファイルを読み込む
with open('src/renderer/components/SessionList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# isConnectingの参照を削除（シンプルな置換）
content = content.replace("{isConnecting ? '接続中...' : 'ウォレットを接続'}", "'ウォレットを接続'")

# ファイルに書き込む
with open('src/renderer/components/SessionList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("isConnecting削除完了！")
