import React from 'react';
import { useTranslation } from 'react-i18next';
import { ADMIN_CONSOLE_URL } from '../config/app';
import { ENABLE_CONTACTS, ENABLE_INBOX, ENABLE_WORKSPACE } from '../config/features';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';

type View = 'dashboard' | 'workspace' | 'inbox' | 'contacts' | 'account-link' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onOpenAdmin: () => void;
}

// View 型を外部から参照できるようにエクスポート
export type { View };

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onOpenAdmin }) => {
  const { t } = useTranslation();

  const menuItems: Array<
    { type: 'view'; id: View; label: string; icon: React.ReactNode }
    | { type: 'action'; id: 'admin'; label: string; icon: React.ReactNode }
  > = [
    {
      type: 'view',
      id: 'dashboard' as View,
      label: t('sidebar.dashboard'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    ...(ENABLE_WORKSPACE ? [{
      type: 'view' as const,
      id: 'workspace' as View,
      label: t('sidebar.workspace'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      ),
    }] : []),
    ...(ENABLE_INBOX ? [{
      type: 'view' as const,
      id: 'inbox' as View,
      label: t('sidebar.inbox'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    }] : []),
    ...(ENABLE_CONTACTS ? [{
      type: 'view' as const,
      id: 'contacts' as View,
      label: t('sidebar.contacts'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    }] : []),
    {
      type: 'view',
      id: 'settings' as View,
      label: t('sidebar.settings'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    ...(ADMIN_CONSOLE_URL ? [{
      type: 'action' as const,
      id: 'admin' as const,
      label: t('sidebar.admin'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zm0-5l7 3v5c0 5-3.5 9.5-7 11-3.5-1.5-7-6-7-11V6l7-3z" />
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
              onClick={() => item.type === 'view' ? onViewChange(item.id) : onOpenAdmin()}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm text-left ${
                item.type === 'view' && currentView === item.id
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
