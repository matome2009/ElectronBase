import React, { useState, useEffect } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect } from 'wagmi';
import { checkVersion, shouldShowNotify, VersionCheckResult } from '../services/VersionCheckService';
import { checkMaintenance, MaintenanceStatus } from '../services/MaintenanceService';
import Header from './Header';
import Sidebar from './Sidebar';
import TopView from './TopView';
import BillingView from './BillingView';
import AccountLinkView from './AccountLinkView';
import VersionUpdateDialog from './VersionUpdateDialog';
import MaintenanceDialog from './MaintenanceDialog';
import { AuthService } from '../services/AuthService';

type View = 'top' | 'billing' | 'account-link';

const MainLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(() => {
    // Stripe Checkout から戻ってきた場合、課金ページを表示
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success' || params.get('billing') === 'cancel') {
      return 'billing';
    }
    const saved = sessionStorage.getItem('currentView') as View | null;
    if (saved && ['top', 'billing', 'account-link'].includes(saved)) return saved;
    return 'top';
  });
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const changeView = (v: View) => {
    setCurrentView(v);
    sessionStorage.setItem('currentView', v);
    setSidebarOpen(false);
  };

  // 起動時チェック
  useEffect(() => {
    checkVersion().then(result => {
      if (!result || result.updateType === 'ok') return;
      if (result.updateType === 'notify' && !shouldShowNotify()) return;
      setVersionCheck(result);
    });
    checkMaintenance().then(result => {
      if (result.maintenance && result.status !== 2) setMaintenanceStatus(result);
    });
  }, []);

  // ウォレット接続後にメンテナンス再チェック（除外ユーザー判定）
  useEffect(() => {
    if (isConnected && address) {
      checkMaintenance(address).then(result => {
        setMaintenanceStatus(result.maintenance ? result : null);
      });
    }
  }, [isConnected, address]);

  const handleConnect = () => open();
  const handleDisconnect = () => disconnect();

  const renderView = () => {
    switch (currentView) {
      case 'billing':
        return <BillingView />;
      case 'account-link':
        return <AccountLinkView />;
      case 'top':
      default:
        return (
          <TopView
            onNavigateBilling={() => changeView('billing')}
            onNavigateLinkAccount={() => changeView('account-link')}
          />
        );
    }
  };

  const isGuest = AuthService.isGuest();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* モバイル: オーバーレイ */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 md:static md:block transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <Sidebar
          currentView={currentView}
          onViewChange={changeView}
          isGuest={isGuest}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          isConnected={isConnected}
          address={address}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onAddressClick={() => open()}
          onMenuClick={() => setSidebarOpen(v => !v)}
        />
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {renderView()}
        </main>
      </div>

      {maintenanceStatus?.maintenance && (
        <MaintenanceDialog status={maintenanceStatus} />
      )}
      {versionCheck && (
        <VersionUpdateDialog
          result={versionCheck}
          onClose={versionCheck.updateType === 'force' ? undefined : () => setVersionCheck(null)}
        />
      )}
    </div>
  );
};

export default MainLayout;
