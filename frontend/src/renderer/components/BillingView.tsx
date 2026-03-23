import React from 'react';
import { useTranslation } from 'react-i18next';

const BillingView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('billing.title')}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-sm">{t('billing.placeholder')}</p>
      </div>
    </div>
  );
};

export default BillingView;
