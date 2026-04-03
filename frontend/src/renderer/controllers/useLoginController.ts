import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { AuthService } from '../services/AuthService';
import { LoggingService } from '../services/LoggingService';
import { walletClientToSigner } from '../utils/walletClientToSigner';

// Tauri v2 では __TAURI_INTERNALS__ が存在する
const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

interface UseLoginControllerOptions {
  onLogin: () => void;
}

export function useLoginController({ onLogin }: UseLoginControllerOptions) {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'wallet' | 'google' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletLoginInitiated, setWalletLoginInitiated] = useState(false);

  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  const loginAttemptedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isConnected) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      loginAttemptedRef.current = false;
      return;
    }
    if (!walletClient) return;
    if (!walletLoginInitiated) return;
    if (loginAttemptedRef.current) return;
    loginAttemptedRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const doLogin = async () => {
      setLoading(true);
      setLoadingType('wallet');
      setError(null);
      try {
        const signer = await walletClientToSigner(walletClient);
        if (controller.signal.aborted) return;
        const addr = await signer.getAddress();
        if (!addr) throw new Error(t('login.addressFailed'));
        if (controller.signal.aborted) return;
        await AuthService.signInWithWallet(signer, controller.signal);
        if (controller.signal.aborted) return;
        onLogin();
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : t('login.loginFailed'));
          loginAttemptedRef.current = false;
          disconnect();
        }
      } finally {
        if (!controller.signal.aborted) { setLoading(false); setLoadingType(null); }
      }
    };
    doLogin();
    return () => {
      if (!loginAttemptedRef.current) controller.abort();
    };
  }, [isConnected, walletClient, walletLoginInitiated]);

  const handleWalletConnect = () => {
    setError(null);
    setWalletLoginInitiated(true);
    if (isConnected) disconnect();
    open();
  };

  const handleCancelWallet = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    loginAttemptedRef.current = false;
    setWalletLoginInitiated(false);
    setLoading(false);
    setLoadingType(null);
    setError(null);
    disconnect();
  };

  const handleGoogleLoginForTauri = async () => {
    setLoading(true);
    setLoadingType('google');
    setError(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID_DESKTOP;
      const result = await invoke<{ code: string; codeVerifier: string; redirectUri: string }>(
        'google_oauth_via_browser', { clientId, lang: i18n.language },
      );
      await AuthService.signInWithGoogleAuthCode(result.code, result.codeVerifier, result.redirectUri);
      onLogin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : t('login.loginFailed');
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (isTauri) {
      handleGoogleLoginForTauri();
      return;
    }
    setLoading(true);
    setLoadingType('google');
    setError(null);
    try {
      await AuthService.signInWithGoogle();
      onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.loginFailed'));
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setLoadingType('guest');
    setError(null);
    try {
      await AuthService.startAsGuest();
      onLogin();
    } catch (e) {
      LoggingService.error(e instanceof Error ? e : String(e), {
        flow: 'guest-login',
        isTauri,
        language: i18n.language,
      });
      setError(e instanceof Error ? e.message : t('login.loginFailed'));
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const isButtonLoading = (type: typeof loadingType) => loading && loadingType === type;

  return {
    loading,
    loadingType,
    error,
    isTauri,
    handleWalletConnect,
    handleCancelWallet,
    handleGoogleLogin,
    handleGuestLogin,
    isButtonLoading,
  };
}
