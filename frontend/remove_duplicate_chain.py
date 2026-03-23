#!/usr/bin/env python3

file_path = 'src/renderer/components/MainLayout.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 31行目（インデックス30）を削除
if len(lines) > 30 and "const { chain } = useNetwork();" in lines[30]:
    del lines[30]
    print(f"✓ 31行目の重複を削除: {lines[30].strip() if len(lines) > 30 else 'N/A'}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✓ 修正完了")
