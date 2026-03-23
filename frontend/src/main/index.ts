import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { SecureStorageService } from './SecureStorageService';

// Snap環境でのロケール設定
if (process.env.SNAP) {
  if (!process.env.LANG) process.env.LANG = 'ja_JP.UTF-8';
  if (!process.env.LC_ALL) process.env.LC_ALL = 'ja_JP.UTF-8';
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: process.env.NODE_ENV !== 'development',
    },
    title: 'ElectronBase',
  });

  // メニューバーを非表示
  mainWindow.setMenuBarVisibility(false);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // F12 で DevTools
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        mainWindow?.webContents.openDevTools();
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await SecureStorageService.initialize();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 標準ブラウザで外部URLを開く
ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
});

// セキュアストレージ（WalletConnectセッション管理）
ipcMain.handle('secure-storage:is-encryption-available', () =>
  SecureStorageService.isEncryptionAvailable()
);
ipcMain.handle('secure-storage:save-walletconnect-session', (_e, data: string) =>
  SecureStorageService.saveWalletConnectSession(data)
);
ipcMain.handle('secure-storage:load-walletconnect-session', () =>
  SecureStorageService.loadWalletConnectSession()
);
ipcMain.handle('secure-storage:delete-walletconnect-session', () =>
  SecureStorageService.deleteWalletConnectSession()
);
ipcMain.handle('secure-storage:has-walletconnect-session', () =>
  SecureStorageService.hasWalletConnectSession()
);
