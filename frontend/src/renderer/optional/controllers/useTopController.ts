import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { checkVersion, VersionCheckResult } from '../../services/VersionCheckService';
import { checkMaintenance, MaintenanceStatus } from '../../services/MaintenanceService';
import { PlanService } from '../services/PlanService';
import { PlanStatus } from '../../models/index';
import { AuthService } from '../../services/AuthService';
import { getApiUrl } from '../../services/FirebaseService';
import { LoggingService } from '../../services/LoggingService';

export interface Information {
  id: number;
  title_ja: string; title_en: string; title_ko: string; title_cn: string;
  body_ja: string | null; body_en: string | null; body_ko: string | null; body_cn: string | null;
  display_start_at: string; display_end_at: string | null;
  priority: number;
}

async function fetchInformation(): Promise<Information[]> {
  const url = getApiUrl('getInformation');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getInformation failed: ${res.status}`);
  const data = await res.json();
  return data.records ?? [];
}

export function getInfoText(info: Information, lang: string, field: 'title' | 'body'): string {
  const suffix = lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'cn' : 'en';
  return (info as unknown as Record<string, string | null>)[`${field}_${suffix}`]
    || (info as unknown as Record<string, string | null>)[`${field}_ja`]
    || '';
}

export function useTopController() {
  const { i18n } = useTranslation();

  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [informations, setInformations] = useState<Information[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<Information | null>(null);

  const isGuest = AuthService.isGuest();

  useEffect(() => {
    const init = async () => {
      try {
        setPlanStatus(await PlanService.getPlanStatus());
      } catch (e) {
        LoggingService.error('TopController: planStatus取得失敗', { e });
      }
      try {
        setVersionCheck(await checkVersion());
      } catch (e) {
        LoggingService.error('TopController: バージョンチェック失敗', { e });
      }
      try {
        const result = await checkMaintenance();
        if (result.maintenance) setMaintenance(result);
      } catch (e) {
        LoggingService.error('TopController: メンテナンスチェック失敗', { e });
      }
      try {
        setInformations(await fetchInformation());
      } catch (e) {
        LoggingService.error('TopController: お知らせ取得失敗', { e });
      }
    };
    init();
  }, []);

  return {
    planStatus,
    versionCheck,
    maintenance,
    informations,
    selectedInfo,
    isGuest,
    lang: i18n.language,
    setSelectedInfo,
  };
}
