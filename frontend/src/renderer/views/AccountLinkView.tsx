import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountLinkController } from '../controllers/useAccountLinkController';

interface AccountLinkViewProps {
  onLinked: () => void;
}

const AccountLinkView: React.FC<AccountLinkViewProps> = ({ onLinked }) => {
  const { t } = useTranslation();
  const {
    googleLoading, walletLoading, error,
    handleLinkGoogle, handleLinkWallet, handleCancelWallet,
  } = useAccountLinkController({ onLinked });

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('accountLink.title')}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {t('top.guest.description')}
      </p>

      {error && (
        <div className={`mb-4 p-4 rounded-lg border flex items-start gap-3 ${error.isAlreadyLinked ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200'}`}>
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className={`text-sm font-medium ${error.isAlreadyLinked ? 'text-red-800' : 'text-red-700'}`}>
            {error.message}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {/* Google連携 */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GoogleIcon />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('accountLink.googleAccount')}</p>
              <p className="text-xs text-gray-500">{t('accountLink.googleAccountDesc')}</p>
            </div>
          </div>
          <button
            onClick={handleLinkGoogle}
            disabled={googleLoading || walletLoading}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {googleLoading ? <><Spinner />{t('accountLink.linking')}</> : t('accountLink.linkButton')}
          </button>
        </div>

        {/* WalletConnect連携 */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{t('accountLink.walletConnect')}</p>
              <p className="text-xs text-gray-500">{t('accountLink.walletConnectDesc')}</p>
            </div>
          </div>
          {walletLoading ? (
            <button
              onClick={handleCancelWallet}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <Spinner />{t('accountLink.linking')}
              <span className="ml-1 text-xs text-gray-400">({t('common.cancel')})</span>
            </button>
          ) : (
            <button
              onClick={handleLinkWallet}
              disabled={googleLoading}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {t('accountLink.linkButton')}
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        {t('accountLink.dataNote')}
      </p>
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
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default AccountLinkView;
