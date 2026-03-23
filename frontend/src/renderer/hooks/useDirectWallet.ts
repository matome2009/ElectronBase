import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

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
    const ethereum = (window as any).ethereum;
    setIsMetaMaskAvailable(!!ethereum && ethereum.isMetaMask);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet(null);
      } else {
        try {
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
        } catch (err) {
          console.error('アカウント変更処理エラー:', err);
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
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
          console.log('既存接続を検出:', accounts[0]);
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
          console.log('ウォレット状態を自動設定完了:', address);
        }
      } catch (err) {
        console.error('既存接続チェックエラー:', err);
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
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
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
      console.log('ウォレット接続完了:', address);
      
    } catch (err: any) {
      console.error('ウォレット接続エラー:', err);
      setError(err.message || 'ウォレット接続に失敗しました');
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
