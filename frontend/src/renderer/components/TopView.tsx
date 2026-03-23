import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkVersion, VersionCheckResult } from '../services/VersionCheckService';
import { checkMaintenance, MaintenanceStatus, getMaintenanceMessage } from '../services/MaintenanceService';
import { PointService } from '../services/PointService';
import { BillingInfo } from '../types';
import { AuthService } from '../services/AuthService';

interface TopViewProps {
  onNavigateBilling: () => void;
  onNavigateLinkAccount: () => void;
}

const TopView: React.FC<TopViewProps> = ({ onNavigateBilling, onNavigateLinkAccount }) => {
  const { t } = useTranslation();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const isGuest = AuthService.isGuest();

  useEffect(() => {
    PointService.getBillingInfo().then(setBilling).catch(() => {});
    checkVersion().then(setVersionCheck).catch(() => {});
    checkMaintenance().then(result => {
      if (result.maintenance) setMaintenance(result);
    }).catch(() => {});
  }, []);

  const billingStatusLabel = () => {
    if (!billing) return '---';
    switch (billing.status) {
      case 'subscribed': return t('top.billing.statusSubscribed');
      case 'requires_subscription': return t('top.billing.statusRequired');
      default: return t('top.billing.statusFree');
    }
  };

  const billingStatusColor = () => {
    if (!billing) return 'text-gray-400';
    switch (billing.status) {
      case 'subscribed': return 'text-green-600';
      case 'requires_subscription': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-4">

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
            <a
              href={versionCheck.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              {t('top.version.download')}
            </a>
          )}
        </div>
      )}

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

      {/* 課金カード */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{t('top.billing.title')}</p>
              <p className={`text-sm font-medium mt-0.5 ${billingStatusColor()}`}>{billingStatusLabel()}</p>
              {billing && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('top.billing.thisMonth')}: {billing.currentMonthPoints} pt
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onNavigateBilling}
            className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('top.billing.manage')}
          </button>
        </div>
      </div>

    </div>
  );
};

export default TopView;
