// ============================================================
// 外部URL をデフォルトブラウザで開く
// ============================================================
#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|e| e.to_string())
}

// ============================================================
// セキュアストレージ（OS キーチェーン経由）
//   macOS  : Keychain
//   Windows: Credential Manager
//   Linux  : libsecret / keyutils
// ============================================================

const KEYRING_SERVICE: &str = "electronbase";
const WALLETCONNECT_KEY: &str = "walletconnect_session";

/// 暗号化が利用可能かチェック（OS キーチェーンは常に利用可能とみなす）
#[tauri::command]
fn is_encryption_available() -> bool {
    true
}

/// WalletConnect セッションデータを暗号化して保存
#[tauri::command]
fn save_walletconnect_session(data: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, WALLETCONNECT_KEY)
        .map_err(|e| e.to_string())?;
    entry.set_password(&data).map_err(|e| e.to_string())
}

/// WalletConnect セッションデータを復号して読み込む
#[tauri::command]
fn load_walletconnect_session() -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, WALLETCONNECT_KEY)
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(data) => Ok(Some(data)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// WalletConnect セッションデータを削除
#[tauri::command]
fn delete_walletconnect_session() -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, WALLETCONNECT_KEY)
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // 存在しない場合は正常終了
        Err(e) => Err(e.to_string()),
    }
}

/// WalletConnect セッションが存在するか確認
#[tauri::command]
fn has_walletconnect_session() -> Result<bool, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, WALLETCONNECT_KEY)
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

// ============================================================
// Tauri アプリエントリポイント
// ============================================================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_external,
            is_encryption_available,
            save_walletconnect_session,
            load_walletconnect_session,
            delete_walletconnect_session,
            has_walletconnect_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
