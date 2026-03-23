# アプリアイコン

以下のファイルを用意してください。

```
icons/
├── 32x32.png       # 32x32px PNG
├── 128x128.png     # 128x128px PNG
├── 128x128@2x.png  # 256x256px PNG
├── icon.icns       # macOS 用
└── icon.ico        # Windows 用
```

## 生成方法

元画像（1024x1024 PNG）を用意して以下を実行:

```bash
npm run tauri icon path/to/icon.png
```

Tauri CLI が全サイズを自動生成します。
