import { signInWithCustomToken, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { ethers } from 'ethers';
import { getFirebaseAuth, getApiUrl, DB_ROOT } from './FirebaseService';

export type LoginType = 'wallet' | 'google' | 'guest';

export interface AuthState {
  user: User | null;
  loginType: LoginType | null;
  loading: boolean;
}

const LOGIN_TYPE_KEY = 'auth_login_type';
const GUEST_UID_KEY = 'auth_guest_uid';
const LOGIN_IDENTIFIER_KEY = 'auth_login_identifier';

export class AuthService {
  // ============================================================
  // WalletConnect ログイン
  // ============================================================
  static async signInWithWallet(signer: ethers.Signer): Promise<User> {
    const address = await signer.getAddress();
    const normalizedAddress = address.toLowerCase();

    // 1. nonce 取得
    const nonceRes = await fetch(`${getApiUrl('getNonce')}?address=${normalizedAddress}`);
    if (!nonceRes.ok) throw new Error('Failed to get nonce');
    const { nonce } = await nonceRes.json() as { nonce: string };

    // 2. 署名
    const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
    const signature = await signer.signMessage(message);

    // 3. UUID付き Custom Token 取得
    const verifyRes = await fetch(getApiUrl('verifyWalletConnect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: normalizedAddress, signature, message, dbRoot: DB_ROOT }),
    });
    if (!verifyRes.ok) {
      const err = await verifyRes.json() as { error: string };
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
  // ============================================================
  static async signInWithGoogle(accessToken: string): Promise<User> {
    const res = await fetch(getApiUrl('verifyGoogleToken'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, dbRoot: DB_ROOT }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error || 'Google login failed');
    }
    const { customToken } = await res.json() as { customToken: string };

    // Google メールアドレス取得
    let email = '';
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userInfoRes.ok) {
        const info = await userInfoRes.json() as { email?: string };
        email = info.email || '';
      }
    } catch { /* ignore */ }

    const auth = getFirebaseAuth();
    const credential = await signInWithCustomToken(auth, customToken);
    localStorage.setItem(LOGIN_TYPE_KEY, 'google');
    localStorage.setItem(LOGIN_IDENTIFIER_KEY, email);
    localStorage.removeItem(GUEST_UID_KEY);
    return credential.user;
  }

  // ============================================================
  // ゲストとして開始（login_t にデータなし）
  // ============================================================
  static async startAsGuest(): Promise<User> {
    const res = await fetch(getApiUrl('startAsGuest'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbRoot: DB_ROOT }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error || 'Failed to start as guest');
    }
    const { customToken, userId } = await res.json() as { customToken: string; userId: string };

    const auth = getFirebaseAuth();
    const credential = await signInWithCustomToken(auth, customToken);
    localStorage.setItem(LOGIN_TYPE_KEY, 'guest');
    localStorage.setItem(GUEST_UID_KEY, userId);
    return credential.user;
  }

  // ============================================================
  // アカウント連携（ゲスト → wallet/google/line）
  // ============================================================

  /**
   * Google/LINE連携用。loginKeyはOAuth側のユーザーID。
   */
  static async linkLogin(
    loginType: 'google',
    loginKey: string,
  ): Promise<void> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const idToken = await user.getIdToken();
    const res = await fetch(getApiUrl('linkLogin'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ loginType, loginKey, dbRoot: DB_ROOT }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error || 'Link failed');
    }
    localStorage.setItem(LOGIN_TYPE_KEY, loginType);
    localStorage.removeItem(GUEST_UID_KEY);
  }

  /**
   * WalletConnect連携用。ログインと同様にnonce+署名検証を行う。
   */
  static async linkWallet(signer: ethers.Signer): Promise<void> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const address = await signer.getAddress();
    const normalizedAddress = address.toLowerCase();

    // 1. nonce取得
    const nonceRes = await fetch(`${getApiUrl('getNonce')}?address=${normalizedAddress}`);
    if (!nonceRes.ok) throw new Error('Failed to get nonce');
    const { nonce } = await nonceRes.json() as { nonce: string };

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
    return onAuthStateChanged(auth, callback);
  }

  static getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  }
}
