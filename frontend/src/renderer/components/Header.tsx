import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';
import { AuthService } from '../services/AuthService';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  onDisconnect: () => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onDisconnect,
  onMenuClick,
}) => {
  const { t } = useTranslation();
  const [showGuestLogoutWarning, setShowGuestLogoutWarning] = useState(false);

  const loginType = AuthService.getLoginType();
  const loginIdentifier = AuthService.getLoginIdentifier();
  const isGuest = AuthService.isGuest();
  const { address: wagmiAddress } = useAccount();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const loginLabel =
    loginType === 'google' ? t('header.loginGoogle') : t('header.loginWallet');

  const loginDisplay =
    loginType === 'wallet'
      ? formatAddress(loginIdentifier ?? wagmiAddress ?? '')  || null
      : loginIdentifier || null;

  const handleLogout = async () => {
    if (isGuest) {
      setShowGuestLogoutWarning(true);
      return;
    }
    onDisconnect();
    await AuthService.signOut();
  };

  const handleGuestLogoutConfirm = async () => {
    setShowGuestLogoutWarning(false);
    onDisconnect();
    await AuthService.signOut();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3">
      <div className="flex items-center justify-between gap-2">
        {/* 左: ハンバーガー + タイトル */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
            aria-label={t('header.menuAriaLabel')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base md:text-xl font-bold text-gray-900 truncate">{t('header.title')}</h1>
        </div>

        {/* 右: ログイン情報 + ウォレット + ログアウト + 言語 */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* ログインユーザー表示 */}
          {isGuest ? (
            <span className="text-xs text-orange-500 font-medium hidden sm:block">{t('header.loginGuest')}</span>
          ) : loginDisplay ? (
            <div className="text-right border-r border-gray-200 pr-2 md:pr-3 hidden sm:block">
              <div className="text-xs text-gray-400">{loginLabel}</div>
              <div className="text-xs font-mono text-gray-600">{loginDisplay}</div>
            </div>
          ) : null}

          {/* ログアウト */}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            title={t('header.logout')}
          >
            <span className="hidden sm:inline">{t('header.logout')}</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          <LanguageSwitcher />
        </div>
      </div>

      {/* ゲストログアウト警告ダイアログ */}
      {showGuestLogoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('login.guestLogoutWarningTitle')}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">{t('login.guestLogoutWarningBody')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGuestLogoutWarning(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGuestLogoutConfirm}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                {t('login.guestLogoutConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
