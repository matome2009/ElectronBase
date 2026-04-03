use std::{
    collections::HashMap,
};

use serde::Serialize;

// ============================================================
// 外部URL をデフォルトブラウザで開く
// ============================================================
#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|e| format!("Invalid external URL: {}", e))?;
    match parsed.scheme() {
        "http" | "https" | "mailto" | "tel" => {}
        scheme => return Err(format!("Unsupported external URL scheme: {}", scheme)),
    }

    tauri_plugin_opener::open_url(&url, None::<&str>).map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HttpBridgeResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
}

fn into_http_bridge_response(response: ureq::Response) -> Result<HttpBridgeResponse, String> {
    let status = response.status();
    let status_text = response.status_text().to_string();
    let mut headers = HashMap::new();
    for name in response.headers_names() {
        if let Some(value) = response.header(&name) {
            headers.insert(name, value.to_string());
        }
    }
    let body = response.into_string().map_err(|e| e.to_string())?;

    Ok(HttpBridgeResponse {
        status,
        status_text,
        headers,
        body,
    })
}

#[tauri::command]
async fn http_request(
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<HttpBridgeResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let method = method.unwrap_or_else(|| "GET".to_string());
        let mut request = ureq::Agent::new().request(&method, &url);

        if let Some(headers) = headers {
            for (name, value) in headers {
                request = request.set(&name, &value);
            }
        }

        let response = match body {
            Some(body) => request.send_string(&body),
            None => request.call(),
        };

        match response {
            Ok(response) => into_http_bridge_response(response),
            Err(ureq::Error::Status(_, response)) => into_http_bridge_response(response),
            Err(error) => Err(error.to_string()),
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

// ============================================================
// Google OAuth: システムブラウザで認証し、ローカルHTTPサーバーでコールバックを受け取る
// Authorization Code + PKCE フローを使用（Implicit Flow は Google が廃止）
// ============================================================
#[tauri::command]
async fn google_oauth_via_browser(client_id: String, lang: Option<String>) -> Result<serde_json::Value, String> {
    use rand::Rng;
    use sha2::{Digest, Sha256};
    use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};

    // PKCE: code_verifier を生成（43〜128文字の URL-safe ランダム文字列）
    let code_verifier: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(64)
        .map(char::from)
        .collect();

    // PKCE: code_challenge = BASE64URL(SHA256(code_verifier))
    let hash = Sha256::digest(code_verifier.as_bytes());
    let code_challenge = URL_SAFE_NO_PAD.encode(hash);

    // ランダムなポートでローカルHTTPサーバーを起動
    let server = tiny_http::Server::http("127.0.0.1:0")
        .map_err(|e| format!("Failed to start local server: {}", e))?;
    let port = server.server_addr().to_ip().map(|a| a.port()).ok_or("Failed to get port")?;
    let redirect_uri = format!("http://127.0.0.1:{}", port);

    // Authorization Code + PKCE フローの URL を構築
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile&code_challenge={}&code_challenge_method=S256&prompt=select_account",
        url::form_urlencoded::byte_serialize(client_id.as_bytes()).collect::<String>(),
        url::form_urlencoded::byte_serialize(redirect_uri.as_bytes()).collect::<String>(),
        url::form_urlencoded::byte_serialize(code_challenge.as_bytes()).collect::<String>(),
    );
    tauri_plugin_opener::open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    // コールバックで認可コードを受け取る（クエリパラメータで届くのでJSリダイレクト不要）
    let timeout = std::time::Duration::from_secs(120);
    let auth_code = loop {
        let request = server.recv_timeout(timeout)
            .map_err(|e| format!("Error waiting for OAuth callback: {}", e))?
            .ok_or_else(|| "Timeout waiting for OAuth callback".to_string())?;
        let url_str = request.url().to_string();

        let parsed = url::Url::parse(&format!("http://localhost{}", url_str))
            .map_err(|e| format!("Failed to parse callback URL: {}", e))?;

        if let Some((_, code)) = parsed.query_pairs().find(|(k, _)| k == "code") {
            let lang_code = lang.as_deref().unwrap_or("en");
            let (title, msg) = match lang_code {
                "ja" => ("ログイン成功", "このウィンドウを閉じてアプリに戻ってください。"),
                "ko" => ("로그인 성공", "이 창을 닫고 앱으로 돌아가세요."),
                "zh" => ("登录成功", "请关闭此窗口并返回应用。"),
                _ => ("Login Successful", "Please close this window and return to the app."),
            };
            let html = format!(r#"<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding-top:50px;"><h2>{}</h2><p>{}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>"#, title, msg);
            let response = tiny_http::Response::from_string(html)
                .with_header(tiny_http::Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap());
            let _ = request.respond(response);
            break code.to_string();
        } else if parsed.query_pairs().any(|(k, _)| k == "error") {
            let error = parsed.query_pairs()
                .find(|(k, _)| k == "error")
                .map(|(_, v)| v.to_string())
                .unwrap_or_else(|| "unknown_error".to_string());
            let lang_code = lang.as_deref().unwrap_or("en");
            let title = match lang_code {
                "ja" => "認証エラー",
                "ko" => "인증 오류",
                "zh" => "身份验证錯誤",
                _ => "Authentication Error",
            };
            let html = format!(r#"<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding-top:50px;"><h2>{}</h2><p>{}</p></body></html>"#, title, error);
            let response = tiny_http::Response::from_string(html)
                .with_header(tiny_http::Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap());
            let _ = request.respond(response);
            return Err(format!("OAuth error: {}", error));
        } else {
            // code も error もない（予期しないリクエスト）は無視して次を待つ
            let response = tiny_http::Response::from_string("waiting...")
                .with_header(tiny_http::Header::from_bytes("Content-Type", "text/plain").unwrap());
            let _ = request.respond(response);
        }
    };

    // auth code + PKCE 情報を返す（トークン交換は Cloud Function が行う）
    Ok(serde_json::json!({
        "code": auth_code,
        "codeVerifier": code_verifier,
        "redirectUri": redirect_uri,
    }))
}

// ============================================================
// セキュアストレージ（OS キーチェーン経由）
//   macOS  : Keychain
//   Windows: Credential Manager
//   Linux  : libsecret / keyutils
// ============================================================

const KEYRING_SERVICE: &str = "desktop-app-template";
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

// ============================================================
// DevTools を開く（デバッグ用）
// ============================================================
#[tauri::command]
fn open_devtools(webview_window: tauri::WebviewWindow) {
    webview_window.open_devtools();
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
// WebViewリロード（F5用）
// WebView2 など OS が F5 を横取りする環境向けに Rust 経由でリロードする
// ============================================================
#[tauri::command]
fn reload_app(webview_window: tauri::WebviewWindow) {
    let _ = webview_window.eval("location.reload()");
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
            http_request,
            google_oauth_via_browser,
            is_encryption_available,
            save_walletconnect_session,
            load_walletconnect_session,
            delete_walletconnect_session,
            has_walletconnect_session,
            reload_app,
            open_devtools,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
