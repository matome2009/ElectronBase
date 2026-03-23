import { useState } from 'react';

export interface WalletConnectInfo {
  address: string;
  chainId: string;
  provider: any;
}

export const useWalletConnect = () => {
  const [walletConnect, setWalletConnect] = useState<WalletConnectInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [uri, setUri] = useState<string>('');

  const connect = async () => {
    setIsConnecting(true);
    try {
      // 動的インポートでWalletConnect SDKを読み込む
      const { default: EthereumProvider } = await import('@walletconnect/ethereum-provider');
      
      const provider = await EthereumProvider.init({
        projectId: '1deeae95c54f33e5e3f5f3310982191e',
        chains: [1], // Ethereum メインネット
        optionalChains: [137, 42161, 10, 56], // Polygon, Arbitrum, Optimism, BSC（オプションチェーン）
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'light' as const
        }
      });

      // QRコードのURIを取得してモーダルに表示
      provider.on('display_uri', (uri: string) => {
        console.log('WalletConnect URI:', uri);
        setUri(uri);
      });

      // ウォレットに接続
      await provider.enable();

      const accounts = provider.accounts;
      const chainId = String(provider.chainId);

      if (accounts && accounts.length > 0) {
        setWalletConnect({
          address: accounts[0],
          chainId,
          provider
        });
      }

      setIsConnecting(false);
      return provider;
    } catch (error) {
      console.error('WalletConnect error:', error);
      setIsConnecting(false);
      throw error;
    }
  };

  const disconnect = async () => {
    if (walletConnect?.provider) {
      try {
        await walletConnect.provider.disconnect();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
      setWalletConnect(null);
      setUri('');
    }
  };

  return {
    walletConnect,
    isConnecting,
    uri,
    connect,
    disconnect
  };
};
