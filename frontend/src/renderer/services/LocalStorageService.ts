const STORAGE_KEYS = {
  LANGUAGE: 'pref_language',
  SIDEBAR_OPEN: 'pref_sidebar_open',
};

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
}
