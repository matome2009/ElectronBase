import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useDisconnect } from 'wagmi';
import { checkVersion, shouldShowNotify, VersionCheckResult } from '../services/VersionCheckService';
import { checkMaintenance, MaintenanceStatus } from '../services/MaintenanceService';
import { LoggingService } from '../services/LoggingService';
import Header from '../components/Header';
import Sidebar, { View } from '../components/Sidebar';
import DashboardView from './DashboardView';
import AccountLinkView from './AccountLinkView';
import CoreSettingsView from './CoreSettingsView';
import VersionUpdateDialog from '../components/VersionUpdateDialog';
import MaintenanceDialog from '../components/MaintenanceDialog';
import { AuthService } from '../services/AuthService';
import { ADMIN_CONSOLE_URL } from '../config/app';
import { ENABLE_CONTACTS, ENABLE_INBOX, ENABLE_WORKSPACE } from '../config/features';
import { openExternal } from '../services/TauriService';

const OptionalWorkspaceView = lazy(() => import('../optional/views/SettingsView'));
const OptionalInboxView = lazy(() => import('../optional/views/InboxView'));
const OptionalContactsView = lazy(() => import('../optional/views/ContactsView'));

const OptionalViewFallback: React.FC = () => (
  <div className="min-h-[240px] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
  </div>
);

const MainLayout: React.FC = () => {
  const normalizeView = (value: string | null): View => {
    if (value === 'top') return 'dashboard';
    if (value === 'workspace') return ENABLE_WORKSPACE ? 'workspace' : 'dashboard';
    if (value === 'inbox') return ENABLE_INBOX ? 'inbox' : 'dashboard';
    if (value === 'contacts') return ENABLE_CONTACTS ? 'contacts' : 'dashboard';
    if (value === 'account-link' || value === 'settings' || value === 'dashboard') return value;
    return 'dashboard';
  };

  const [currentView, setCurrentView] = useState<View>(() => {
    // プラン購入から戻ってきた場合、optional workspace を優先表示
    const params = new URLSearchParams(window.location.search);
    if (params.get('plan') === 'success' || params.get('plan') === 'cancel') {
      return ENABLE_WORKSPACE ? 'workspace' : 'dashboard';
    }
    return normalizeView(sessionStorage.getItem('currentView'));
  });
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceInitialAddress, setWorkspaceInitialAddress] = useState<string | undefined>();
  const workspaceScrollTo: 'plan' | undefined = undefined;

  const { disconnect } = useDisconnect();

  const changeView = (v: View) => {
    setCurrentView(v);
    sessionStorage.setItem('currentView', v);
    setSidebarOpen(false);
  };

  // URLパラメータをクリア（F5リロード時に再遷移しないよう）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('plan')) {
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // 起動時チェック
  useEffect(() => {
    const init = async () => {
      try {
        const result = await checkVersion();
        if (result && result.updateType !== 'ok') {
          if (result.updateType !== 'notify' || shouldShowNotify()) {
            setVersionCheck(result);
          }
        }
      } catch (e) {
        LoggingService.error('MainLayout: バージョンチェック失敗', { e });
      }
      try {
        const uid = AuthService.getCurrentUser()?.uid;
        const result = await checkMaintenance(uid);
        if (result.maintenance) setMaintenanceStatus(result);
      } catch (e) {
        LoggingService.error('MainLayout: メンテナンスチェック失敗', { e });
      }
    };
    init();
  }, []);


  const handleDisconnect = () => disconnect();

  const renderView = () => {
    switch (currentView) {
      case 'account-link':
        return <AccountLinkView onLinked={handleLinked} />;
      case 'workspace':
        return ENABLE_WORKSPACE ? (
          <OptionalWorkspaceView initialAddress={workspaceInitialAddress} scrollTo={workspaceScrollTo} />
        ) : (
          <DashboardView
            adminEnabled={!!ADMIN_CONSOLE_URL}
            onNavigateLinkAccount={() => changeView('account-link')}
            onNavigateWorkspace={() => changeView('workspace')}
            onNavigateInbox={() => changeView('inbox')}
            onNavigateContacts={() => changeView('contacts')}
            onOpenAdmin={handleOpenAdmin}
          />
        );
      case 'inbox':
        return ENABLE_INBOX ? (
          <OptionalInboxView onNavigateSettings={(addr) => { setWorkspaceInitialAddress(addr); changeView('workspace'); }} />
        ) : (
          <DashboardView
            adminEnabled={!!ADMIN_CONSOLE_URL}
            onNavigateLinkAccount={() => changeView('account-link')}
            onNavigateWorkspace={() => changeView('workspace')}
            onNavigateInbox={() => changeView('inbox')}
            onNavigateContacts={() => changeView('contacts')}
            onOpenAdmin={handleOpenAdmin}
          />
        );
      case 'contacts':
        return ENABLE_CONTACTS ? <OptionalContactsView /> : (
          <DashboardView
            adminEnabled={!!ADMIN_CONSOLE_URL}
            onNavigateLinkAccount={() => changeView('account-link')}
            onNavigateWorkspace={() => changeView('workspace')}
            onNavigateInbox={() => changeView('inbox')}
            onNavigateContacts={() => changeView('contacts')}
            onOpenAdmin={handleOpenAdmin}
          />
        );
      case 'settings':
        return (
          <CoreSettingsView
            onNavigateLinkAccount={() => changeView('account-link')}
            onOpenAdmin={handleOpenAdmin}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardView
            adminEnabled={!!ADMIN_CONSOLE_URL}
            onNavigateLinkAccount={() => changeView('account-link')}
            onNavigateWorkspace={() => changeView('workspace')}
            onNavigateInbox={() => changeView('inbox')}
            onNavigateContacts={() => changeView('contacts')}
            onOpenAdmin={handleOpenAdmin}
          />
        );
    }
  };

  const handleLinked = () => {
    changeView('dashboard');
  };

  const handleOpenAdmin = () => {
    if (ADMIN_CONSOLE_URL) {
      void openExternal(ADMIN_CONSOLE_URL);
    }
  };

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
          onOpenAdmin={handleOpenAdmin}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onDisconnect={handleDisconnect}
          onMenuClick={() => setSidebarOpen(v => !v)}
        />
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <Suspense fallback={<OptionalViewFallback />}>
            {renderView()}
          </Suspense>
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
