import React from 'react';
import { useTranslation } from 'react-i18next';
import { getMaintenanceMessage } from '../../services/MaintenanceService';
import { openExternal } from '../../services/TauriService';
import { useTopController, getInfoText } from '../controllers/useTopController';

function getSiteLang(lang: string): string {
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}
const HELP_BASE_URL = `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.web.app/help.html`;

interface TopViewProps {
  onNavigateLinkAccount: () => void;
  onNavigateSettings: (scrollTo?: 'plan') => void;
}

const TopView: React.FC<TopViewProps> = ({ onNavigateLinkAccount, onNavigateSettings }) => {
  const { t } = useTranslation();
  const {
    planStatus, versionCheck, maintenance, informations, selectedInfo,
    isGuest, lang, setSelectedInfo,
  } = useTopController();

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-4">

      {/* プラン上限超過バナー */}
      {planStatus && (() => {
        const overAddr = planStatus.limits.maxAddresses !== null && planStatus.currentAddressCount > planStatus.limits.maxAddresses;
        const overNet  = planStatus.limits.maxNetworksPerAddress !== null && planStatus.currentMaxNetworkCount > planStatus.limits.maxNetworksPerAddress;
        if (!overAddr && !overNet) return null;
        const items: string[] = [];
        if (overAddr) items.push(t('top.limitAddresses', { count: planStatus.currentAddressCount, limit: planStatus.limits.maxAddresses }));
        if (overNet)  items.push(t('top.limitNetworks', { count: planStatus.currentMaxNetworkCount, limit: planStatus.limits.maxNetworksPerAddress }));
        return (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm">{t('top.limitExceeded')}</p>
                <p className="text-red-700 text-xs mt-1">{items.join('、')}{t('top.syncStopped')}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => onNavigateSettings('plan')}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 font-medium">
                {t('top.upgrade')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ゲスト連携カード */}
      {isGuest && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-orange-800 text-sm">{t('top.guest.title')}</p>
              <p className="text-orange-600 text-xs mt-0.5">{t('top.guest.description')}</p>
            </div>
          </div>
          <button
            onClick={onNavigateLinkAccount}
            className="text-xs bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shrink-0"
          >
            {t('top.guest.link')}
          </button>
        </div>
      )}

      {/* お知らせ */}
      {informations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('top.news')}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {informations.map(info => {
              const title = getInfoText(info, lang, 'title');
              const body = getInfoText(info, lang, 'body');
              return (
                <button
                  key={info.id}
                  onClick={() => body ? setSelectedInfo(info) : undefined}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left ${body ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <p className="text-sm font-medium text-gray-800 flex-1">{title}</p>
                  {body && (
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* お知らせ詳細モーダル */}
      {selectedInfo && (() => {
        const title = getInfoText(selectedInfo, lang, 'title');
        const body = getInfoText(selectedInfo, lang, 'body');
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedInfo(null)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('top.news')}</span>
                </div>
                <button
                  onClick={() => setSelectedInfo(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto">
                <p className="font-semibold text-gray-900 text-base mb-3">{title}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{body}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* メンテナンス中バナー */}
      {maintenance?.maintenance && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">{t('top.maintenance.title')}</p>
            {<p className="text-yellow-700 text-xs mt-1">{getMaintenanceMessage(maintenance)}</p>}
          </div>
        </div>
      )}

      {/* バージョン更新バナー */}
      {versionCheck && versionCheck.updateType !== 'ok' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <div>
              <p className="font-semibold text-blue-800 text-sm">{t('top.version.updateAvailable')}</p>
              {versionCheck.latestVersion && (
                <p className="text-blue-600 text-xs">{t('top.version.latest')}: v{versionCheck.latestVersion}</p>
              )}
            </div>
          </div>
          {versionCheck.downloadUrl && (
            <button
              type="button"
              onClick={() => {
                if (versionCheck.downloadUrl) {
                  openExternal(versionCheck.downloadUrl);
                }
              }}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              {t('top.version.download')}
            </button>
          )}
        </div>
      )}

      {/* 使い方カード */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <span>📖</span> {t('top.howToUse')}
          </h2>
          <button
            onClick={() => openExternal(`${HELP_BASE_URL}?lang=${getSiteLang(lang)}`)}
            className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 transition-colors cursor-pointer"
          >
            {t('top.seeDetails')}
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-sm font-medium text-gray-700">{t('top.step1Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('top.step1Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
            <div>
              <p className="text-sm font-medium text-gray-700">{t('top.step2Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('top.step2Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
            <div>
              <p className="text-sm font-medium text-gray-700">{t('top.step3Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('top.step3Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</div>
            <div>
              <p className="text-sm font-medium text-gray-700">{t('top.step4Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('top.step4Desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* プランカード */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{t('top.plan')}</p>
              {planStatus ? (
                <>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      planStatus.planKey === 'heavy'
                        ? 'bg-purple-100 text-purple-700'
                        : planStatus.planKey === 'light'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {planStatus.planKey === 'heavy' ? t('top.planHeavy') : planStatus.planKey === 'light' ? t('top.planLight') : t('top.planFree')}
                    </span>
                    {planStatus.expiresAt && (
                      <span className="text-xs text-gray-500">
                        {new Date(planStatus.expiresAt) > new Date()
                          ? t('top.planUntil', { date: new Date(planStatus.expiresAt).toLocaleDateString(lang) })
                          : <span className="text-red-500">{t('top.planExpired')}</span>
                        }
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${planStatus.limits.maxAddresses !== null && planStatus.currentAddressCount > planStatus.limits.maxAddresses ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {t('top.planAddressCount', { count: planStatus.currentAddressCount })}
                    {planStatus.limits.maxAddresses !== null ? t('top.planAddressLimit', { limit: planStatus.limits.maxAddresses }) : ''}
                  </p>
                  <p className={`text-xs mt-0.5 ${planStatus.limits.maxNetworksPerAddress !== null && planStatus.currentMaxNetworkCount > planStatus.limits.maxNetworksPerAddress ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {t('top.planNetworkCount', { count: planStatus.currentMaxNetworkCount })}
                    {planStatus.limits.maxNetworksPerAddress !== null ? t('top.planNetworkLimit', { limit: planStatus.limits.maxNetworksPerAddress }) : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">---</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {planStatus && planStatus.planKey !== 'heavy' && (
              <button
                onClick={() => onNavigateSettings('plan')}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 font-medium whitespace-nowrap"
              >
                {t('top.upgrade')}
              </button>
            )}
            <button
              onClick={() => onNavigateSettings()}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('top.details')}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default TopView;
