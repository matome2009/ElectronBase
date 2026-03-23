import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 標準ブラウザで外部URLを開く
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // セキュアストレージ（WalletConnectセッション管理）
  secureStorage: {
    isEncryptionAvailable: () =>
      ipcRenderer.invoke('secure-storage:is-encryption-available'),
    saveWalletConnectSession: (sessionData: string) =>
      ipcRenderer.invoke('secure-storage:save-walletconnect-session', sessionData),
    loadWalletConnectSession: () =>
      ipcRenderer.invoke('secure-storage:load-walletconnect-session'),
    deleteWalletConnectSession: () =>
      ipcRenderer.invoke('secure-storage:delete-walletconnect-session'),
    hasWalletConnectSession: () =>
      ipcRenderer.invoke('secure-storage:has-walletconnect-session'),
  },
});

declare global {
  interface Window {
    electronAPI: {
      openExternal: (url: string) => Promise<void>;
      secureStorage: {
        isEncryptionAvailable: () => Promise<boolean>;
        saveWalletConnectSession: (sessionData: string) => Promise<void>;
        loadWalletConnectSession: () => Promise<string | null>;
        deleteWalletConnectSession: () => Promise<void>;
        hasWalletConnectSession: () => Promise<boolean>;
      };
    };
  }
}
