import { getApiUrl } from './FirebaseService';

export interface MaintenanceStatus {
  maintenance: boolean;
  status?: number;
  message_ja?: string;
  message_en?: string;
  message_ko?: string;
  message_cn?: string;
}

export async function checkMaintenance(walletAddress?: string): Promise<MaintenanceStatus> {
  try {
    const base = getApiUrl('getMaintenance');
    const url = walletAddress ? `${base}?walletAddress=${walletAddress.toLowerCase()}` : base;
    const res = await fetch(url);
    if (!res.ok) return { maintenance: false };
    return await res.json() as MaintenanceStatus;
  } catch (e) {
    console.warn('Maintenance check failed:', e);
    return { maintenance: false };
  }
}

// ブラウザの言語設定からメッセージを選択
export function getMaintenanceMessage(status: MaintenanceStatus): string {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('ko') && status.message_ko) return status.message_ko;
  if ((lang.startsWith('zh') || lang.startsWith('cn')) && status.message_cn) return status.message_cn;
  if (lang.startsWith('ja') && status.message_ja) return status.message_ja;
  return status.message_en || status.message_ja || 'Under maintenance';
}
