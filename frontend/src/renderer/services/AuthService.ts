import { signInWithCustomToken, signInWithPopup, getRedirectResult, signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { ethers } from 'ethers';
import { getFirebaseAuth, getApiUrl, DB_ROOT } from './FirebaseService';
import { LoggingService } from './LoggingService';

export type LoginType = 'wallet' | 'google' | 'guest';

export interface AuthState {
  user: User | null;
  loginType: LoginType | null;
  loading: boolean;
}

const LOGIN_TYPE_KEY = 'auth_login_type';
const GUEST_UID_KEY = 'auth_guest_uid';
const LOGIN_IDENTIFIER_KEY = 'auth_login_identifier';
// Tauri リダイレクト時にゲストのidTokenを一時保存するキー
const PENDING_LINK_KEY = 'auth_pending_link_guest_token';

// Tauri 環境判定（Tauri v2 では __TAURI_INTERNALS__ が存在する）
const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

export class AuthService {
  // Google ログイン中は onAuthStateChanged に一時的な Google ユーザーを漏らさないためのフラグ
  private static _pendingSignIn = false;

  // ============================================================
  // WalletConnect ログイン
  // ============================================================
  static async signInWithWallet(signer: ethers.Signer, signal?: AbortSignal): Promise<User> {
    const address = await signer.getAddress();
    const normalizedAddress = address.toLowerCase();

    // 1. フロントエンドでnonce生成（サーバーへの往復不要）
    const nonce = crypto.randomUUID();
    const issuedAt = Date.now();

    // 2. 署名
    const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
    const signature = await signer.signMessage(message);

    // 3. UUID付き Custom Token 取得（nonceはバックエンドでリプレイ攻撃対策に使用）
    const verifyRes = await fetch(getApiUrl('verifyWalletConnect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: normalizedAddress, signature, message, issuedAt, dbRoot: DB_ROOT }),
      signal,
    });
    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      LoggingService.error('verifyWalletConnectエラー', err);
      throw new Error(err.error || 'Signature verification failed');
    }
    const { customToken } = await verifyRes.json() as { customToken: string };

    // 4. Firebase サインイン
    const auth = getFirebaseAuth();
    const credential = await signInWithCustomToken(auth, customToken);
    localStorage.setItem(LOGIN_TYPE_KEY, 'wallet');
    localStorage.setItem(LOGIN_IDENTIFIER_KEY, normalizedAddress);
    localStorage.removeItem(GUEST_UID_KEY);
    return credential.user;
  }

  // ============================================================
  // Google ログイン
  // - Web:   signInWithPopup（既存動作）
  // - Tauri: signInWithRedirect（WebViewはpopupをブロックするため）
  //          リダイレクト結果は handleGoogleRedirectResult() で処理する
  // ============================================================
  // ============================================================
  // Tauri用: Rust が取得した auth code を Cloud Function に渡してサインイン
  // Cloud Function がトークン交換・検証を行い、custom token を返す
  // ============================================================
  static async signInWithGoogleAuthCode(code: string, codeVerifier: string, redirectUri: string): Promise<User> {
    const auth = getFirebaseAuth();
    AuthService._pendingSignIn = true;
    try {
      const res = await fetch(getApiUrl('exchangeGoogleAuthCode'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, codeVerifier, redirectUri, dbRoot: DB_ROOT }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || 'Google sign-in failed');
      }
      const { customToken } = await res.json() as { customToken: string };

      const credential = await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'google');
      if (credential.user.email) localStorage.setItem(LOGIN_IDENTIFIER_KEY, credential.user.email);
      localStorage.removeItem(GUEST_UID_KEY);
      AuthService._pendingSignIn = false;
      return credential.user;
    } catch (e) {
      AuthService._pendingSignIn = false;
      await signOut(auth).catch((err) => { LoggingService.warn('signOut failed during error recovery', { err }); });
      throw e;
    }
  }

  // ============================================================
  // Tauri用: Google Identity Services から受け取ったアクセストークンでサインイン
  // LoginScreen が useGoogleLogin フックで取得したトークンをここに渡す
  // ============================================================
  static async signInWithGoogleAccessToken(accessToken: string): Promise<User> {
    const auth = getFirebaseAuth();
    AuthService._pendingSignIn = true;
    try {
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const result = await signInWithCredential(auth, credential);
      const idToken = await result.user.getIdToken();
      const email = result.user.email;

      const res = await fetch(getApiUrl('verifyGoogleToken'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, dbRoot: DB_ROOT }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || 'Google sign-in failed');
      }
      const { customToken } = await res.json() as { customToken: string };

      const finalCredential = await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'google');
      if (email) localStorage.setItem(LOGIN_IDENTIFIER_KEY, email);
      localStorage.removeItem(GUEST_UID_KEY);
      // signInWithCustomToken 完了後に _pendingSignIn を解除し、
      // onAuthStateChanged に最終ユーザーを通知させる
      AuthService._pendingSignIn = false;
      return finalCredential.user;
    } catch (e) {
      AuthService._pendingSignIn = false;
      await signOut(auth).catch((err) => { LoggingService.warn('signOut failed during error recovery', { err }); });
      throw e;
    }
  }

  static async signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();

    if (isTauri) {
      // TauriではFirebaseのredirect/popup認証がCORSで動作しないため未対応
      throw new Error('Googleログインはデスクトップアプリではサポートされていません。WalletConnectまたはゲストログインをご利用ください。');
    }

    // Web: popup
    AuthService._pendingSignIn = true;
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();

      const res = await fetch(getApiUrl('verifyGoogleToken'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, dbRoot: DB_ROOT }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || 'Google login failed');
      }
      const { customToken } = await res.json() as { customToken: string };

      const email = result.user.email;
      const credential = await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'google');
      if (email) localStorage.setItem(LOGIN_IDENTIFIER_KEY, email);
      localStorage.removeItem(GUEST_UID_KEY);
      // signInWithCustomToken 完了後に _pendingSignIn を解除し、
      // onAuthStateChanged に最終ユーザーを通知させる
      AuthService._pendingSignIn = false;
      return credential.user;
    } catch (e) {
      AuthService._pendingSignIn = false;
      await signOut(auth).catch((err) => { LoggingService.warn('signOut failed during error recovery', { err }); });
      throw e;
    }
  }

  // ============================================================
  // Tauri Google リダイレクト結果の処理
  // App.tsx 起動時に必ず呼ぶ。リダイレクト結果がない場合は何もしない。
  // ログイン・連携のどちらのリダイレクト結果にも対応する。
  // ============================================================
  static async handleGoogleRedirectResult(): Promise<void> {
    // Tauri環境ではリダイレクト認証がCORSで動作しないためスキップ
    if (isTauri) return;

    const auth = getFirebaseAuth();
    // 処理中は onAuthStateChanged を抑制
    AuthService._pendingSignIn = true;
    try {
      // AppImage など WebView 環境では Firebase の内部 iframe がタイムアウトすることがある。
      // 10秒以内に結果が返らない場合はリダイレクト結果なしとして扱う。
      const result = await Promise.race([
        getRedirectResult(auth),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
      ]);
      if (!result) {
        // リダイレクト結果なし（通常起動）→ 抑制を解除してそのまま終了
        AuthService._pendingSignIn = false;
        return;
      }

      const googleIdToken = await result.user.getIdToken();
      const googleEmail = result.user.email;

      // 連携フロー: リダイレクト前に保存したゲストトークンが存在する場合
      const pendingRaw = localStorage.getItem(PENDING_LINK_KEY);
      let pendingGuestToken: string | null = null;
      if (pendingRaw) {
        const { token, userId } = JSON.parse(pendingRaw) as { token: string; userId: string };
        if (userId !== result.user.uid) {
          // 所有者が違う → 別ユーザーの残存データなので破棄
          LoggingService.warn('PENDING_LINK_KEY の所有者が一致しないため破棄', { storedUserId: userId, currentUid: result.user.uid });
          localStorage.removeItem(PENDING_LINK_KEY);
        } else {
          pendingGuestToken = token;
        }
      }
      if (pendingGuestToken) {
        localStorage.removeItem(PENDING_LINK_KEY);
        const linkRes = await fetch(getApiUrl('linkLogin'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pendingGuestToken}`,
          },
          body: JSON.stringify({ loginType: 'google', loginKey: googleIdToken, dbRoot: DB_ROOT }),
        });
        if (!linkRes.ok) {
          const err = await linkRes.json() as { error: string };
          throw new Error(err.error || 'Google link failed');
        }
      }

      // 新規ログイン・連携後共通: カスタムトークンでサインイン
      const verifyRes = await fetch(getApiUrl('verifyGoogleToken'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: googleIdToken, dbRoot: DB_ROOT }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json() as { error: string };
        throw new Error(err.error || 'Google sign-in failed');
      }
      const { customToken } = await verifyRes.json() as { customToken: string };

      await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'google');
      if (googleEmail) localStorage.setItem(LOGIN_IDENTIFIER_KEY, googleEmail);
      localStorage.removeItem(GUEST_UID_KEY);
      // signInWithCustomToken 完了後に解除
      AuthService._pendingSignIn = false;
    } catch (e) {
      AuthService._pendingSignIn = false;
      localStorage.removeItem(PENDING_LINK_KEY);
      throw e;
    }
  }

  // ============================================================
  // ゲストとして開始（login_t にデータなし）
  // ============================================================
  static async startAsGuest(): Promise<User> {
    const url = getApiUrl('startAsGuest');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbRoot: DB_ROOT }),
      });
      const responseText = await res.text();
      if (!res.ok) {
        let errorMessage = responseText || 'Failed to start as guest';
        try {
          const err = JSON.parse(responseText) as { error?: string };
          if (err.error) errorMessage = err.error;
        } catch {
          // Keep raw response text when the body is not JSON.
        }
        throw new Error(errorMessage);
      }
      const { customToken, userId } = JSON.parse(responseText) as { customToken: string; userId: string };

      const auth = getFirebaseAuth();
      const credential = await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'guest');
      localStorage.setItem(GUEST_UID_KEY, userId);
      return credential.user;
    } catch (e) {
      LoggingService.error(e instanceof Error ? e : String(e), {
        flow: 'startAsGuest',
        url,
        dbRoot: DB_ROOT,
      });
      throw e;
    }
  }

  // ============================================================
  // アカウント連携（ゲスト → wallet/google/line）
  // ============================================================

  /**
   * Tauri用: PKCE auth code でGoogle連携。
   * Cloud Function が auth code 交換 + 連携を一括処理して custom token を返す。
   */
  static async linkWithGoogleAuthCode(code: string, codeVerifier: string, redirectUri: string): Promise<void> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const idToken = await user.getIdToken();
    AuthService._pendingSignIn = true;
    try {
      const res = await fetch(getApiUrl('linkGoogleAuthCode'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code, codeVerifier, redirectUri, dbRoot: DB_ROOT }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || 'Google link failed');
      }
      const { customToken } = await res.json() as { customToken: string };

      await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'google');
      localStorage.removeItem(GUEST_UID_KEY);
      AuthService._pendingSignIn = false;
    } catch (e) {
      AuthService._pendingSignIn = false;
      throw e;
    }
  }

  /**
   * Google連携。
   * - Web:   signInWithPopup でGoogleトークン取得 → linkLogin → カスタムトークンで再サインイン
   * - Tauri: invoke で PKCE フロー → linkWithGoogleAuthCode を使うこと
   */
  static async linkWithGoogle(): Promise<void> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    if (isTauri) {
      // Tauri では signInWithRedirect が使えないため、呼び出し側で linkWithGoogleAuthCode を使うこと
      throw new Error('TAURI_USE_AUTH_CODE');
    }

    // Web: popup
    const guestIdToken = await user.getIdToken();
    AuthService._pendingSignIn = true;
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const googleIdToken = await result.user.getIdToken();
      const googleEmail = result.user.email;

      const linkRes = await fetch(getApiUrl('linkLogin'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestIdToken}`,
        },
        body: JSON.stringify({ loginType: 'google', loginKey: googleIdToken, dbRoot: DB_ROOT }),
      });
      if (!linkRes.ok) {
        const err = await linkRes.json() as { error: string };
        throw new Error(err.error || 'Google link failed');
      }

      const verifyRes = await fetch(getApiUrl('verifyGoogleToken'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: googleIdToken, dbRoot: DB_ROOT }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json() as { error: string };
        throw new Error(err.error || 'Failed to sign in after Google link');
      }
      const { customToken } = await verifyRes.json() as { customToken: string };

      await signInWithCustomToken(auth, customToken);
      localStorage.setItem(LOGIN_TYPE_KEY, 'google');
      if (googleEmail) localStorage.setItem(LOGIN_IDENTIFIER_KEY, googleEmail);
      localStorage.removeItem(GUEST_UID_KEY);
      // signInWithCustomToken 完了後に解除
      AuthService._pendingSignIn = false;
    } catch (e) {
      AuthService._pendingSignIn = false;
      throw e;
    }
  }

  /**
   * WalletConnect連携用。フロントエンドでnonce生成 → 署名 → バックエンドで検証。
   */
  static async linkWallet(signer: ethers.Signer): Promise<void> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const address = await signer.getAddress();
    const normalizedAddress = address.toLowerCase();

    // 1. フロントエンドでnonce生成
    const nonce = crypto.randomUUID();

    // 2. 署名（ログインと同じメッセージ形式）
    const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
    const signature = await signer.signMessage(message);

    // 3. バックエンドで署名検証 + login_t 追加
    const idToken = await user.getIdToken();
    const res = await fetch(getApiUrl('linkLogin'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        loginType: 'wallet',
        loginKey: normalizedAddress,
        signature,
        message,
        dbRoot: DB_ROOT,
      }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error || 'Link failed');
    }
    localStorage.setItem(LOGIN_TYPE_KEY, 'wallet');
    localStorage.removeItem(GUEST_UID_KEY);
  }

  // ============================================================
  // サインアウト
  // ============================================================
  static async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await signOut(auth);
    localStorage.removeItem(LOGIN_TYPE_KEY);
    localStorage.removeItem(GUEST_UID_KEY);
    localStorage.removeItem(LOGIN_IDENTIFIER_KEY);
  }

  // ============================================================
  // ユーティリティ
  // ============================================================
  static isGuest(): boolean {
    return localStorage.getItem(LOGIN_TYPE_KEY) === 'guest';
  }

  static getLoginType(): LoginType | null {
    return (localStorage.getItem(LOGIN_TYPE_KEY) as LoginType) || null;
  }

  static getLoginIdentifier(): string | null {
    return localStorage.getItem(LOGIN_IDENTIFIER_KEY) || null;
  }

  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => {
      if (AuthService._pendingSignIn) return;
      callback(user);
    });
  }

  static getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  }
}
