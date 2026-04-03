# Tauri Windows ビルドスクリプト
# 使い方: 管理者権限の PowerShell で実行してください。
# 注意: os error 4551 回避のため、必ず C: ドライブにコピーしてから実行してください。
param(
    [ValidateSet("dev", "prd")]
    [string]$Environment = "dev",
    [string]$WslRoot = $env:TAURI_TEMPLATE_WSL_ROOT,
    [string]$WinRoot = ""
)

# 文字エンコーディングを UTF8 に設定 (文字化け対策)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8 

# パス設定
if ([string]::IsNullOrWhiteSpace($WinRoot)) {
    $WinRoot = Split-Path -Parent $PSScriptRoot
}

if ([string]::IsNullOrWhiteSpace($WslRoot)) {
    Write-Error "WSL 側のプロジェクトパスが未設定です。-WslRoot か TAURI_TEMPLATE_WSL_ROOT を指定してください。"
    exit 1
}

$WSL_FRONTEND = Join-Path $WslRoot "frontend"
$WIN_FRONTEND = Join-Path $WinRoot "frontend"

# 環境変数の設定
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:TAURI_SKIP_MSIX_SIGNATURE_CHECK = "true"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
# Node.js ヒープサイズを拡張 (viem/wagmi/firebase 等の重い依存によるOOM対策)
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# 実行環境のチェック
if ($PSScriptRoot -like "\\wsl.localhost\*") {
    Write-Warning "WSLパスから直接実行されています。これは 'os error 4551' の原因になります。"
    Write-Warning "このスクリプトを Windows 側の scripts フォルダにコピーして、そこから実行してください。"
}

# Rust (Cargo) のデフォルトパスを追加
$CARGO_BIN = "$env:USERPROFILE\.cargo\bin"
if (Test-Path "$CARGO_BIN")
{
    $env:PATH += ";$CARGO_BIN"
}

# npm の確認
if (!(Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Error "エラー: Windows側に Node.js (npm) がインストールされていません。"
    exit 1
}

# Cargo の確認
if (!(Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    Write-Error "エラー: Windows側に Cargo (Rust) がインストールされていません。"
    exit 1
}

Write-Host "=== ステップ 0: セキュリティブロックの解除 (os error 4551 対策) ===" -ForegroundColor Cyan
# Rust ツールチェーンの実行許可を明示的に与える
if (Test-Path "$env:USERPROFILE\.cargo\bin")
{
    # Cargo本体とコンパイラを明示的に許可
    Get-ChildItem -Path "$env:USERPROFILE\.cargo\bin\*.exe" | ForEach-Object { Unblock-File -Path $_.FullName -ErrorAction SilentlyContinue }
    Write-Host "Rustバイナリのブロックを解除しました。" -ForegroundColor Green
}
Unblock-File -Path "$PSCommandPath" -ErrorAction SilentlyContinue

$TARGET = "x86_64-pc-windows-msvc"
if (!(rustc --print target-list | Select-String -Pattern $TARGET)) {
    Write-Host "Rust ターゲット $TARGET をインストール中..." -ForegroundColor Cyan
    rustup target add $TARGET
}

Write-Host "=== ステップ 1: WSL からファイルをコピー ===" -ForegroundColor Cyan
if (!(Test-Path "$WIN_FRONTEND")) { New-Item -ItemType Directory -Path "$WIN_FRONTEND" -Force }
# /IS を付けて古い設定ファイルを確実に最新(WSL側)のもので上書きし、タイムスタンプを無視して同期する
& robocopy "$WSL_FRONTEND" "$WIN_FRONTEND" /E /IS /IT /XD node_modules dist target src-tauri\target .vite
if ($LASTEXITCODE -le 8) { $host.SetShouldExit(0) }
# scripts フォルダも同期（スクリプト自身の更新を反映するため）
$WSL_SCRIPTS = Join-Path $WslRoot "scripts"
$WIN_SCRIPTS = "$WinRoot\scripts"
if (!(Test-Path "$WIN_SCRIPTS")) { New-Item -ItemType Directory -Path "$WIN_SCRIPTS" -Force }
& robocopy "$WSL_SCRIPTS" "$WIN_SCRIPTS" /E /IS /IT
if ($LASTEXITCODE -le 8) { $host.SetShouldExit(0) }

Write-Host "=== ステップ 1.5: コピーしたファイルのブロック解除 ===" -ForegroundColor Cyan
if (Test-Path "$WIN_FRONTEND")
{
    # 同期したソースコード全体を Windows に信頼させる
    Get-ChildItem -Path "$WIN_FRONTEND" -Recurse | Unblock-File -ErrorAction SilentlyContinue
    Write-Host "ファイルの準備が完了しました。" -ForegroundColor Green
}

Write-Host "=== 移動先: $WIN_FRONTEND ===" -ForegroundColor Cyan
Set-Location -Path "$WIN_FRONTEND"

Write-Host "=== ステップ 2: npm install を実行中 ===" -ForegroundColor Cyan
npm install
# node_modules 内のバイナリもブロック解除 (cross-env等)
if (Test-Path "node_modules\.bin")
{
    Get-ChildItem "node_modules\.bin\*" | ForEach-Object { Unblock-File -Path $_.FullName -ErrorAction SilentlyContinue }
}

Write-Host "=== ステップ 3: Tauri アプリをビルド中 ($Environment) ===" -ForegroundColor Cyan
if ($Environment -eq "prd") { npm run build:win:prd } else { npm run build:win:dev }

$BUNDLE_ROOT = "$WIN_FRONTEND\src-tauri\target\x86_64-pc-windows-msvc\release\bundle"

Write-Host "=== ステップ 4: MSIX パッケージ作成 (makeappx) ===" -ForegroundColor Cyan

# makeappx.exe を Windows SDK から検索
$sdkBase = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
$makeAppxExe = $null
if (Test-Path $sdkBase) {
    $makeAppxExe = Get-ChildItem -Path $sdkBase -Recurse -Filter "makeappx.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.DirectoryName -match "x64" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (!$makeAppxExe) {
    Write-Warning "makeappx.exe が見つかりません。Windows SDK をインストールしてください。"
    Write-Warning "  winget install Microsoft.WindowsSDK.10.0.22621"
    Write-Warning "インストール後に再実行してください。"
} else {
    Write-Host "makeappx.exe: $makeAppxExe" -ForegroundColor Gray

    # tauri.conf.json からメタデータを取得
    $tauriConf = Get-Content "$WIN_FRONTEND\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
    $appVersion = $tauriConf.version  # 例: "1.2.3"
    $productName = $tauriConf.productName
    $displayName = if ($tauriConf.app.windows.Count -gt 0 -and $tauriConf.app.windows[0].title) { $tauriConf.app.windows[0].title } else { $productName }
    $applicationId = $productName -replace '[^A-Za-z0-9]', ''
    $cargoToml = Get-Content "$WIN_FRONTEND\src-tauri\Cargo.toml" -Raw
    $cargoNameMatch = [regex]::Match($cargoToml, '(?ms)^\[package\]\s+name\s*=\s*"([^"]+)"')
    if (!$cargoNameMatch.Success) {
        Write-Error "Cargo.toml からバイナリ名を取得できませんでした。"
        exit 1
    }
    $binaryName = $cargoNameMatch.Groups[1].Value
    # MSIX は 4 桁 (x.x.x.x) が必要
    $msixVersion = "$appVersion.0"
    Write-Host "アプリバージョン: $appVersion" -ForegroundColor Gray

    # ステージングフォルダを作成
    $stageDir = "$env:TEMP\msix-stage-$([guid]::NewGuid().ToString('N').Substring(0,8))"
    $assetsDir = "$stageDir\Assets"
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null

    # Tauri がビルドした実行ファイルをコピー
    $releaseDir = "$WIN_FRONTEND\src-tauri\target\x86_64-pc-windows-msvc\release"
    $exeSource = "$releaseDir\$binaryName.exe"
    if (!(Test-Path $exeSource)) {
        Write-Warning "実行ファイルが見つかりません: $exeSource"
        Write-Warning "ステップ 3 のビルドを確認してください。"
    } else {
        Copy-Item $exeSource -Destination "$stageDir\$productName.exe"

        # アイコンファイルをコピー（Tauri のアイコンセットを流用）
        $iconsDir = "$WIN_FRONTEND\src-tauri\icons"
        @("Square150x150Logo.png","Square44x44Logo.png","Square30x30Logo.png","StoreLogo.png") | ForEach-Object {
            $src = "$iconsDir\$_"
            if (Test-Path $src) { Copy-Item $src -Destination "$assetsDir\$_" }
        }

        # AppxManifest.xml を生成（デスクトップアプリは rescap:runFullTrust が必要）
        @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">
    <Identity Name="$applicationId"
                        Publisher="CN=A243EDB1-9679-4D01-A46C-09EB91E18DFC"
            Version="$msixVersion"
            ProcessorArchitecture="x64"/>
  <Properties>
      <DisplayName>$displayName</DisplayName>
        <PublisherDisplayName>matome2009</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0"/>
  </Dependencies>
  <Resources>
    <Resource Language="ja-JP"/>
    <Resource Language="en-US"/>
  </Resources>
  <Applications>
    <Application Id="$applicationId"
                 Executable="$productName.exe"
                 EntryPoint="Windows.FullTrustApplication">
                        <uap:VisualElements DisplayName="$displayName"
                          Description="$displayName"
                          BackgroundColor="transparent"
                          Square150x150Logo="Assets\Square150x150Logo.png"
                          Square44x44Logo="Assets\Square44x44Logo.png"/>
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust"/>
  </Capabilities>
</Package>
"@ | Out-File -FilePath "$stageDir\AppxManifest.xml" -Encoding UTF8

        $outputMsix = "$BUNDLE_ROOT\${productName}_${appVersion}_x64.msix"
        Write-Host "パッキング中 → $(Split-Path $outputMsix -Leaf)" -ForegroundColor Cyan
        & $makeAppxExe pack /d $stageDir /p $outputMsix /nv 2>&1 | ForEach-Object { Write-Host $_ }

        Remove-Item $stageDir -Recurse -ErrorAction SilentlyContinue

        if (Test-Path $outputMsix) {
            Write-Host "MSIX 生成完了: $outputMsix" -ForegroundColor Green
        } else {
            Write-Warning "makeappx によるパッキングに失敗しました。上記のエラーを確認してください。"
        }
    }
}

Write-Host "=== ビルド完了！成果物を確認してください ===" -ForegroundColor Green
if (Test-Path "$BUNDLE_ROOT")
{
    Write-Host "探索先: $BUNDLE_ROOT" -ForegroundColor Gray
    $artifacts = Get-ChildItem -Path "$BUNDLE_ROOT" -Recurse | Where-Object { $_.Extension -match "msi|exe|appx|msix" }
    if ($artifacts)
    {
        $artifacts | Select-Object -Property @{Name="Type"; Expression={$_.Directory.Name}}, Name | Format-Table -AutoSize
    }
    else { Write-Host "成果物が見つかりません。targetsの設定を確認してください。" -ForegroundColor Yellow }
}
else { Write-Host "ビルドディレクトリが見つかりません。" -ForegroundColor Yellow }
