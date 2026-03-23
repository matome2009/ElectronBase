import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ethers } from 'ethers';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { AuthService } from '../services/AuthService';
import LanguageSwitcher from './LanguageSwitcher';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'wallet' | 'google' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  // WalletConnect接続後に自動ログイン
  const loginAttemptedRef = React.useRef(false);

  useEffect(() => {
    if (!isConnected || !walletClient) {
      loginAttemptedRef.current = false;
      return;
    }
    if (loginAttemptedRef.current) return;
    loginAttemptedRef.current = true;

    let cancelled = false;
    const doLogin = async () => {
      setLoading(true);
      setLoadingType('wallet');
      setError(null);
      await new Promise(r => setTimeout(r, 800));
      if (cancelled) return;
      try {
        const provider = new ethers.BrowserProvider(walletClient as any);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        if (!addr) throw new Error(t('login.addressFailed'));
        await AuthService.signInWithWallet(signer);
        if (!cancelled) onLogin();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('login.loginFailed'));
          loginAttemptedRef.current = false;
          disconnect();
        }
      } finally {
        if (!cancelled) { setLoading(false); setLoadingType(null); }
      }
    };
    doLogin();
    return () => { cancelled = true; };
  }, [isConnected, walletClient]);

  const handleWalletConnect = () => {
    setError(null);
    if (isConnected) disconnect();
    open();
  };

  // Google ログイン（リダイレクトフロー — popupはCOOP制約で使用不可）
  const handleGoogleLogin = () => {
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem('google_oauth_state', state);
    const redirectUri = encodeURIComponent(`${window.location.origin}/`);
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?response_type=token` +
      `&client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=openid email profile` +
      `&state=${state}`;
    window.location.href = googleAuthUrl;
  };

  // Google コールバック処理（URLハッシュにアクセストークン）
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;
    const params = new URLSearchParams(hash.slice(1));
    const state = params.get('state');
    const accessToken = params.get('access_token');
    if (!accessToken) return;

    const googleState = sessionStorage.getItem('google_oauth_state');
    if (state === googleState) {
      sessionStorage.removeItem('google_oauth_state');
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(true);
      setLoadingType('google');
      setError(null);
      AuthService.signInWithGoogle(accessToken)
        .then(() => onLogin())
        .catch(e => setError(e instanceof Error ? e.message : t('login.loginFailed')))
        .finally(() => { setLoading(false); setLoadingType(null); });
    }
  }, []);

  // ゲストとして開始
  const handleGuestLogin = async () => {
    setLoading(true);
    setLoadingType('guest');
    setError(null);
    try {
      await AuthService.startAsGuest();
      onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.loginFailed'));
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const isButtonLoading = (type: typeof loadingType) => loading && loadingType === type;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-gray-500 mt-2 text-sm">{t('login.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* WalletConnect */}
          <button
            onClick={handleWalletConnect}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isButtonLoading('wallet') ? (
              <><Spinner />{t('login.signing')}</>
            ) : (
              <><span>🔗</span>{t('login.walletConnectLogin')}</>
            )}
          </button>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isButtonLoading('google') ? (
              <><Spinner />{t('login.processing')}</>
            ) : (
              <><GoogleIcon />{t('login.googleLogin')}</>
            )}
          </button>

          {/* ゲスト */}
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-600 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isButtonLoading('guest') ? (
              <><Spinner />{t('login.processing')}</>
            ) : (
              <><span>👤</span>{t('login.guestLogin')}</>
            )}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-400">{t('login.guestNote')}</p>
      </div>
    </div>
  );
};

const Spinner: React.FC = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const GoogleIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default LoginScreen;
