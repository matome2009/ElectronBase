import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAddress } from 'ethers';
import { WalletService } from '../services/WalletService';
import { LoggingService } from '../../services/LoggingService';
import { openExternal } from '../../services/TauriService';
import { MAINNET_CHAINS, TESTNET_CHAINS } from '../../config/chains';
import { WalletAddress, ChainId } from '../../models/index';
import { getFirebaseAuth } from '../../services/FirebaseService';
import { useSettingsController } from '../controllers/useSettingsController';
import { getMarketingPageUrl } from '../../config/app';

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#6b7280',
];

// ============================================================
// ウォレット追加モーダル
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
    if (!addr.trim()) return t('settings.addressRequired');
    if (!isAddress(addr.trim())) return t('settings.addressInvalid');
    if (existingAddresses.includes(addr.trim().toLowerCase())) return t('settings.addressDuplicate');
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
      setError(err instanceof Error ? err.message : t('settings.walletAddFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addressError = address ? validateAddress(address) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{t('settings.addWallet')}</h2>
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
              {t('settings.walletAddress')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setError(null); }}
              placeholder="0x..."
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono ${
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
              <p className="mt-1 text-xs text-green-600">{t('settings.addressValid')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.name')} <span className="text-gray-400 text-xs">{t('settings.optional')}</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('settings.namePlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !!addressError || !address.trim()}
              className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('settings.registering') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// チェーントグル行
// ============================================================
interface ChainToggleRowProps {
  chainId: number;
  chainName: string;
  isTestnet: boolean;
  isActive: boolean;
  loading: boolean;
  onToggle: (isActive: boolean) => void;
}

const ChainToggleRow: React.FC<ChainToggleRowProps> = ({
  chainName,
  isTestnet,
  isActive,
  loading,
  onToggle,
}) => (
  <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
    <span className={`text-sm ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
      {chainName}
      {isTestnet && (
        <span className="ml-1.5 text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
          testnet
        </span>
      )}
    </span>
    {loading ? (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <svg
          className="animate-spin h-3.5 w-3.5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        設定中...
      </span>
    ) : (
      <button
        type="button"
        disabled={loading}
        onClick={() => onToggle(!isActive)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          isActive ? (isTestnet ? 'bg-orange-400' : 'bg-blue-500') : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            isActive ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    )}
  </div>
);

// ============================================================
// メインビュー
// ============================================================
interface SettingsViewProps {
  initialAddress?: string;
  scrollTo?: 'plan';
}

function getSiteLang(lang: string): string {
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

const SettingsView: React.FC<SettingsViewProps> = ({ initialAddress, scrollTo }) => {
  const { t, i18n } = useTranslation();
  const toggleErrorRef = useRef<HTMLDivElement | null>(null);
  const {
    loading, selectedAddress, togglingChain, showAddModal, showTestnets,
    editingLabel, labelInput, labelSaving, labelError,
    txLabels, labelsLoading, showAddLabelForm, newLabelName, newLabelColor,
    newLabelSaving, newLabelError, editingTxLabel, editLabelName, editLabelColor,
    editLabelSaving, editLabelError, toggleError,
    planStatus, planLoading, planCheckoutLoading,
    cacheClearing, cacheClearDone,
    setShowAddModal, setShowTestnets, setEditingLabel, setLabelInput, setLabelError,
    setToggleError,
    setNewLabelName, setNewLabelColor, setNewLabelError, setShowAddLabelForm,
    setEditingTxLabel, setEditLabelName, setEditLabelColor,
    registeredAddresses, chainEntries, getLabelForAddress,
    handleSelectAddress, handleStartEditLabel, handleSaveLabel,
    handleChainToggle, handleDeleteWallet, handleExportCsv,
    handleAddLabel, handleStartEditTxLabel, handleSaveLabelEdit, handleDeleteLabel,
    handleStartCheckout, handleAdded, handleClearCache,
  } = useSettingsController({ initialAddress, scrollTo });

  useEffect(() => {
    if (!toggleError) return;
    toggleErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [toggleError]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {registeredAddresses.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              title="CSV出力"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('settings.addWallet')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ) : registeredAddresses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-sm text-gray-400">{t('settings.noWallets')}</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('settings.addFirstWallet')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ウォレット選択セレクトボックス */}
          <div className="flex items-center gap-3">
            <select
              value={selectedAddress}
              onChange={(e) => handleSelectAddress(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
            >
              {registeredAddresses.map((addr) => {
                const label = getLabelForAddress(addr);
                const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                return (
                  <option key={addr} value={addr}>
                    {label ? `${label} (${short})` : short}
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleDeleteWallet}
              className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
              title={t('common.delete')}
            >
              {t('common.delete')}
            </button>
          </div>

          {/* ラベル編集 */}
          {editingLabel ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder={t('settings.namePlaceholderDelete')}
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLabel(); if (e.key === 'Escape') { setEditingLabel(false); setLabelError(null); } }}
                  className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveLabel}
                  disabled={labelSaving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {labelSaving ? t('settings.saving') : t('common.save')}
                </button>
                <button
                  onClick={() => { setEditingLabel(false); setLabelError(null); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
              {labelError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{labelError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex-1">
                {getLabelForAddress(selectedAddress)
                  ? <span className="text-gray-800">{getLabelForAddress(selectedAddress)}</span>
                  : <span className="text-gray-400 italic">{t('settings.noName')}</span>
                }
              </span>
              <button
                onClick={handleStartEditLabel}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('settings.nameEdit')}
              </button>
            </div>
          )}

          {/* プラン制限エラー */}
          {toggleError && (
            <div
              ref={toggleErrorRef}
              className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p>{toggleError}</p>
                <button
                  onClick={() => setToggleError(null)}
                  className="mt-1 text-xs text-amber-600 underline"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}

          {/* チェーントグルリスト */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* メインネット */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('settings.mainnet')}
              </span>
            </div>
            <div className="divide-y divide-gray-50 px-1 py-1">
              {MAINNET_CHAINS.map((chain) => {
                const entry = chainEntries.get(chain.id as ChainId);
                return (
                  <ChainToggleRow
                    key={chain.id}
                    chainId={chain.id}
                    chainName={chain.name}
                    isTestnet={false}
                    isActive={entry?.isActive ?? false}
                    loading={togglingChain === chain.id}
                    onToggle={(isActive) => handleChainToggle(chain.id as ChainId, isActive)}
                  />
                );
              })}
            </div>

            {/* テストネット（折りたたみ） */}
            <div
              className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-t border-gray-100 cursor-pointer"
              onClick={() => setShowTestnets((v) => !v)}
            >
              <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                {t('settings.testnetSection')}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-orange-400 transition-transform ${showTestnets ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            {showTestnets && (
              <div className="divide-y divide-gray-50 px-1 py-1">
                {TESTNET_CHAINS.map((chain) => {
                  const entry = chainEntries.get(chain.id as ChainId);
                  return (
                    <ChainToggleRow
                      key={chain.id}
                      chainId={chain.id}
                      chainName={chain.name}
                      isTestnet={true}
                      isActive={entry?.isActive ?? false}
                      loading={togglingChain === chain.id}
                      onToggle={(isActive) => handleChainToggle(chain.id as ChainId, isActive)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddWalletModal
          existingAddresses={registeredAddresses}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}

      {/* ============================================================ */}
      {/* ラベル管理セクション */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('settings.labelManagement')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('settings.labelManagementSubtitle')}</p>
          </div>
          <button
            onClick={() => { setShowAddLabelForm(true); setNewLabelError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('settings.addLabel')}
          </button>
        </div>

        {/* 追加フォーム */}
        {showAddLabelForm && (
          <form onSubmit={handleAddLabel} className="mb-4 p-4 border border-blue-200 bg-blue-50 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-blue-800">{t('settings.newLabel')}</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.labelName')}</label>
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder={t('settings.labelPlaceholder')}
                maxLength={100}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">{t('settings.color')}</label>
              <div className="flex gap-2 flex-wrap">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewLabelColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      newLabelColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: newLabelColor }} />
                <span className="text-xs text-gray-500">{t('settings.selected')}: {newLabelColor}</span>
              </div>
            </div>
            {newLabelError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{newLabelError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={newLabelSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {newLabelSaving ? t('settings.saving') : t('settings.createButton')}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddLabelForm(false); setNewLabelName(''); setNewLabelError(null); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}

        {/* ラベル一覧 */}
        {labelsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : txLabels.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-sm text-gray-400">{t('settings.noLabels')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txLabels.map((label) => (
              <div key={label.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {editingTxLabel?.id === label.id ? (
                  /* 編集フォーム */
                  <div className="p-4 space-y-3 bg-gray-50">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.labelName')}</label>
                      <input
                        type="text"
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        maxLength={100}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLabelEdit(); if (e.key === 'Escape') setEditingTxLabel(null); }}
                        className="w-full px-3 py-2 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">{t('settings.color')}</label>
                      <div className="flex gap-2 flex-wrap">
                        {LABEL_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditLabelColor(c)}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              editLabelColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    {editLabelError && (
                      <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{editLabelError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveLabelEdit}
                        disabled={editLabelSaving}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                      >
                        {editLabelSaving ? t('settings.saving') : t('common.save')}
                      </button>
                      <button
                        onClick={() => setEditingTxLabel(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 表示行 */
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                    <span className="flex-1 text-sm font-medium text-gray-800">{label.name}</span>
                    <button
                      onClick={() => handleStartEditTxLabel(label)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title={t('common.edit')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLabel(label)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title={t('common.delete')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* プランステータスセクション */}
      {/* ============================================================ */}
      <div id="plan-section">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('settings.planSection')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.planSubtitle')}</p>
        </div>

        {planLoading ? (
          <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ) : planStatus ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* 現在のプラン */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    planStatus.planKey === 'heavy'
                      ? 'bg-purple-100 text-purple-700'
                      : planStatus.planKey === 'light'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {planStatus.planKey === 'heavy' ? t('settings.planHeavy') : planStatus.planKey === 'light' ? t('settings.planLight') : t('settings.planFree')}
                  </span>
                  {planStatus.expiresAt && (
                    <span className="text-sm text-gray-500">
                      {t('settings.planExpiry')}: {new Date(planStatus.expiresAt).toLocaleDateString(i18n.language)}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 text-right">
                  <span>
                    {t('settings.addressCount')}: {planStatus.currentAddressCount}
                    {planStatus.limits.maxAddresses !== null ? ` / ${planStatus.limits.maxAddresses}` : ''}
                  </span>
                  <span className="ml-3">
                    {t('settings.networkCount')}{planStatus.limits.maxNetworksPerAddress !== null ? `${planStatus.limits.maxNetworksPerAddress}` : t('settings.networkUnlimited')}
                  </span>
                </div>
              </div>
            </div>

            {/* プラン一覧 */}
            <div className="divide-y divide-gray-100">
              {/* ライトプラン */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t('settings.lightPlan')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('settings.lightPlanDesc')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">¥300</span>
                  {planStatus.planKey !== 'heavy' && (
                    <button
                      onClick={() => handleStartCheckout('light')}
                      disabled={planCheckoutLoading}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {planStatus.planKey === 'light' ? t('settings.renew') : t('settings.purchase')}
                    </button>
                  )}
                  {planStatus.planKey === 'heavy' && (
                    <span className="text-xs text-gray-400">{t('settings.includedInHeavy')}</span>
                  )}
                </div>
              </div>

              {/* ヘビープラン */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t('settings.heavyPlan')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('settings.heavyPlanDesc')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">
                    {planStatus.planKey === 'light' ? '¥1,600' : '¥1,900'}
                    {planStatus.planKey === 'light' && (
                      <span className="ml-1 text-xs text-gray-400 line-through">¥1,900</span>
                    )}
                  </span>
                  {planStatus.planKey !== 'heavy' && (
                    <button
                      onClick={() => handleStartCheckout('heavy')}
                      disabled={planCheckoutLoading}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {planStatus.planKey === 'light' ? t('settings.upgrade') : t('settings.purchase')}
                    </button>
                  )}
                  {planStatus.planKey === 'heavy' && (
                    <button
                      onClick={() => handleStartCheckout('heavy')}
                      disabled={planCheckoutLoading}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {t('settings.renew')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {planStatus.planKey === 'light' && (
              <p className="px-4 pb-3 text-xs text-blue-600">
                {t('settings.lightUpgradeNote')}
              </p>
            )}
          </div>
        ) : null}
      <div className="flex gap-4 text-xs text-gray-400 mt-2">
        <button
          onClick={() => {
            const url = getMarketingPageUrl('privacy-policy.html', getSiteLang(i18n.language));
            if (url) {
              openExternal(url);
            }
          }}
          className="hover:text-gray-600 underline"
        >
          {t('settings.privacyPolicy')}
        </button>
        <button
          onClick={() => {
            const url = getMarketingPageUrl('commercial-law.html', getSiteLang(i18n.language));
            if (url) {
              openExternal(url);
            }
          }}
          className="hover:text-gray-600 underline"
        >
          {t('settings.commercialLaw')}
        </button>
      </div>
      </div>

      {/* ============================================================ */}
      {/* ユーザーID（お問い合わせ用） */}
      {/* ============================================================ */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('settings.userId')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.userIdSubtitle')}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-xs font-mono text-gray-600 break-all">
            {getFirebaseAuth().currentUser?.uid ?? '—'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ローカルキャッシュクリア */}
      {/* ============================================================ */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('settings.clearCache')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.clearCacheSubtitle')}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">{t('settings.clearCacheDescription')}</p>
          <button
            onClick={handleClearCache}
            disabled={cacheClearing}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cacheClearing ? t('settings.clearCacheClearing') : t('settings.clearCacheButton')}
          </button>
        </div>
        {cacheClearDone && (
          <p className="mt-2 text-sm text-green-600">{t('settings.clearCacheDone')}</p>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
