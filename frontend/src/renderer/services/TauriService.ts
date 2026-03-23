import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

// ============================================================
// 外部URL をデフォルトブラウザで開く
// ============================================================
export async function openExternal(url: string): Promise<void> {
  await openUrl(url);
}

// ============================================================
// セキュアストレージ（Rust バックエンド経由で OS キーチェーンに保存）
// ============================================================
export const secureStorage = {
  isEncryptionAvailable(): Promise<boolean> {
    return invoke<boolean>('is_encryption_available');
  },

  saveWalletConnectSession(data: string): Promise<void> {
    return invoke<void>('save_walletconnect_session', { data });
  },

  loadWalletConnectSession(): Promise<string | null> {
    return invoke<string | null>('load_walletconnect_session');
  },

  deleteWalletConnectSession(): Promise<void> {
    return invoke<void>('delete_walletconnect_session');
  },

  hasWalletConnectSession(): Promise<boolean> {
    return invoke<boolean>('has_walletconnect_session');
  },
};
