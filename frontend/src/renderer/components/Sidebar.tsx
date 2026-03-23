import React from 'react';
import { useTranslation } from 'react-i18next';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

type View = 'top' | 'billing' | 'account-link';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isGuest?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isGuest }) => {
  const { t } = useTranslation();

  const menuItems: { id: View; label: string; icon: React.ReactNode }[] = [
    {
      id: 'top',
      label: t('sidebar.top'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'billing',
      label: t('sidebar.billing'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    ...(isGuest ? [{
      id: 'account-link' as View,
      label: t('sidebar.accountLink'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    }] : []),
  ];

  return (
    <aside className="w-56 bg-gray-900 text-white h-full flex flex-col">
      <div className="p-5 flex-1">
        <div className="text-lg font-bold mb-6 text-white">{t('sidebar.menu')}</div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm text-left ${
                currentView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 text-xs text-gray-500 text-center">
        v{APP_VERSION}
      </div>
    </aside>
  );
};

export default Sidebar;
