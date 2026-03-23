import { getApiUrl, DB_ROOT } from './FirebaseService';

export type UpdateType = 'force' | 'notify' | 'ok';

export interface VersionCheckResult {
  updateType: UpdateType;
  latestVersion: string;
  releaseNotes: string | null;
  downloadUrl: string | null;
}

const PLATFORM = (import.meta.env.VITE_PLATFORM as string) || 'WEB';
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string) || '0.0.0';

function parseVersion(v: string): [number, number, number] {
  const parts = v.split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareVersions(current: string, latest: string): UpdateType {
  const [cMaj, cMin] = parseVersion(current);
  const [lMaj, lMin] = parseVersion(latest);
  if (lMaj > cMaj) return 'force';
  if (lMaj === cMaj && lMin > cMin) return 'notify';
  return 'ok';
}

export async function checkVersion(): Promise<VersionCheckResult | null> {
  try {
    const url = getApiUrl('getVersions');
    const res = await fetch(url);
    if (!res.ok) return null;

    const { versions } = await res.json() as {
      versions: Array<{
        platform: string;
        version: string;
        release_notes: string | null;
        download_url: string | null;
      }>;
    };

    const entry = versions.find(v => v.platform === PLATFORM.toUpperCase());
    if (!entry) return null;

    const updateType = compareVersions(APP_VERSION, entry.version);
    return {
      updateType,
      latestVersion: entry.version,
      releaseNotes: entry.release_notes,
      downloadUrl: entry.download_url,
    };
  } catch (e) {
    console.warn('Version check failed:', e);
    return null;
  }
}

const STORAGE_KEY = `version_notified_${APP_VERSION}`;

export function shouldShowNotify(): boolean {
  return !sessionStorage.getItem(STORAGE_KEY);
}

export function markNotifyShown(): void {
  sessionStorage.setItem(STORAGE_KEY, '1');
}

export { PLATFORM, APP_VERSION };
