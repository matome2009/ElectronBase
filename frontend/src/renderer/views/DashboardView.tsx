import React from 'react';
import { useTranslation } from 'react-i18next';
import { APP_DESCRIPTION, APP_WEBSITE_URL } from '../config/app';
import { ENABLE_CONTACTS, ENABLE_INBOX, ENABLE_WORKSPACE, getEnabledOptionalFeatureKeys } from '../config/features';
import { useDashboardController, getInfoText } from '../controllers/useDashboardController';
import { getMaintenanceMessage } from '../services/MaintenanceService';
import { openExternal } from '../services/TauriService';

interface DashboardViewProps {
  adminEnabled: boolean;
  onNavigateLinkAccount: () => void;
  onNavigateWorkspace: () => void;
  onNavigateInbox: () => void;
  onNavigateContacts: () => void;
  onOpenAdmin: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  adminEnabled,
  onNavigateLinkAccount,
  onNavigateWorkspace,
  onNavigateInbox,
  onNavigateContacts,
  onOpenAdmin,
}) => {
  const { t } = useTranslation();
  const {
    versionCheck,
    maintenance,
    informations,
    selectedInfo,
    isGuest,
    lang,
    setSelectedInfo,
  } = useDashboardController();

  const optionalFeatureLabels = getEnabledOptionalFeatureKeys().map((key) => t(`dashboard.optionalFeature.${key}`));

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-blue-600 uppercase">
              {t('dashboard.overview')}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{t('dashboard.title')}</h2>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{APP_DESCRIPTION}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminEnabled && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                {t('dashboard.openAdmin')}
              </button>
            )}
            {APP_WEBSITE_URL && (
              <button
                type="button"
                onClick={() => openExternal(APP_WEBSITE_URL)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('dashboard.openWebsite')}
              </button>
            )}
          </div>
        </div>
      </section>

      {isGuest && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-amber-900">{t('dashboard.guest.title')}</h3>
            <p className="text-sm text-amber-700 mt-1">{t('dashboard.guest.description')}</p>
          </div>
          <button
            type="button"
            onClick={onNavigateLinkAccount}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
          >
            {t('dashboard.guest.link')}
          </button>
        </section>
      )}

      {maintenance?.maintenance && (
        <section className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">{t('dashboard.maintenance.title')}</p>
            <p className="text-yellow-700 text-xs mt-1">{getMaintenanceMessage(maintenance)}</p>
          </div>
        </section>
      )}

      {versionCheck && versionCheck.updateType !== 'ok' && (
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <div>
              <p className="font-semibold text-blue-800 text-sm">{t('dashboard.version.updateAvailable')}</p>
              {versionCheck.latestVersion && (
                <p className="text-blue-600 text-xs">{t('dashboard.version.latest')}: v{versionCheck.latestVersion}</p>
              )}
            </div>
          </div>
          {versionCheck.downloadUrl && (
            <button
              type="button"
              onClick={() => openExternal(versionCheck.downloadUrl!)}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              {t('dashboard.version.download')}
            </button>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">{t('dashboard.information')}</h3>
            <p className="text-xs text-gray-500 mt-1">{t('dashboard.informationSubtitle')}</p>
          </div>
          {informations.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-400">{t('dashboard.noInformation')}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {informations.map((info) => {
                const title = getInfoText(info, lang, 'title');
                const body = getInfoText(info, lang, 'body');
                return (
                  <button
                    key={info.id}
                    type="button"
                    onClick={() => body ? setSelectedInfo(info) : undefined}
                    className={`w-full px-5 py-4 flex items-center gap-3 text-left ${body ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(info.display_start_at).toLocaleDateString(lang)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{t('dashboard.coreModules')}</h3>
            <p className="text-xs text-gray-500 mt-1">{t('dashboard.coreModulesSubtitle')}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['Google Sign-in', 'WalletConnect', 'Admin Console', 'Firebase Functions', 'TiDB', 'Tauri'].map((item) => (
                <span key={item} className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">{t('dashboard.optionalModules')}</h3>
            <p className="text-xs text-gray-500 mt-1">{t('dashboard.optionalModulesSubtitle')}</p>
            {optionalFeatureLabels.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mt-4">
                  {optionalFeatureLabels.map((label) => (
                    <span key={label} className="px-3 py-1 rounded-full bg-blue-50 text-xs font-medium text-blue-700">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {ENABLE_WORKSPACE && (
                    <button
                      type="button"
                      onClick={onNavigateWorkspace}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                      {t('dashboard.openWorkspace')}
                    </button>
                  )}
                  {ENABLE_INBOX && (
                    <button
                      type="button"
                      onClick={onNavigateInbox}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('dashboard.openInbox')}
                    </button>
                  )}
                  {ENABLE_CONTACTS && (
                    <button
                      type="button"
                      onClick={onNavigateContacts}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('dashboard.openContacts')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-4">{t('dashboard.optionalModulesDisabled')}</p>
            )}
          </section>
        </div>
      </div>

      {selectedInfo && (() => {
        const title = getInfoText(selectedInfo, lang, 'title');
        const body = getInfoText(selectedInfo, lang, 'body');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedInfo(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">{title}</span>
                <button
                  type="button"
                  onClick={() => setSelectedInfo(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{body}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DashboardView;
