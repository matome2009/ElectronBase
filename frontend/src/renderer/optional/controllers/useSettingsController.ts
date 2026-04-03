import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { WalletService } from '../services/WalletService';
import { IndexedDBService } from '../services/IndexedDBService';
import { LabelService } from '../services/LabelService';
import { PlanService } from '../services/PlanService';
import { LocalStorageService } from '../../services/LocalStorageService';
import { LoggingService } from '../../services/LoggingService';
import { getFirebaseAuth } from '../../services/FirebaseService';
import { WalletAddress, ChainId, TransactionLabel, PlanStatus } from '../../models/index';
import { CHAIN_CONFIG_MAP } from '../../config/chains';
import { resetLastSyncedAt } from './useInboxController';

interface UseSettingsControllerOptions {
  initialAddress?: string;
  scrollTo?: 'plan';
}

export function useSettingsController({ initialAddress, scrollTo }: UseSettingsControllerOptions) {
  const { t } = useTranslation();

  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress?.toLowerCase() ?? '');
  const [togglingChain, setTogglingChain] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTestnets, setShowTestnets] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  // ---- ラベル管理 ----
  const [txLabels, setTxLabels] = useState<TransactionLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [showAddLabelForm, setShowAddLabelForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [newLabelSaving, setNewLabelSaving] = useState(false);
  const [newLabelError, setNewLabelError] = useState<string | null>(null);
  const [editingTxLabel, setEditingTxLabel] = useState<TransactionLabel | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');
  const [editLabelSaving, setEditLabelSaving] = useState(false);
  const [editLabelError, setEditLabelError] = useState<string | null>(null);

  // ---- チェーントグルエラー ----
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ---- プランステータス ----
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planCheckoutLoading, setPlanCheckoutLoading] = useState(false);

  // ---- キャッシュクリア ----
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheClearDone, setCacheClearDone] = useState(false);

  // ============================================================
  // ローダー
  // ============================================================

  const loadWallets = useCallback(async () => {
    setLoading(true);
    try {
      const list = await WalletService.getWatchedWallets();
      setWallets(list);
      if (list.length > 0 && !selectedAddress) {
        const target = initialAddress
          ? list.find((w) => w.address.toLowerCase() === initialAddress.toLowerCase())?.address
          : undefined;
        setSelectedAddress(target ?? list[0].address);
      }
    } catch (err) {
      LoggingService.error('SettingsController loadWallets error', { err });
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, initialAddress]);

  const loadLabels = useCallback(async () => {
    setLabelsLoading(true);
    try {
      const { labels } = await LabelService.getLabels();
      setTxLabels(labels);
    } catch (err) {
      LoggingService.error('SettingsController loadLabels error', { err });
    } finally {
      setLabelsLoading(false);
    }
  }, []);

  const loadPlanStatus = useCallback(async () => {
    setPlanLoading(true);
    try {
      const status = await PlanService.getPlanStatus();
      setPlanStatus(status);
    } catch (err) {
      LoggingService.error('SettingsController loadPlanStatus error', { err });
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
    loadLabels();
    loadPlanStatus();
  }, []);

  useEffect(() => {
    if (scrollTo === 'plan') {
      document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollTo]);

  // ============================================================
  // 計算値
  // ============================================================

  const registeredAddresses = [...new Set(wallets.map((w) => w.address))];

  const chainEntries = new Map(
    wallets.filter((w) => w.address === selectedAddress).map((w) => [w.chainId, w]),
  );

  const getLabelForAddress = (addr: string) =>
    wallets.find((w) => w.address === addr)?.label ?? null;

  // ============================================================
  // アドレス / ウォレットラベル
  // ============================================================

  const handleSelectAddress = (addr: string) => {
    setSelectedAddress(addr);
    setEditingLabel(false);
    setLabelInput('');
    setLabelError(null);
  };

  const handleStartEditLabel = () => {
    setLabelInput(getLabelForAddress(selectedAddress) ?? '');
    setEditingLabel(true);
  };

  const handleSaveLabel = async () => {
    if (!selectedAddress) return;
    setLabelSaving(true);
    setLabelError(null);
    try {
      const newLabel = labelInput.trim() || null;
      await WalletService.updateWalletLabel(selectedAddress, newLabel);
      setWallets((prev) =>
        prev.map((w) =>
          w.address === selectedAddress ? { ...w, label: newLabel } : w
        )
      );
      setEditingLabel(false);
    } catch (err) {
      LoggingService.error('SettingsController handleSaveLabel error', { err });
      setLabelError(err instanceof Error ? err.message : t('settings.saveFailed'));
    } finally {
      setLabelSaving(false);
    }
  };

  // ============================================================
  // チェーントグル / ウォレット削除
  // ============================================================

  const handleChainToggle = async (chainId: ChainId, newIsActive: boolean) => {
    if (!selectedAddress) return;
    setTogglingChain(chainId);
    setToggleError(null);
    try {
      const entry = chainEntries.get(chainId);
      if (!entry) {
        const newWallets = await WalletService.addWatchedWallet(
          selectedAddress,
          [chainId],
          getLabelForAddress(selectedAddress) ?? undefined,
        );
        const createdEntry = newWallets.find((w) => w.chainId === chainId);
        if (!createdEntry) {
          throw new Error(`追加したチェーンのウォレットが見つかりません: chainId=${chainId}`);
        }

        // addWatchedWallet は新規行を inactive で作成するため、UI で ON を押した場合は即時有効化する。
        if (newIsActive) {
          await WalletService.toggleWatchedWallet(createdEntry.id, true);
        }

        setWallets((prev) => {
          const withoutNew = prev.filter(
            (w) => !(w.address === selectedAddress && w.chainId === chainId),
          );
          return [
            ...withoutNew,
            ...newWallets
              .filter((w) => w.chainId === chainId)
              .map((w) => (w.id === createdEntry.id ? { ...w, isActive: newIsActive } : w)),
          ];
        });
      } else {
        await WalletService.toggleWatchedWallet(entry.id, newIsActive);
        setWallets((prev) =>
          prev.map((w) => (w.id === entry.id ? { ...w, isActive: newIsActive } : w)),
        );
      }
    } catch (err) {
      LoggingService.error('SettingsController handleChainToggle error', { err, chainId });
      setToggleError(err instanceof Error ? err.message : t('settings.networkChange'));
    } finally {
      setTogglingChain(null);
    }
  };

  const handleDeleteWallet = async () => {
    if (!selectedAddress) return;
    const shortAddr = `${selectedAddress.slice(0, 6)}...${selectedAddress.slice(-4)}`;
    if (!confirm(t('settings.deleteWalletConfirm', { addr: shortAddr }))) return;

    const targets = wallets.filter((w) => w.address === selectedAddress);
    try {
      await Promise.all(targets.map((w) => WalletService.deleteWatchedWallet(w.id)));

      const userId = getFirebaseAuth().currentUser?.uid;
      if (userId) {
        try {
          await IndexedDBService.deleteTransactionsByAddress(userId, selectedAddress);
        } catch (err) {
          LoggingService.error('SettingsController: IndexedDB トランザクション削除失敗', { err, selectedAddress });
        }
      }

      const remaining = wallets.filter((w) => w.address !== selectedAddress);
      setWallets(remaining);
      setSelectedAddress(remaining[0]?.address ?? '');
    } catch (err) {
      LoggingService.error('SettingsController handleDeleteWallet error', { err });
    }
  };

  // ============================================================
  // トランザクションラベル CRUD
  // ============================================================

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) { setNewLabelError(t('settings.labelNameRequired')); return; }
    setNewLabelSaving(true);
    setNewLabelError(null);
    try {
      const label = await LabelService.createLabel(newLabelName.trim(), newLabelColor);
      setTxLabels((prev) => [...prev, label]);
      setNewLabelName('');
      setNewLabelColor('#6366f1');
      setShowAddLabelForm(false);
    } catch (err) {
      LoggingService.error('SettingsController handleAddLabel error', { err });
      setNewLabelError(err instanceof Error ? err.message : t('settings.labelCreateFailed'));
    } finally {
      setNewLabelSaving(false);
    }
  };

  const handleStartEditTxLabel = (label: TransactionLabel) => {
    setEditingTxLabel(label);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
    setEditLabelError(null);
  };

  const handleSaveLabelEdit = async () => {
    if (!editingTxLabel) return;
    if (!editLabelName.trim()) { setEditLabelError(t('settings.labelNameRequired')); return; }
    setEditLabelSaving(true);
    setEditLabelError(null);
    try {
      await LabelService.updateLabel(editingTxLabel.id, editLabelName.trim(), editLabelColor);
      setTxLabels((prev) =>
        prev.map((l) => l.id === editingTxLabel.id ? { ...l, name: editLabelName.trim(), color: editLabelColor } : l)
      );
      setEditingTxLabel(null);
    } catch (err) {
      LoggingService.error('SettingsController handleSaveLabelEdit error', { err });
      setEditLabelError(err instanceof Error ? err.message : t('settings.saveFailed'));
    } finally {
      setEditLabelSaving(false);
    }
  };

  const handleDeleteLabel = async (label: TransactionLabel) => {
    if (!confirm(t('settings.deleteLabelConfirm', { name: label.name }))) return;
    try {
      await LabelService.deleteLabel(label.id);
      setTxLabels((prev) => prev.filter((l) => l.id !== label.id));
    } catch (err) {
      LoggingService.error('SettingsController handleDeleteLabel error', { err });
    }
  };

  // ============================================================
  // プラン
  // ============================================================

  const handleStartCheckout = async (planKey: 'light' | 'heavy') => {
    setPlanCheckoutLoading(true);
    try {
      await PlanService.startCheckout(planKey);
    } catch (err) {
      LoggingService.error('SettingsController handleStartCheckout error', { err });
      alert(err instanceof Error ? err.message : t('settings.checkoutFailed'));
    } finally {
      setPlanCheckoutLoading(false);
    }
  };

  // ============================================================
  // ウォレット一覧 CSV エクスポート
  // ============================================================

  const handleExportCsv = () => {
    const header = 'address,label,network,network_type,chain_id,is_active,registered_at';
    const rows = wallets.map((w) => {
      const chain = CHAIN_CONFIG_MAP[w.chainId];
      const networkType = chain?.isTestnet ? 'testnet' : 'mainnet';
      const networkName = chain?.csvName ?? String(w.chainId);
      const label = w.label ?? '';
      const escapedLabel = label.includes(',') || label.includes('"') || label.includes('\n')
        ? `"${label.replace(/"/g, '""')}"`
        : label;
      return [w.address, escapedLabel, networkName, networkType, w.chainId, w.isActive, w.createdAt].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // ウォレット追加完了
  // ============================================================

  const handleAdded = (newWallets: WalletAddress[]) => {
    setWallets((prev) => {
      const existingIds = new Set(prev.map((w) => w.id));
      return [...prev, ...newWallets.filter((w) => !existingIds.has(w.id))];
    });
    if (newWallets[0]) setSelectedAddress(newWallets[0].address);
    setShowAddModal(false);
  };

  // ============================================================
  // キャッシュクリア
  // ============================================================

  const handleClearCache = async () => {
    if (!confirm(t('settings.clearCacheConfirm'))) return;
    setCacheClearing(true);
    setCacheClearDone(false);
    try {
      await IndexedDBService.clearAll();
      resetLastSyncedAt();
      LocalStorageService.clearUserTransactionSyncCursors();
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('inbox_balance_cache_') || key === 'auth_pending_link_guest_token')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
      setCacheClearDone(true);
    } catch (err) {
      LoggingService.error('SettingsController handleClearCache error', { err });
    } finally {
      setCacheClearing(false);
    }
  };

  return {
    // State
    wallets,
    loading,
    selectedAddress,
    togglingChain,
    showAddModal,
    showTestnets,
    editingLabel,
    labelInput,
    labelSaving,
    labelError,
    txLabels,
    labelsLoading,
    showAddLabelForm,
    newLabelName,
    newLabelColor,
    newLabelSaving,
    newLabelError,
    editingTxLabel,
    editLabelName,
    editLabelColor,
    editLabelSaving,
    editLabelError,
    toggleError,
    planStatus,
    planLoading,
    planCheckoutLoading,
    cacheClearing,
    cacheClearDone,
    // Setters（View で直接使用するもの）
    setShowAddModal,
    setShowTestnets,
    setEditingLabel,
    setLabelInput,
    setLabelError,
    setToggleError,
    setNewLabelName,
    setNewLabelColor,
    setNewLabelError,
    setShowAddLabelForm,
    setEditingTxLabel,
    setEditLabelName,
    setEditLabelColor,
    // Computed
    registeredAddresses,
    chainEntries,
    getLabelForAddress,
    // Handlers
    handleSelectAddress,
    handleStartEditLabel,
    handleSaveLabel,
    handleChainToggle,
    handleDeleteWallet,
    handleExportCsv,
    handleAddLabel,
    handleStartEditTxLabel,
    handleSaveLabelEdit,
    handleDeleteLabel,
    handleStartCheckout,
    handleAdded,
    handleClearCache,
  };
}
