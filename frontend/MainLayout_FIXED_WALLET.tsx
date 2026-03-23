// 修正版 MainLayout.tsx
// このファイルの内容を frontend/src/renderer/components/MainLayout.tsx にコピーしてください

import React, { useState, useEffect } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import Header from './Header';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import SessionList from './SessionList';
import Configuration from './Configuration';
import CsvImport from './CsvImport';
import PrivateKeyWallet from './PrivateKeyWallet';
import VerifiedAddressesView from './VerifiedAddressesView';

type View = 'dashboard' | 'sessions' | 'import' | 'configuration' | 'verified-addresses';

const MainLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
  const [showConnectionChoice, setShowConnectionChoice] = useState(false);
  const [privateKeyWallet, setPrivateKeyWallet] = useState<{ address: string; signer: ethers.Wallet } | null>(null);
  const [wagmiWallet, setWagmiWallet] = useState<{ address: string; signer: any; provider: any } | null>(null);

  const { open } = useWeb3Modal();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const isConnected = wagmiConnected || !!privateKeyWallet;
  const address = wagmiAddress || privateKeyWallet?.address;
  const chainName = 'Ethereum';

  // wagmiの接続をwallet形式に変換
  useEffect(() => {
    const setupWagmiWallet = async () => {
      if (wagmiConnected && wagmiAddress && walletClient) {
        try {
          console.log('MainLayout - wagmi接続を検出:', wagmiAddress);
          
          // wagmiのwalletClientをethers signerに変換
          const provider = new ethers.BrowserProvider(walletClient as any);
          const signer = await provider.getSigner();
          
          setWagmiWallet({
            address: wagmiAddress,
            signer,
            provider
          });
          
          console.log('MainLayout - wagmiWallet設定完了:', wagmiAddress);
        } catch (error) {
          console.error('MainLayout - wagmiWallet設定エラー:', error);
        }
      } else {
        setWagmiWallet(null);
      }
    };

    setupWagmiWallet();
  }, [wagmiConnected, wagmiAddress, walletClient]);

  const handleConnect = () => {
    setShowConnectionChoice(true);
  };

  const handleWalletConnectChoice = () => {
    setShowConnectionChoice(false);
    open();
  };

  const handlePrivateKeyChoice = () => {
    setShowConnectionChoice(false);
    setShowPrivateKeyDialog(true);
  };

  const handlePrivateKeyConnect = (wallet: { address: string; signer: ethers.Wallet }) => {
    setPrivateKeyWallet(wallet);
    setShowPrivateKeyDialog(false);
  };

  const handleDisconnect = () => {
    if (privateKeyWallet) {
      setPrivateKeyWallet(null);
    } else {
      wagmiDisconnect();
    }
  };

  const renderView = () => {
    // SessionList用のウォレットを準備
    // 優先順位: privateKeyWallet > wagmiWallet
    const walletForSession = privateKeyWallet || wagmiWallet;
    
    console.log('MainLayout - renderView');
    console.log('MainLayout - privateKeyWallet:', privateKeyWallet);
    console.log('MainLayout - wagmiWallet:', wagmiWallet);
    console.log('MainLayout - walletForSession:', walletForSession);

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'sessions':
        return <SessionList wallet={walletForSession} />;
      case 'import':
        return <CsvImport />;
      case 'configuration':
        return <Configuration />;
      case 'verified-addresses':
        return <VerifiedAddressesView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 flex flex-col">
        <Header
          isConnected={isConnected}
          address={address}
          chainName={chainName}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <main className="flex-1 overflow-auto p-6">
          {renderView()}
        </main>
      </div>
      {showConnectionChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">ウォレット接続方法を選択</h2>
            <div className="space-y-3">
              <button
                onClick={handleWalletConnectChoice}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                WalletConnect (QRコード)
              </button>
              <button
                onClick={handlePrivateKeyChoice}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                秘密鍵で接続 (テスト用)
              </button>
              <button
                onClick={() => setShowConnectionChoice(false)}
                className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrivateKeyDialog && (
        <PrivateKeyWallet
          onConnect={handlePrivateKeyConnect}
          onCancel={() => setShowPrivateKeyDialog(false)}
        />
      )}
    </div>
  );
}

export default MainLayout;
