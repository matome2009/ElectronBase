const STORAGE_KEYS = {
  LANGUAGE: 'pref_language',
  SIDEBAR_OPEN: 'pref_sidebar_open',
  ACTIVE_WALLET_ADDRESS: 'pref_active_wallet_address',
  USER_TRANSACTION_SYNC_CURSOR_PREFIX: 'user_tx_sync_cursor_',
};

export interface UserTransactionSyncCursor {
  updatedAt: string;
  lastSeenUserTransactionId: number;
}

export class LocalStorageService {
  static getLanguage(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE);
  }

  static setLanguage(lang: string): void {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  }

  static getSidebarOpen(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN) === 'true';
  }

  static setSidebarOpen(open: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(open));
  }

  static getActiveWalletAddress(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLET_ADDRESS);
  }

  static setActiveWalletAddress(address: string | null): void {
    if (address) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET_ADDRESS, address.toLowerCase());
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WALLET_ADDRESS);
    }
  }

  static getUserTransactionSyncCursor(userId: string): UserTransactionSyncCursor | null {
    const raw = localStorage.getItem(`${STORAGE_KEYS.USER_TRANSACTION_SYNC_CURSOR_PREFIX}${userId}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as UserTransactionSyncCursor;
      if (!parsed.updatedAt || !Number.isFinite(parsed.lastSeenUserTransactionId)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  static setUserTransactionSyncCursor(userId: string, cursor: UserTransactionSyncCursor | null): void {
    const key = `${STORAGE_KEYS.USER_TRANSACTION_SYNC_CURSOR_PREFIX}${userId}`;
    if (!cursor) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(cursor));
  }

  static clearUserTransactionSyncCursors(): void {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEYS.USER_TRANSACTION_SYNC_CURSOR_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key));
  }
}
