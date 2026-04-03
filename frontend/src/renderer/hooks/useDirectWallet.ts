import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { LoggingService } from '../services/LoggingService';

/** EIP-1193 プロバイダー（MetaMask 等の window.ethereum）の型定義 */
interface EthereumProvider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
}

type WindowWithEthereum = Window & { ethereum?: EthereumProvider };

interface WalletState {
  address: string;
  chainId: string;
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
}

export function useDirectWallet() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);

  // MetaMask availability check
  useEffect(() => {
    const ethereum = (window as WindowWithEthereum).ethereum;
    setIsMetaMaskAvailable(!!ethereum && !!ethereum.isMetaMask);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const ethereum = (window as WindowWithEthereum).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = async (...rawArgs: unknown[]) => {
      const accounts = rawArgs[0] as string[];
      if (accounts.length === 0) {
        setWallet(null);
      } else {
        try {
          const provider = new ethers.BrowserProvider(ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          setWallet({ address, chainId: network.chainId.toString(), provider, signer });
        } catch (err) {
          LoggingService.error('アカウント変更処理エラー', { err });
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [isMetaMaskAvailable]);

  // Auto-detect existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!isMetaMaskAvailable) return;

      try {
        const ethereum = (window as WindowWithEthereum).ethereum;
        if (!ethereum) return;
        const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
        
        if (accounts.length > 0) {
          LoggingService.debug('既存接続を検出', { address: accounts[0] });
          const provider = new ethers.BrowserProvider(ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          
          setWallet({
            address,
            chainId: network.chainId.toString(),
            provider,
            signer
          });
          LoggingService.debug('ウォレット状態を自動設定完了', { address });
        }
      } catch (err) {
        LoggingService.error('既存接続チェックエラー', { err });
      }
    };

    checkExistingConnection();
  }, [isMetaMaskAvailable]);

  const connectWallet = useCallback(async () => {
    if (!isMetaMaskAvailable) {
      setError('MetaMaskがインストールされていません');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ethereum = (window as WindowWithEthereum).ethereum;
      if (!ethereum) throw new Error('MetaMaskが見つかりません');
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      
      if (accounts.length === 0) {
        throw new Error('アカウントが選択されませんでした');
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      const newWallet = {
        address,
        chainId: network.chainId.toString(),
        provider,
        signer
      };
      
      setWallet(newWallet);
      LoggingService.debug('ウォレット接続完了', { address });
      
    } catch (err) {
      LoggingService.error('ウォレット接続エラー', { err });
      setError(err instanceof Error ? err.message : 'ウォレット接続に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskAvailable]);

  return {
    wallet,
    connectWallet,
    isConnecting,
    error,
    isMetaMaskAvailable
  };
}
