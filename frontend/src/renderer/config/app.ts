export const APP_NAME = (import.meta.env.VITE_APP_NAME as string) || 'Desktop App Template';
export const APP_DESCRIPTION = (import.meta.env.VITE_APP_DESCRIPTION as string)
  || 'Desktop application starter with Tauri, Firebase Functions, TiDB, and admin console.';
export const APP_WEBSITE_URL = ((import.meta.env.VITE_APP_WEBSITE_URL as string) || '').replace(/\/+$/, '');
export const ADMIN_CONSOLE_URL = ((import.meta.env.VITE_ADMIN_CONSOLE_URL as string) || '').replace(/\/+$/, '');
export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || '';

export function getMarketingPageUrl(path: string, lang?: string): string | null {
  if (!APP_WEBSITE_URL) {
    return null;
  }

  const normalizedPath = path.replace(/^\/+/, '');
  const suffix = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return `${APP_WEBSITE_URL}/${normalizedPath}${suffix}`;
}
