import React from 'react';
import { useTranslation } from 'react-i18next';
import { ADMIN_CONSOLE_URL, APP_DESCRIPTION, APP_WEBSITE_URL, getMarketingPageUrl } from '../config/app';
import { getEnabledOptionalFeatureKeys } from '../config/features';
import { AuthService } from '../services/AuthService';
import { getFirebaseAuth } from '../services/FirebaseService';
import { openExternal } from '../services/TauriService';

interface CoreSettingsViewProps {
  onNavigateLinkAccount: () => void;
  onOpenAdmin: () => void;
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

const CoreSettingsView: React.FC<CoreSettingsViewProps> = ({ onNavigateLinkAccount, onOpenAdmin }) => {
  const { t, i18n } = useTranslation();
  const currentUser = getFirebaseAuth().currentUser;
  const isGuest = AuthService.isGuest();
  const loginType = AuthService.getLoginType();
  const loginIdentifier = AuthService.getLoginIdentifier();
  const optionalFeatures = getEnabledOptionalFeatureKeys().map((key) => t(`dashboard.optionalFeature.${key}`));
  const privacyUrl = getMarketingPageUrl('privacy-policy.html', i18n.language);
  const commerceUrl = getMarketingPageUrl('commercial-law.html', i18n.language);

  const loginTypeLabel =
    loginType === 'wallet'
      ? t('coreSettings.loginType.wallet')
      : loginType === 'google'
        ? t('coreSettings.loginType.google')
        : t('coreSettings.loginType.guest');

  const openUrl = (url: string | null) => {
    if (url) {
      void openExternal(url);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">{t('coreSettings.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('coreSettings.subtitle')}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">{t('coreSettings.account')}</h3>
          <div className="mt-4 space-y-4">
            <InfoRow label={t('coreSettings.loginMethod')} value={loginTypeLabel} mono={false} />
            <InfoRow label={t('coreSettings.loginIdentifier')} value={loginIdentifier || '-'} />
            <InfoRow label={t('coreSettings.userId')} value={currentUser?.uid || '-'} />
          </div>
          {isGuest && (
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-900">{t('coreSettings.guestMode')}</p>
              <p className="text-xs text-amber-700 mt-1">{t('coreSettings.guestModeDescription')}</p>
              <button
                type="button"
                onClick={onNavigateLinkAccount}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
              >
                {t('coreSettings.linkAccount')}
              </button>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">{t('coreSettings.application')}</h3>
          <p className="text-sm text-gray-500 mt-1">{APP_DESCRIPTION}</p>
          <div className="mt-4 space-y-4">
            <InfoRow label={t('coreSettings.version')} value={APP_VERSION} />
            <InfoRow label={t('coreSettings.environment')} value={import.meta.env.VITE_ENV || 'development'} />
            <InfoRow
              label={t('coreSettings.runtime')}
              value={('__TAURI_INTERNALS__' in window || '__TAURI__' in window) ? t('coreSettings.desktop') : t('coreSettings.web')}
              mono={false}
            />
          </div>
        </section>
      </div>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">{t('coreSettings.links')}</h3>
        <div className="flex flex-wrap gap-3 mt-4">
          {APP_WEBSITE_URL && (
            <button
              type="button"
              onClick={() => openUrl(APP_WEBSITE_URL)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('coreSettings.website')}
            </button>
          )}
          {privacyUrl && (
            <button
              type="button"
              onClick={() => openUrl(privacyUrl)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('coreSettings.privacyPolicy')}
            </button>
          )}
          {commerceUrl && (
            <button
              type="button"
              onClick={() => openUrl(commerceUrl)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('coreSettings.commercialLaw')}
            </button>
          )}
          {ADMIN_CONSOLE_URL && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              {t('coreSettings.adminConsole')}
            </button>
          )}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">{t('coreSettings.optionalFeatures')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('coreSettings.optionalFeaturesSubtitle')}</p>
        {optionalFeatures.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {optionalFeatures.map((label) => (
              <span key={label} className="px-3 py-1 rounded-full bg-blue-50 text-xs font-medium text-blue-700">
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-4">{t('coreSettings.noOptionalFeatures')}</p>
        )}
      </section>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = true }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`mt-1 text-sm text-gray-900 break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
  </div>
);

export default CoreSettingsView;
