import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { AuthService } from '../services/AuthService';
import { walletClientToSigner } from '../utils/walletClientToSigner';
import { LoggingService } from '../services/LoggingService';

const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

function translateLinkError(message: string, t: (key: string) => string): string {
  if (message === 'This login is already linked to another account') {
    return t('accountLink.alreadyLinked');
  }
  return message;
}

interface UseAccountLinkControllerOptions {
  onLinked: () => void;
}

export function useAccountLinkController({ onLinked }: UseAccountLinkControllerOptions) {
  const { t, i18n } = useTranslation();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<{ message: string; isAlreadyLinked: boolean } | null>(null);

  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  // 'idle' | 'initiated' | 'in-progress'
  // stateにするとre-renderでeffectが再発火するためrefで管理する
  const linkStateRef = useRef<'idle' | 'initiated' | 'in-progress'>('idle');

  useEffect(() => {
    if (!isConnected || !walletClient) return;
    if (linkStateRef.current !== 'initiated') return;
    linkStateRef.current = 'in-progress';

    let cancelled = false;
    const doLink = async () => {
      setError(null);
      try {
        const signer = await walletClientToSigner(walletClient);
        await AuthService.linkWallet(signer);
        if (!cancelled) {
          linkStateRef.current = 'idle';
          onLinked();
        }
      } catch (e) {
        if (!cancelled) {
          LoggingService.error('AccountLinkController linkWallet error', { e });
          const msg = e instanceof Error ? translateLinkError(e.message, t) : t('accountLink.linkFailed');
          const isAlreadyLinked = e instanceof Error && e.message === 'This login is already linked to another account';
          setError({ message: msg, isAlreadyLinked });
          linkStateRef.current = 'idle';
          setWalletLoading(false);
          disconnect();
        }
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    };
    doLink();
    return () => {
      // in-progress 中（署名・API通信中）はキャンセルしない
      // walletClient の参照更新でキャンセルされると連携中のまま固まるため
      if (linkStateRef.current !== 'in-progress') cancelled = true;
    };
  }, [isConnected, walletClient]);

  const handleLinkGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID_DESKTOP as string;
        const result = await invoke<{ code: string; codeVerifier: string; redirectUri: string }>(
          'google_oauth_via_browser', { clientId, lang: i18n.language },
        );
        await AuthService.linkWithGoogleAuthCode(result.code, result.codeVerifier, result.redirectUri);
      } else {
        await AuthService.linkWithGoogle();
      }
      onLinked();
    } catch (e) {
      LoggingService.error('AccountLinkController linkWithGoogle error', { e });
      const msg = typeof e === 'string' ? e : e instanceof Error ? translateLinkError(e.message, t) : t('accountLink.googleLinkFailed');
      const isAlreadyLinked = e instanceof Error && e.message === 'This login is already linked to another account';
      setError({ message: msg, isAlreadyLinked });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLinkWallet = () => {
    setError(null);
    setWalletLoading(true);
    linkStateRef.current = 'initiated';
    if (isConnected) disconnect();
    open();
  };

  const handleCancelWallet = () => {
    linkStateRef.current = 'idle';
    setWalletLoading(false);
    setError(null);
    disconnect();
  };

  return {
    googleLoading,
    walletLoading,
    error,
    handleLinkGoogle,
    handleLinkWallet,
    handleCancelWallet,
  };
}
