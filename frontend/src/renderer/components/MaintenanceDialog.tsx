import React from 'react';
import { useTranslation } from 'react-i18next';
import { MaintenanceStatus, getMaintenanceMessage } from '../services/MaintenanceService';

interface Props {
  status: MaintenanceStatus;
}

const MaintenanceDialog: React.FC<Props> = ({ status }) => {
  const { t } = useTranslation();
  const message = getMaintenanceMessage(status);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('maintenance.title')}</h2>
        <p className="text-gray-600 text-base leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="mt-6 flex gap-2 justify-center flex-wrap text-xs text-gray-400">
          {status.message_ja && <span>{status.message_ja}</span>}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDialog;
