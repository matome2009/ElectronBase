import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// --- 型定義 ---
type ModalType = 'alert' | 'confirm';

interface ModalState {
  type: ModalType;
  message: string;
  resolve: (value: boolean) => void;
}

interface ModalContextValue {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
};

// --- Provider ---
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<ModalState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = () => resolve();
      setModal({ type: 'alert', message, resolve: () => resolve() });
    });
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ type: 'confirm', message, resolve });
    });
  }, []);

  const handleOk = () => {
    modal?.resolve(true);
    setModal(null);
  };

  const handleCancel = () => {
    modal?.resolve(false);
    setModal(null);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={modal.type === 'alert' ? handleOk : handleCancel}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed mb-6">{modal.message}</p>
            <div className="flex justify-end gap-3">
              {modal.type === 'confirm' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {t('modal.cancel')}
                </button>
              )}
              <button
                onClick={handleOk}
                autoFocus
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                {t('modal.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
