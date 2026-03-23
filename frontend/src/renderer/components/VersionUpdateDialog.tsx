import React from 'react';
import { useTranslation } from 'react-i18next';
import { VersionCheckResult, APP_VERSION, markNotifyShown } from '../services/VersionCheckService';

interface Props {
  result: VersionCheckResult;
  onClose?: () => void; // forceの場合はundefined（閉じられない）
}

const VersionUpdateDialog: React.FC<Props> = ({ result, onClose }) => {
  const { t } = useTranslation();
  const isForce = result.updateType === 'force';

  const handleUpdate = () => {
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  const handleLater = () => {
    markNotifyShown();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* ヘッダー */}
        <div className={`flex items-center gap-3 mb-4 ${isForce ? 'text-red-600' : 'text-blue-600'}`}>
          <span className="text-3xl">{isForce ? '🚨' : '🔔'}</span>
          <div>
            <h2 className="text-xl font-bold">
              {isForce ? t('version.forceUpdate') : t('version.notifyUpdate')}
            </h2>
            <p className="text-sm text-gray-500">
              {APP_VERSION} → {result.latestVersion}
            </p>
          </div>
        </div>

        {/* 説明 */}
        {isForce && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {t('version.cannotUse')}
          </div>
        )}

        {/* リリースノート */}
        {result.releaseNotes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">{t('version.releaseNotes')}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.releaseNotes}</p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-3">
          {result.downloadUrl && (
            <button
              onClick={handleUpdate}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-white transition-colors ${
                isForce ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {t('version.update')}
            </button>
          )}
          {!isForce && (
            <button
              onClick={handleLater}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {t('version.later')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionUpdateDialog;
