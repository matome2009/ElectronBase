#!/usr/bin/env python3
import re

# ファイルを読み込む
with open('src/renderer/components/SessionList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# connectWalletの呼び出しを削除
content = re.sub(r'await connectWallet\(\);', '', content)

# connectWalletのログを削除
content = re.sub(r"console\.log\('connectWallet呼び出し'\);?\n?", '', content)
content = re.sub(r"console\.log\('connectWallet完了'\);?\n?", '', content)

# "もう一度実行してください"のアラートを削除
content = re.sub(r"alert\('ウォレットが接続されました。もう一度.*?をクリックしてください。'\);?\n?", '', content)

# try-catchブロックを簡素化（connectWallet関連）
# パターン1: handleExecutePayments内
pattern1 = r"if \(!wallet\) \{\s*console\.log\('ウォレット未接続.*?\);\s*const confirmed = window\.confirm\('ウォレットを接続しますか？'\);\s*if \(!confirmed\) return;\s*try \{[^}]*\} catch \(error\) \{[^}]*\}\s*\}"

replacement1 = """if (!wallet) {
        alert('ウォレットが接続されていません。画面上部の「ウォレット接続」ボタンから接続してください。');
        return;
      }"""

content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# パターン2: handleTestPayment内（より短いバージョン）
pattern2 = r"if \(!wallet\) \{\s*const confirmed = window\.confirm\('ウォレットを接続しますか？'\);\s*if \(!confirmed\) return;\s*try \{[^}]*\} catch \(error\) \{[^}]*\}\s*\}"

replacement2 = """if (!wallet) {
        alert('ウォレットが接続されていません。画面上部の「ウォレット接続」ボタンから接続してください。');
        return;
      }"""

content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)

# onClick={connectWallet}を修正
content = re.sub(r'onClick=\{connectWallet\}', 'onClick={() => alert("画面上部から接続してください")}', content)

# disabled={isConnecting}を修正
content = re.sub(r'disabled=\{isConnecting\}', 'disabled={false}', content)

# ファイルに書き込む
with open('src/renderer/components/SessionList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("修正完了！")
print("connectWalletの参照を全て削除しました。")
