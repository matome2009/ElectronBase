import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isAddress } from 'ethers';
import { WalletService } from '../services/WalletService';
import { IndexedDBService } from '../services/IndexedDBService';
import { LoggingService } from '../../services/LoggingService';
import { getFirebaseAuth } from '../../services/FirebaseService';
import { CHAIN_CONFIG_MAP, MAINNET_CHAINS, ANKR_RPC_NETWORK } from '../../config/chains';
import {
  TransactionView,
  WalletAddress,
  ChainId,
  Contact,
  TransactionLabel,
} from '../../models/index';
import {
  useInboxController,
  resetLastSyncedAt,
  TabKey,
  DirectionFilter,
  LabelFilterMode,
} from '../controllers/useInboxController';

export { resetLastSyncedAt };

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#6b7280',
];

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC',                  label: 'UTC (協定世界時)' },
  { value: 'America/Los_Angeles',  label: 'ロサンゼルス (UTC-8/-7)' },
  { value: 'America/Chicago',      label: 'シカゴ (UTC-6/-5)' },
  { value: 'America/New_York',     label: 'ニューヨーク (UTC-5/-4)' },
  { value: 'America/Sao_Paulo',    label: 'サンパウロ (UTC-3)' },
  { value: 'Europe/London',        label: 'ロンドン (UTC+0/+1)' },
  { value: 'Europe/Paris',         label: 'パリ・ベルリン (UTC+1/+2)' },
  { value: 'Europe/Moscow',        label: 'モスクワ (UTC+3)' },
  { value: 'Asia/Dubai',           label: 'ドバイ (UTC+4)' },
  { value: 'Asia/Kolkata',         label: 'ムンバイ (UTC+5:30)' },
  { value: 'Asia/Bangkok',         label: 'バンコク (UTC+7)' },
  { value: 'Asia/Singapore',       label: 'シンガポール・KL (UTC+8)' },
  { value: 'Asia/Shanghai',        label: '上海・香港 (UTC+8)' },
  { value: 'Asia/Tokyo',           label: '東京・ソウル (UTC+9)' },
  { value: 'Australia/Sydney',     label: 'シドニー (UTC+10/+11)' },
];

// ============================================================
// ユーティリティ
// ============================================================

/** raw value 文字列を decimals で割り、最大6桁の小数で返す */
function formatValue(value: string, decimals: number): string {
  if (decimals === 0) return value;
  try {
    const raw = BigInt(value);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = raw / divisor;
    const remainder = raw % divisor;
    if (remainder === BigInt(0)) return whole.toString();
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const truncated = remainderStr.slice(0, 6).replace(/0+$/, '');
    if (truncated === '') return whole.toString();
    return `${whole}.${truncated}`;
  } catch {
    // BigInt 変換失敗時のフォールバック（浮動小数点文字列が混入した場合）
    const num = parseFloat(value) / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
}


function formatTimestamp(iso: string, timezone: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('ja-JP', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone });
}

function formatTimestampFull(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: timezone,
  });
}

function getExplorerTxUrl(chainId: ChainId, txHash: string): string {
  const config = CHAIN_CONFIG_MAP[chainId];
  if (!config) return '';
  return `${config.blockExplorerUrl}/tx/${txHash}`;
}

function getChainName(chainId: ChainId): string {
  return CHAIN_CONFIG_MAP[chainId]?.name ?? `Chain ${chainId}`;
}

/**
 * アドレスをメーラー形式で解決する。
 *  - コンタクト一致: `testUser<0x1234...>`
 *  - 自分の監視ウォレット（ラベルあり）: `ラベル名<0x1234...>`
 *  - 自分の監視ウォレット（ラベルなし）: `0x1234...`
 *  - 不明: `0x1234...`
 */
function resolveAddress(
  addr: string,
  contacts: Contact[],
  watchedWallets: WalletAddress[],
): string {
  const lower = addr.toLowerCase();

  const contact = contacts.find((c) => c.address.toLowerCase() === lower);
  if (contact) return `${contact.label}<${addr}>`;

  const wallet = watchedWallets.find((w) => w.address.toLowerCase() === lower);
  if (wallet) {
    const name = wallet.label ?? addr;
    return `${name}<${addr}>`;
  }

  return addr;
}

// ============================================================
// AddWalletModal
// ============================================================

interface AddWalletModalProps {
  existingAddresses: string[];
  onClose: () => void;
  onAdded: (wallets: WalletAddress[]) => void;
}

const AddWalletModal: React.FC<AddWalletModalProps> = ({
  existingAddresses,
  onClose,
  onAdded,
}) => {
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAddress = (addr: string): string | null => {
    if (!addr.trim()) return t('inbox.addressRequired');
    if (!isAddress(addr.trim())) return t('inbox.addressInvalid');
    if (existingAddresses.includes(addr.trim().toLowerCase())) return t('inbox.addressDuplicate');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateAddress(address);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const wallets = await WalletService.addWatchedWallet(
        address.trim().toLowerCase(),
        MAINNET_CHAINS.map((c) => c.id) as ChainId[],
        label.trim() || undefined,
      );
      onAdded(wallets);
    } catch (err) {
      LoggingService.error('AddWalletModal submit error', { err });
      setError(err instanceof Error ? err.message : t('inbox.walletAddFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addressError = address ? validateAddress(address) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{t('inbox.addWalletTitle')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('inbox.walletAddress')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError(null); }}
              placeholder="0x..."
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 font-mono ${
                address && addressError
                  ? 'border-red-400 focus:ring-red-400'
                  : address && !addressError
                  ? 'border-green-400 focus:ring-green-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              autoComplete="off"
              spellCheck={false}
            />
            {address && addressError && (
              <p className="mt-1 text-xs text-red-600">{addressError}</p>
            )}
            {address && !addressError && (
              <p className="mt-1 text-xs text-green-600">{t('inbox.addressValid')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.name')} <span className="text-gray-400 font-normal">{t('settings.optional')}</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('inbox.labelPlaceholder')}
              maxLength={50}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !!addressError || !address.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('inbox.registering') : t('inbox.addButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// InboxView（メインコンポーネント）
// ============================================================

interface InboxViewProps {
  onNavigateSettings?: (address?: string) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ onNavigateSettings }) => {
  const { t } = useTranslation();
  const {
    wallets, walletsLoading, transactions, totalCount, txLoading, isListLoading, initialSyncLoading, isInboxInitializing, isSyncing,
    planExpiredMessage, planCheckoutLoading, activeTab, selectedChainIds, directionFilter,
    chainFilterOpen, selectedTx, copyFeedback, error, contacts,
    selectedAddress, showAddModal, deleteConfirmAddress, deleteLoading,
    txLabels, selectedLabelIds, labelFilterMode, labelFilterOpen, labelPickerTxId,
    searchOpen, searchFrom, searchTo, searchToken, searchTxHash, dateFrom, dateTo,
    searchResults, searchLoading, selectedTimezone,
    setActiveTab, setChainFilterOpen, setSelectedChainIds, setDirectionFilter,
    setLabelFilterOpen, setSelectedLabelIds, setLabelFilterMode, setLabelPickerTxId,
    setDeleteConfirmAddress, setShowAddModal, setSearchOpen,
    setSearchFrom, setSearchTo, setSearchToken, setSearchTxHash, setDateFrom, setDateTo,
    setSelectedTx,
    chainFilterRef, labelFilterRef,
    handleManualSync, handleAddressSelect, handleWalletAdded, handleDeleteAddress,
    handleLoadMore, handleRowClick, handleToggleFlag, handleMarkUnread, handleToggleHidden,
    handleAssignLabel, handleRemoveLabelFromTx, handleCreateAndAssignLabel,
    handleCopy, handleUpgradePlan, handleTimezoneChange, handleExportCsv, clearSearch,
    uniqueAddresses, getAddressLabel, txLabelById,
    filtered, unreadCount, flaggedCount, hiddenCount, availableChainIds, hasSearchFilter,
  } = useInboxController();

  if (walletsLoading || isInboxInitializing) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm text-gray-500">{t('inbox.loading')}</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ウォレット未登録
  // ============================================================

  if (wallets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full py-24 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{t('inbox.noWallets')}</h2>
          <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
            {t('inbox.noWalletsDesc')}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('inbox.addWalletButton')}
          </button>
        </div>
        {showAddModal && (
          <AddWalletModal
            existingAddresses={[]}
            onClose={() => setShowAddModal(false)}
            onAdded={handleWalletAdded}
          />
        )}
      </>
    );
  }


  return (
    <>
      {/* プラン期限切れバナー */}
      {planExpiredMessage && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span className="text-sm font-bold text-amber-800">{t('inbox.syncStopped')}</span>
          </div>
          <p className="text-xs text-amber-700 mb-2">{planExpiredMessage}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpgradePlan('light')}
              disabled={planCheckoutLoading}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {t('inbox.planLightButton')}
            </button>
            <button
              onClick={() => handleUpgradePlan('heavy')}
              disabled={planCheckoutLoading}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {t('inbox.planHeavyButton')}
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full overflow-hidden bg-gray-50">
        {/* ---- 左ペイン: リスト ---- */}
        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${
          selectedTx ? 'w-1/2 border-r border-gray-200' : 'w-full'
        }`}>
          {/* ヘッダー */}
          <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-0 flex-shrink-0">
            {/* タイトル + 同期状態 */}
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">{t('inbox.inbox')}</h1>
              <div className="flex items-center gap-2">
                <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 text-gray-500 hover:bg-gray-50"
                title={t('inbox.syncNow')}
              >
                <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isSyncing ? t('inbox.syncing') : t('inbox.sync')}
              </button>
              </div>
            </div>

            {/* アドレスタブ */}
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 scrollbar-none">
              {uniqueAddresses.map((addr) => {
                const label = getAddressLabel(addr);
                const isSelected = addr === selectedAddress;
                return (
                  <div key={addr} className={`flex items-center gap-1 flex-shrink-0 rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}>
                    <button
                      onClick={() => handleAddressSelect(addr)}
                      className="pl-3 pr-1 py-1.5 text-xs font-medium"
                      title={addr}
                    >
                      {label ?? addr}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmAddress(addr); }}
                      className={`pr-2 py-1.5 text-xs leading-none transition-colors ${
                        isSelected ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={t('common.delete')}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {/* 追加ボタン */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm"
                title={t('inbox.addWalletButton')}
              >
                +
              </button>
            </div>

            {/* 状態タブ (all / unread / flagged / hidden) */}
            <div className="flex -mb-px">
              {(
                [
                  { key: 'all' as TabKey, label: t('inbox.tabAll'), count: null },
                  { key: 'unread' as TabKey, label: t('inbox.tabUnread'), count: unreadCount },
                  { key: 'flagged' as TabKey, label: t('inbox.tabFlagged'), count: flaggedCount },
                  { key: 'hidden' as TabKey, label: t('inbox.tabHidden'), count: hiddenCount },
                ] as const
              ).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                  {count !== null && count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      activeTab === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 残高アコーディオン（アドレス選択時のみ） */}
          {selectedAddress && (
            <WalletBalanceAccordion
              address={selectedAddress}
              chainIds={wallets
                .filter((w) => w.address.toLowerCase() === selectedAddress && w.isActive)
                .map((w) => w.chainId)}
            />
          )}

          {/* チェーン未設定バナー */}
          {availableChainIds.length === 0 && (
            <button
              onClick={() => onNavigateSettings?.(selectedAddress ?? undefined)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-sm font-semibold">{t('inbox.noChain')}</span>
              <span className="ml-auto text-sm font-medium underline whitespace-nowrap">{t('inbox.configureNow')} →</span>
            </button>
          )}

          {/* フィルターチップ */}
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 flex-shrink-0">
            {/* チェーンフィルタ */}
            {availableChainIds.length === 0 ? null : (
              <div className="relative" ref={chainFilterRef}>
                <button
                  onClick={() => setChainFilterOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedChainIds.size > 0
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {selectedChainIds.size > 0 ? t('inbox.chainFilter', { count: selectedChainIds.size }) : t('inbox.chainAll')}
                  <svg className={`w-3 h-3 transition-transform ${chainFilterOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {chainFilterOpen && (
                  <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-48">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">{t('inbox.network')}</span>
                      {selectedChainIds.size > 0 && (
                        <button onClick={() => setSelectedChainIds(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800">
                          {t('inbox.clearAll')}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {availableChainIds.map((chainId) => {
                        const chain = CHAIN_CONFIG_MAP[chainId];
                        if (!chain) return null;
                        return (
                          <label key={chainId}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" className="accent-blue-600"
                              checked={selectedChainIds.has(chainId)}
                              onChange={() => setSelectedChainIds((prev) => {
                                const next = new Set(prev);
                                next.has(chainId) ? next.delete(chainId) : next.add(chainId);
                                return next;
                              })} />
                            <span className="text-xs text-gray-700 truncate">{chain.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 方向フィルタ */}
            <div className="flex rounded-full border border-gray-300 overflow-hidden text-xs">
              {(['in', 'out'] as DirectionFilter[]).map((key) => (
                <button key={key} onClick={() => setDirectionFilter(key)}
                  className={`px-3 py-1.5 transition-colors ${
                    directionFilter === key
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {key === 'in' ? t('inbox.receive') : t('inbox.send')}
                </button>
              ))}
            </div>

            {/* ラベルフィルタ */}
            {txLabels.length > 0 && (
              <div className="relative" ref={labelFilterRef}>
                <button
                  onClick={() => setLabelFilterOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedLabelIds.size > 0
                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {selectedLabelIds.size > 0 ? t('inbox.labelFilterActive', { count: selectedLabelIds.size }) : t('inbox.labelFilter')}
                  <svg className={`w-3 h-3 transition-transform ${labelFilterOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {labelFilterOpen && (
                  <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-52">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">{t('inbox.filterByLabel')}</span>
                      {selectedLabelIds.size > 0 && (
                        <button onClick={() => setSelectedLabelIds(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800">
                          {t('inbox.clearAll')}
                        </button>
                      )}
                    </div>

                    {/* AND / OR トグル（2つ以上選択時に表示） */}
                    {selectedLabelIds.size >= 2 && (
                      <div className="flex items-center gap-1 mb-2 p-1 bg-gray-100 rounded-lg">
                        <span className="text-xs text-gray-500 flex-1 pl-1">{t('inbox.matchCondition')}</span>
                        {(['and', 'or'] as LabelFilterMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setLabelFilterMode(mode)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                              labelFilterMode === mode
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {mode === 'and' ? t('inbox.matchAnd') : t('inbox.matchOr')}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {txLabels.map((label) => (
                        <label key={label.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-blue-600"
                            checked={selectedLabelIds.has(label.id)}
                            onChange={() => setSelectedLabelIds((prev) => {
                              const next = new Set(prev);
                              next.has(label.id) ? next.delete(label.id) : next.add(label.id);
                              return next;
                            })}
                          />
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                          <span className="text-xs text-gray-700 truncate">{label.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ラベルフィルタ選択中のピル */}
            {selectedLabelIds.size > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {txLabels.filter((l) => selectedLabelIds.has(l.id)).map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white font-medium"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    <button
                      onClick={() => setSelectedLabelIds((prev) => {
                        const next = new Set(prev);
                        next.delete(label.id);
                        return next;
                      })}
                      className="ml-0.5 opacity-75 hover:opacity-100"
                    >×</button>
                  </span>
                ))}
                {selectedLabelIds.size >= 2 && (
                  <span className="text-xs text-gray-400">
                    ({labelFilterMode === 'and' ? 'AND' : 'OR'})
                  </span>
                )}
              </div>
            )}

            {/* 検索トグルボタン */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                searchOpen || hasSearchFilter
                  ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {hasSearchFilter ? t('inbox.searchFilterActive') : t('inbox.searchFilter')}
            </button>

            {/* タイムゾーンセレクタ（右端） */}
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <select
                value={selectedTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer hover:text-gray-900"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex-shrink-0">
              {error}
            </div>
          )}

          {/* 検索パネル */}
          {searchOpen && (
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('inbox.fromAddress')}</label>
                  <input
                    type="text"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('inbox.toAddress')}</label>
                  <input
                    type="text"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('inbox.tokenName')}</label>
                  <input
                    type="text"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value)}
                    placeholder="USDC, ETH..."
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">{t('inbox.txHash')}</label>
                  <input
                    type="text"
                    value={searchTxHash}
                    onChange={(e) => setSearchTxHash(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('inbox.date')}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <span className="text-xs text-gray-400 flex-shrink-0">〜</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {hasSearchFilter ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearSearch}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      {t('inbox.clearSearch')}
                    </button>
                    {searchLoading && (
                      <span className="text-xs text-blue-500">{t('inbox.searching')}</span>
                    )}
                    {!searchLoading && searchResults !== null && (
                      <span className="text-xs text-gray-500">{searchResults.length}{t('inbox.searchResultCount')}</span>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                {filtered.length > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    CSV出力 ({filtered.length.toLocaleString()}件)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* リスト本体 */}
          <div className="flex-1 overflow-y-auto relative">
            {isListLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                <svg className="w-7 h-7 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            )}
            {initialSyncLoading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-2 h-2 bg-gray-200 rounded-full" />
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="w-14 h-3 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : initialSyncLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <svg className="w-8 h-8 animate-spin text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm text-gray-500">{t('inbox.loading')}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                </svg>
                <p className="text-sm text-gray-400">
                  {activeTab === 'unread' ? t('inbox.noUnread')
                    : activeTab === 'flagged' ? t('inbox.noFlagged')
                    : activeTab === 'hidden' ? t('inbox.noHidden')
                    : t('inbox.noTransactions')}

                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {filtered.map((tx) => (
                    <TransactionRow
                      key={tx.userTransactionId}
                      tx={tx}
                      isSelected={selectedTx?.userTransactionId === tx.userTransactionId}
                      contacts={contacts}
                      watchedWallets={wallets}
                      txLabels={(tx.labelIds ?? []).flatMap((id) => { const l = txLabelById.get(id); return l ? [l] : []; })}
                      timezone={selectedTimezone}
                      onClick={() => handleRowClick(tx)}
                      onToggleFlag={(e) => handleToggleFlag(e, tx)}
                      onToggleHidden={(e) => handleToggleHidden(e, tx)}
                      onMarkUnread={(e) => handleMarkUnread(e, tx)}
                      onOpenLabelPicker={(e) => { e.stopPropagation(); setLabelPickerTxId(tx.userTransactionId); }}
                    />
                  ))}
                </div>
                {!hasSearchFilter && transactions.length < totalCount && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={txLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {txLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      {txLoading ? t('inbox.loading') : `${t('inbox.loadMore')} (${transactions.length.toLocaleString()} / ${totalCount.toLocaleString()})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ---- 右ペイン: 詳細 ---- */}
        {selectedTx && (
          <DetailPanel
            tx={selectedTx}
            timezone={selectedTimezone}
            onClose={() => setSelectedTx(null)}
            onToggleFlag={(e) => handleToggleFlag(e, selectedTx)}
            onToggleHidden={(e) => handleToggleHidden(e, selectedTx)}
            onCopy={handleCopy}
            copyFeedback={copyFeedback}
            txLabels={(selectedTx.labelIds ?? []).flatMap((id) => { const l = txLabelById.get(id); return l ? [l] : []; })}
            onOpenLabelPicker={() => setLabelPickerTxId(selectedTx.userTransactionId)}
          />
        )}
      </div>

      {/* ウォレット追加モーダル */}
      {showAddModal && (
        <AddWalletModal
          existingAddresses={uniqueAddresses}
          onClose={() => setShowAddModal(false)}
          onAdded={handleWalletAdded}
        />
      )}

      {/* ラベルピッカーモーダル */}
      {labelPickerTxId !== null && (
        <LabelPickerModal
          userTransactionId={labelPickerTxId}
          currentLabels={(() => {
            const pickerTx = [...transactions, ...(searchResults ?? [])].find((t) => t.userTransactionId === labelPickerTxId);
            return (pickerTx?.labelIds ?? []).flatMap((id) => { const l = txLabelById.get(id); return l ? [l] : []; });
          })()}
          allLabels={txLabels}
          onAssign={handleAssignLabel}
          onRemove={handleRemoveLabelFromTx}
          onCreateAndAssign={handleCreateAndAssignLabel}
          onClose={() => setLabelPickerTxId(null)}
        />
      )}

      {/* ウォレット削除確認ダイアログ */}
      {deleteConfirmAddress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('inbox.deleteWalletTitle')}</h2>
            <p className="text-sm text-gray-600 mb-1">
              {t('inbox.deleteWalletDesc')}
            </p>
            <p className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-2 rounded-lg mb-4 break-all">
              {deleteConfirmAddress}
            </p>
            <p className="text-xs text-red-600 mb-5">{t('inbox.deleteIrreversible')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmAddress(null)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDeleteAddress(deleteConfirmAddress)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? t('inbox.deleting') : t('inbox.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// TransactionRow
// ============================================================

interface TransactionRowProps {
  tx: TransactionView;
  isSelected: boolean;
  contacts: Contact[];
  watchedWallets: WalletAddress[];
  txLabels: TransactionLabel[];
  timezone: string;
  onClick: () => void;
  onToggleFlag: (e: React.MouseEvent) => void;
  onToggleHidden: (e: React.MouseEvent) => void;
  onMarkUnread: (e: React.MouseEvent) => void;
  onOpenLabelPicker: (e: React.MouseEvent) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ tx, isSelected, contacts, watchedWallets, txLabels, timezone, onClick, onToggleFlag, onToggleHidden, onMarkUnread, onOpenLabelPicker }) => {
  const { t } = useTranslation();
  const isUnread = tx.state === 'unread';
  const isFlagged = tx.isFlagged;
  const isHidden = tx.isHidden;
  const isIn = tx.direction === 'in';
  const chain = CHAIN_CONFIG_MAP[tx.chainId];
  const counterparty = isIn ? tx.fromAddress : tx.toAddress;
  const counterpartyDisplay = resolveAddress(counterparty, contacts, watchedWallets);
  const formattedValue = formatValue(tx.value, tx.decimals);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : `hover:bg-gray-50 border-l-2 border-l-transparent ${isUnread ? 'bg-white' : 'bg-gray-50/30'}`
      }`}
    >
      {/* 未読ドット */}
      <div className="w-2 flex-shrink-0 flex justify-center">
        {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>

      {/* 方向アイコン */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
        isIn ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
      }`}>
        {isIn ? '↓' : '↑'}
      </div>

      {/* 中央 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {counterpartyDisplay}
          </span>
          {chain && (
            <span className={`inline-flex text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              chain.isTestnet ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-700'
            }`}>
              {chain.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <p className={`text-xs font-mono ${isIn ? 'text-green-600' : 'text-orange-600'} ${isUnread ? 'font-semibold' : ''}`}>
            {isIn ? '+' : '-'}{formattedValue} {tx.asset}
          </p>
          {txLabels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-white text-xs leading-none"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      </div>

      {/* 右端 */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs ${isUnread ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
          {tx.blockTimestamp ? formatTimestamp(tx.blockTimestamp, timezone) : '—'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenLabelPicker}
            className="px-2 text-gray-300 hover:text-purple-500 transition-colors rounded border border-gray-200 hover:border-purple-300"
            title={t('inbox.manageLabels')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </button>
          <button
            onClick={onToggleFlag}
            className={`px-2 text-base leading-none transition-colors rounded border ${
              isFlagged
                ? 'text-yellow-500 border-yellow-300'
                : 'text-gray-300 border-gray-200 hover:text-yellow-400 hover:border-yellow-300'
            }`}
            title={isFlagged ? t('inbox.removeFlag') : t('inbox.addFlag')}
          >
            ★
          </button>
          {!isUnread && (
            <button
              onClick={onMarkUnread}
              className="text-xs leading-none px-1.5 py-0.5 rounded transition-colors text-gray-300 hover:text-blue-500 hover:bg-blue-50"
              title={t('inbox.markUnread')}
            >
              {t('inbox.markUnread')}
            </button>
          )}
          <button
            onClick={onToggleHidden}
            className={`text-xs leading-none px-1.5 py-0.5 rounded transition-colors ${
              isHidden
                ? 'text-gray-500 bg-gray-200 hover:bg-gray-300'
                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
            }`}
            title={isHidden ? t('inbox.restore') : t('inbox.hide')}
          >
            {isHidden ? t('inbox.show') : t('inbox.hide')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// DetailPanel
// ============================================================

interface DetailPanelProps {
  tx: TransactionView;
  timezone: string;
  onClose: () => void;
  onToggleFlag: (e: React.MouseEvent) => void;
  onToggleHidden: (e: React.MouseEvent) => void;
  onCopy: (text: string) => void;
  copyFeedback: boolean;
  txLabels: TransactionLabel[];
  onOpenLabelPicker: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ tx, timezone, onClose, onToggleFlag, onToggleHidden, onCopy, copyFeedback, txLabels, onOpenLabelPicker }) => {
  const { t } = useTranslation();
  const isIn = tx.direction === 'in';
  const isFlagged = tx.isFlagged;
  const isHidden = tx.isHidden;
  const chain = CHAIN_CONFIG_MAP[tx.chainId];
  const explorerUrl = getExplorerTxUrl(tx.chainId, tx.txHash);
  const formattedValue = formatValue(tx.value, tx.decimals);

  return (
    <div className="w-1/2 flex flex-col bg-white overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${
            isIn ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {isIn ? '↓' : '↑'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isIn ? t('inbox.receive') : t('inbox.send')} — {formattedValue} {tx.asset}
            </p>
            <p className="text-xs text-gray-500">{tx.blockTimestamp ? formatTimestampFull(tx.blockTimestamp, timezone) : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleFlag}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
              isFlagged ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
            title={isFlagged ? t('inbox.removeFlag') : t('inbox.addFlag')}>
            ★
          </button>
          <button onClick={onToggleHidden}
            className={`px-2 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
              isHidden
                ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={isHidden ? t('inbox.restore') : t('inbox.hide')}>
            {isHidden ? t('inbox.restore') : t('inbox.hide')}
          </button>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 本文 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* 金額 */}
        <section className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('inbox.amount')}</p>
          <p className={`text-2xl font-bold ${isIn ? 'text-green-600' : 'text-orange-600'}`}>
            {isIn ? '+' : '-'}{formattedValue} {tx.asset}
          </p>
          {tx.category === 'erc20' && tx.contractAddress && (
            <p className="text-xs text-gray-400 font-mono mt-1">
              {t('inbox.contract')}: {tx.contractAddress}
            </p>
          )}
          {(tx.category === 'erc721' || tx.category === 'erc1155') && tx.tokenId !== null && (
            <p className="text-xs text-gray-400 mt-1">Token ID: {tx.tokenId}</p>
          )}
        </section>

        {/* ラベル */}
        <section>
          <DetailRow label={t('inbox.label')}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {txLabels.length > 0
                ? txLabels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))
                : <span className="text-xs text-gray-400 italic">{t('inbox.none')}</span>
              }
              <button
                onClick={onOpenLabelPicker}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('inbox.editLabel')}
              </button>
            </div>
          </DetailRow>
        </section>

        {/* From / To */}
        <section className="space-y-3">
          <DetailRow label="From">
            <AddressDisplay address={tx.fromAddress} onCopy={onCopy} />
          </DetailRow>
          <DetailRow label="To">
            <AddressDisplay address={tx.toAddress} onCopy={onCopy} />
          </DetailRow>
        </section>

        {/* ネットワーク */}
        <section>
          <DetailRow label={t('inbox.network2')}>
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
              chain?.isTestnet ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-700'
            }`}>
              {getChainName(tx.chainId)}
            </span>
          </DetailRow>
        </section>

        {/* Tx ハッシュ */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('inbox.txHash')}
          </p>
          <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-xs font-mono text-gray-700 break-all flex-1 select-all">{tx.txHash}</span>
            <button onClick={() => onCopy(tx.txHash)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500"
              title={t('inbox.copy')}>
              {copyFeedback
                ? <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
              }
            </button>
          </div>
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-800">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {t('inbox.viewOnExplorer')}
            </a>
          )}
        </section>

        {/* その他 */}
        <section className="space-y-3">
          <DetailRow label={t('inbox.blockNumber')}>
            <span className="text-sm font-mono text-gray-700">{tx.blockNumber.toLocaleString()}</span>
          </DetailRow>
          {tx.gasUsed && tx.gasPrice && (
            <DetailRow label={t('inbox.gasFee')}>
              <span className="text-sm font-mono text-gray-700">
                {(() => {
                  const feeWei = BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
                  const feeEth = Number(feeWei) / 1e18;
                  const symbol = chain?.nativeCurrency ?? 'ETH';
                  return `${feeEth.toFixed(8).replace(/\.?0+$/, '')} ${symbol}`;
                })()}
              </span>
            </DetailRow>
          )}
          <DetailRow label={t('inbox.watchWallet')}>
            <span className="text-xs font-mono text-gray-500 select-all break-all">{tx.watchedAddress}</span>
          </DetailRow>
          <DetailRow label={t('inbox.category')}>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tx.category}</span>
          </DetailRow>
          <DetailRow label={t('inbox.syncedAt')}>
            <span className="text-xs text-gray-500">{formatTimestampFull(tx.syncedAt, timezone)}</span>
          </DetailRow>
        </section>
      </div>
    </div>
  );
};

// ============================================================
// WalletBalanceAccordion
// ============================================================

interface TokenBalance {
  chainId: number;
  asset: string;
  contractAddress: string | null; // null = ネイティブ
  decimals: number;
  balance: string; // フォーマット済み
}

interface WalletBalanceCache {
  fetchedAt: string;
  balances: TokenBalance[];
}

interface WalletBalanceAccordionProps {
  address: string;
  chainIds: number[];
}

const ANKR_API_KEY = import.meta.env.VITE_ANKR_API_KEY as string;

function getAnkrRpcUrl(chainId: number): string | null {
  const network = ANKR_RPC_NETWORK[chainId];
  if (!network) return null;
  return `https://rpc.ankr.com/${network}/${ANKR_API_KEY}`;
}

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function rpcFetch(url: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  if (json.result === undefined) throw new Error('empty result');
  return json.result;
}

function hexToFormatted(hex: string, decimals: number): string {
  const raw = BigInt(hex).toString();
  return formatValue(raw, decimals);
}

const WalletBalanceAccordion: React.FC<WalletBalanceAccordionProps> = ({ address, chainIds }) => {
  const { t, i18n } = useTranslation();
  const cacheKey = `wallet_balance_${address}`;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<WalletBalanceCache | null>(() => {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as WalletBalanceCache;
      // 旧フォーマット（assets）は破棄
      if (!Array.isArray(parsed.balances)) { localStorage.removeItem(cacheKey); return null; }
      return parsed;
    } catch { return null; }
  });
  const [error, setError] = useState<string | null>(null);

  // アドレス変更時にキャッシュを再読み込み
  useEffect(() => {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) { setCache(null); return; }
    try {
      const parsed = JSON.parse(raw) as WalletBalanceCache;
      if (!Array.isArray(parsed.balances)) { localStorage.removeItem(cacheKey); setCache(null); return; }
      setCache(parsed);
    } catch { setCache(null); }
    setError(null);
  }, [cacheKey]);

  const fetchBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('未ログイン');

      // IndexedDB からこのアドレスのユニーク ERC20 一覧を取得
      const allErc20Tokens = await IndexedDBService.getUniqueErc20Tokens(userId, address);
      // スパムトークン除外（URL・パイプ・claim 等を含むシンボル名）
      const erc20Tokens = allErc20Tokens.filter(({ asset }) =>
        !/t\.me|http|www\.|\.com|\.io|\.org|\||claim|visit|airdrop|free\s*token/i.test(asset)
      );

      const balances: TokenBalance[] = [];

      // チェーンを順番に処理（並列だとレートリミットに引っかかるため）
      for (const chainId of chainIds) {
        const rpcUrl = getAnkrRpcUrl(chainId);
        if (!rpcUrl) continue;
        const chainConfig = CHAIN_CONFIG_MAP[chainId];
        if (!chainConfig) continue;

        // ネイティブトークン残高
        try {
          const hex = await rpcFetch(rpcUrl, 'eth_getBalance', [address, 'latest']);
          balances.push({
            chainId,
            asset: chainConfig.nativeCurrency,
            contractAddress: null,
            decimals: 18,
            balance: hexToFormatted(hex, 18),
          });
        } catch (e) {
          LoggingService.error(`ネイティブ残高取得失敗: chainId=${chainId}`, { message: e instanceof Error ? e.message : String(e) });
        }

        // このチェーンの ERC20 残高（ログ履歴ベース）
        const chainTokens = erc20Tokens.filter((t) => t.chainId === chainId);
        await pLimit(chainTokens.map((token) => async () => {
          if (!token.contractAddress) return;
          try {
            const data = '0x70a08231' + address.slice(2).padStart(64, '0');
            const hex = await rpcFetch(rpcUrl, 'eth_call', [
              { to: token.contractAddress, data },
              'latest',
            ]);
            if (!hex || hex === '0x' || BigInt(hex) === BigInt(0)) return;
            balances.push({
              chainId,
              asset: token.asset,
              contractAddress: token.contractAddress,
              decimals: token.decimals,
              balance: hexToFormatted(hex, token.decimals),
            });
          } catch (e) {
            LoggingService.error(`ERC20残高取得失敗: ${token.asset} chainId=${chainId}`, { message: e instanceof Error ? e.message : String(e) });
          }
        }), 3);
      }

      const newCache: WalletBalanceCache = { fetchedAt: new Date().toISOString(), balances };
      localStorage.setItem(cacheKey, JSON.stringify(newCache));
      setCache(newCache);
    } catch (err) {
      LoggingService.error('WalletBalanceAccordion: 残高取得失敗', { err });
      setError(err instanceof Error ? err.message : t('inbox.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  // チェーンごとにグループ化（native → ERC20 順）
  const grouped = React.useMemo(() => {
    if (!cache) return new Map<number, TokenBalance[]>();
    const map = new Map<number, TokenBalance[]>();
    for (const b of cache.balances) {
      const list = map.get(b.chainId) ?? [];
      list.push(b);
      map.set(b.chainId, list);
    }
    for (const [chainId, list] of map) {
      map.set(chainId, list.sort((a, b) => (a.contractAddress === null ? -1 : b.contractAddress === null ? 1 : 0)));
    }
    return map;
  }, [cache]);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* アコーディオンヘッダー */}
      <div className="flex items-center px-4 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('inbox.balance')}
        </button>
        {cache && (
          <span className="text-xs text-gray-400 ml-1.5">
            {t('inbox.balanceAsOf', { time: new Date(cache.fetchedAt).toLocaleString(i18n.language, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) })}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); fetchBalances(); }}
          disabled={loading}
          className="flex items-center gap-1 ml-2 px-2 py-0.5 text-xs rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title={t('inbox.refresh')}
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? t('inbox.refreshing') : t('inbox.refresh')}
        </button>
      </div>

      {/* アコーディオン本体 */}
      {open && (
        <div className="px-4 pb-3 max-h-48 overflow-y-auto">
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          {!cache && !loading && !error && (
            <p className="text-xs text-gray-400">{t('inbox.loadBalanceHint')}</p>
          )}
          {grouped.size === 0 && cache && !loading && (
            <p className="text-xs text-gray-400">{t('inbox.noBalanceTokens')}</p>
          )}
          {grouped.size > 0 && (
            <div className="space-y-3">
              {Array.from(grouped.entries()).map(([chainId, tokens]) => (
                <div key={chainId}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {CHAIN_CONFIG_MAP[chainId]?.name ?? `Chain ${chainId}`}
                  </p>
                  <table className="text-xs border-separate border-spacing-x-3">
                    <tbody>
                      {tokens.map((token, i) => (
                        <tr key={i}>
                          <td className="py-0.5 text-gray-700 font-medium whitespace-nowrap">
                            {token.asset}
                            {token.contractAddress === null && (
                              <span className="text-gray-400 font-normal ml-1">({t('inbox.native')})</span>
                            )}
                          </td>
                          <td className="py-0.5 text-right font-mono text-gray-800">
                            {token.balance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// LabelPickerModal
// ============================================================

interface LabelPickerModalProps {
  userTransactionId: number;
  currentLabels: TransactionLabel[];
  allLabels: TransactionLabel[];
  onAssign: (userTransactionId: number, labelId: number) => Promise<void>;
  onRemove: (userTransactionId: number, labelId: number) => Promise<void>;
  onCreateAndAssign: (name: string, color: string, userTransactionId: number) => Promise<TransactionLabel>;
  onClose: () => void;
}

const LabelPickerModal: React.FC<LabelPickerModalProps> = ({
  userTransactionId,
  currentLabels,
  allLabels,
  onAssign,
  onRemove,
  onCreateAndAssign,
  onClose,
}) => {
  const { t } = useTranslation();
  const currentLabelIds = new Set(currentLabels.map((l) => l.id));
  const [toggling, setToggling] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (label: TransactionLabel) => {
    setToggling(label.id);
    setError(null);
    try {
      if (currentLabelIds.has(label.id)) {
        await onRemove(userTransactionId, label.id);
      } else {
        await onAssign(userTransactionId, label.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inbox.operationFailed'));
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setError(t('inbox.labelNameRequired')); return; }
    setCreating(true);
    setError(null);
    try {
      await onCreateAndAssign(newName.trim(), newColor, userTransactionId);
      setNewName('');
      setNewColor('#6366f1');
      setShowNewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inbox.labelCreateFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{t('inbox.setLabel')}</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {allLabels.length === 0 && !showNewForm && (
            <p className="text-sm text-gray-400 text-center py-4">
              {t('inbox.noLabels')}
            </p>
          )}
          {allLabels.map((label) => {
            const isAssigned = currentLabelIds.has(label.id);
            const isLoading = toggling === label.id;
            return (
              <button
                key={label.id}
                onClick={() => handleToggle(label)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                  isAssigned
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-transparent hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 ${
                  isAssigned ? 'border-gray-400 bg-gray-400' : 'border-gray-300'
                }`}>
                  {isAssigned && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                <span className="flex-1 text-sm text-gray-800">{label.name}</span>
                {isLoading && (
                  <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
              </button>
            );
          })}

          {/* 新規作成フォーム */}
          {showNewForm ? (
            <form onSubmit={handleCreate} className="mt-2 p-3 border border-blue-200 bg-blue-50 rounded-xl space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('inbox.newLabelName')}
                maxLength={100}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1.5 flex-wrap">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      newColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {creating ? t('inbox.creating') : t('inbox.createAndAdd')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); setNewName(''); setError(null); }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowNewForm(true); setError(null); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 rounded-xl border border-dashed border-blue-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('inbox.createNewLabel')}
            </button>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- ヘルパーコンポーネント ----

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-3">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
);

const AddressDisplay: React.FC<{ address: string; onCopy: (text: string) => void }> = ({ address, onCopy }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-mono text-gray-700 break-all select-all">{address}</span>
      <button onClick={() => onCopy(address)}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400"
        title={t('inbox.copy')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
};

export default InboxView;
