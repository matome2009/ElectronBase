import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CHAIN_CONFIG_MAP } from '../../config/chains';
import { WalletService } from '../services/WalletService';
import { IndexedDBService } from '../services/IndexedDBService';
import { TransactionService, PlanExpiredError } from '../services/TransactionService';
import { ContactService } from '../services/ContactService';
import { LabelService } from '../services/LabelService';
import { LocalStorageService } from '../../services/LocalStorageService';
import { PlanService } from '../services/PlanService';
import { LoggingService } from '../../services/LoggingService';
import { getFirebaseAuth } from '../../services/FirebaseService';
import {
  TransactionView,
  WalletAddress,
  Contact,
  TransactionLabel,
} from '../../models/index';

// ============================================================
// 画面遷移をまたいで同期時刻を保持する（再マウント時のリセット防止）
// ============================================================

const lastSyncedAt: Record<string, number> = {};

export function resetLastSyncedAt(): void {
  Object.keys(lastSyncedAt).forEach((k) => delete lastSyncedAt[k]);
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5分

// ============================================================
// 型
// ============================================================

export type TabKey = 'all' | 'unread' | 'flagged' | 'hidden';
export type DirectionFilter = 'in' | 'out';
export type LabelFilterMode = 'and' | 'or';

export const PAGE_SIZE = 100;


// ============================================================
// useInboxController
// ============================================================

export function useInboxController() {
  const { t } = useTranslation();

  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [initialSyncLoading, setInitialSyncLoading] = useState(false);
  const [isInboxInitializing, setIsInboxInitializing] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState({ unread: 0, flagged: 0, hidden: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [planExpiredMessage, setPlanExpiredMessage] = useState<string | null>(null);
  const [planCheckoutLoading, setPlanCheckoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const activeTabRef = useRef<TabKey>('all');
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const [selectedChainIds, setSelectedChainIds] = useState<Set<number>>(new Set());
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('in');
  const directionFilterRef = useRef<DirectionFilter>('in');
  useEffect(() => { directionFilterRef.current = directionFilter; }, [directionFilter]);
  const [chainFilterOpen, setChainFilterOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionView | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // wallets の最新値を useCallback 内から参照するための ref（依存配列ループ回避）
  const walletsRef = useRef<WalletAddress[]>([]);
  useEffect(() => { walletsRef.current = wallets; }, [wallets]);

  // selectedAddress の最新値を useCallback 内から参照するための ref
  const selectedAddressRef = useRef<string | null>(null);

  // StrictMode 二重実行ガード
  const initialLoadedRef = useRef(false);

  // アドレスタブ
  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    () => LocalStorageService.getActiveWalletAddress()
  );
  useEffect(() => { selectedAddressRef.current = selectedAddress; }, [selectedAddress]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmAddress, setDeleteConfirmAddress] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // DOM refs（チェーン/ラベルフィルタのクリック外閉じ用）
  const chainFilterRef = useRef<HTMLDivElement>(null);
  const labelFilterRef = useRef<HTMLDivElement>(null);

  // ラベル関連
  const [txLabels, setTxLabels] = useState<TransactionLabel[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<number>>(new Set());
  const [labelFilterMode, setLabelFilterMode] = useState<LabelFilterMode>('and');
  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const [labelPickerTxId, setLabelPickerTxId] = useState<number | null>(null);

  // 検索フィルタ
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchToken, setSearchToken] = useState('');
  const [searchTxHash, setSearchTxHash] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchResults, setSearchResults] = useState<TransactionView[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const hasSearchFilter = !!(searchFrom || searchTo || searchToken || searchTxHash || dateFrom || dateTo);

  const clearSearch = () => {
    setSearchFrom('');
    setSearchTo('');
    setSearchToken('');
    setSearchTxHash('');
    setDateFrom('');
    setDateTo('');
    setSearchResults(null);
  };

  const patchTransactionState = useCallback(
    (userTransactionId: number, patch: Partial<TransactionView>) => {
      setTransactions((prev) => prev.map((tx) =>
        tx.userTransactionId === userTransactionId ? { ...tx, ...patch } : tx,
      ));
      setSearchResults((prev) => prev
        ? prev.map((tx) => tx.userTransactionId === userTransactionId ? { ...tx, ...patch } : tx)
        : prev,
      );
      setSelectedTx((prev) => prev?.userTransactionId === userTransactionId ? { ...prev, ...patch } : prev);
    },
    [],
  );

  const updateBadgeCounts = useCallback((patch: {
    unread?: number;
    flagged?: number;
    hidden?: number;
  }) => {
    setBadgeCounts((prev) => ({
      unread: Math.max(0, prev.unread + (patch.unread ?? 0)),
      flagged: Math.max(0, prev.flagged + (patch.flagged ?? 0)),
      hidden: Math.max(0, prev.hidden + (patch.hidden ?? 0)),
    }));
  }, []);

  // タイムゾーン（LocalStorageに永続化）
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    () => localStorage.getItem('inbox_timezone') ?? 'UTC'
  );
  const handleTimezoneChange = (tz: string) => {
    localStorage.setItem('inbox_timezone', tz);
    setSelectedTimezone(tz);
  };

  // ============================================================
  // ユニークアドレスリスト
  // ============================================================

  const uniqueAddresses = Array.from(new Set(wallets.map((w) => w.address.toLowerCase())));

  function getAddressLabel(addr: string): string | undefined {
    return wallets.find((w) => w.address.toLowerCase() === addr)?.label ?? undefined;
  }

  // ============================================================
  // キャッシュからの読み込み
  // ============================================================

  // タブ → DB クエリオプションへの変換
  const tabToQueryOptions = (tab: TabKey): { state?: string; isFlagged?: boolean; isHidden?: boolean } => {
    if (tab === 'unread') return { state: 'unread' };
    if (tab === 'flagged') return { isFlagged: true };
    if (tab === 'hidden') return { isHidden: true };
    return {};
  };

  const loadFromCache = useCallback(async (
    userId: string,
    activeWallets?: WalletAddress[],
    selectedAddr?: string | null,
    direction?: DirectionFilter,
  ): Promise<number> => {
    setTxLoading(true);
    setIsListLoading(true);
    try {
      const src = activeWallets ?? walletsRef.current;
      const activeAddresses = [...new Set(src.map((w) => w.address.toLowerCase()))];
      const addrFilter = activeAddresses.length > 0 ? activeAddresses : undefined;

      // アドレス・方向・タブを DB レベルで絞り込み
      const addr = selectedAddr ?? selectedAddressRef.current;
      const dir = direction ?? directionFilterRef.current;
      const tabOpts = tabToQueryOptions(activeTabRef.current);
      const [result, counts] = await Promise.all([
        TransactionService.getTransactionsFromCache(userId, addr
          ? { page: 1, pageSize: PAGE_SIZE, watchedAddress: addr, direction: dir, ...tabOpts }
          : { page: 1, pageSize: PAGE_SIZE, activeAddresses: addrFilter, direction: dir, ...tabOpts },
        ),
        IndexedDBService.countUserTransactions(userId, addr ? [addr] : addrFilter),
      ]);
      setTransactions(result.transactions);
      setTotalCount(result.total);
      setPage(1);
      setBadgeCounts(counts);
      return result.total;
    } catch (cacheErr) {
      LoggingService.error('InboxController: キャッシュ読み込み失敗', { cacheErr });
      return 0;
    } finally {
      setTxLoading(false);
      setIsListLoading(false);
    }
  }, []);

  // ============================================================
  // バックグラウンド同期
  // ============================================================

  const syncWallets = useCallback(async (targetWallets: WalletAddress[], userId: string, force = false) => {
    if (planExpiredMessage) return;
    if (!force) {
      const now = Date.now();
      const addresses = [...new Set(targetWallets.map((w) => w.address.toLowerCase()))];
      const allRecent = addresses.every((addr) => {
        const last = lastSyncedAt[addr] ?? 0;
        return now - last < SYNC_INTERVAL_MS;
      });
      if (allRecent) return;
    }
    setIsSyncing(true);
    let planExpiredDetected = false;
    const seen = new Set<string>();
    const uniqueTargets = targetWallets.filter((w) => {
      if (!w.isActive) return false;
      const key = `${w.address.toLowerCase()}_${w.chainId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const syncPromises = uniqueTargets.map(async (wallet) => {
      if (planExpiredDetected) return null;
      try {
        const result = await TransactionService.syncAndGetTransactions(
          wallet.chainId,
          wallet.address,
          { page: 1, pageSize: PAGE_SIZE },
          () => loadFromCache(getFirebaseAuth().currentUser!.uid),
        );
        LoggingService.info('InboxController: 同期完了', {
          chainId: wallet.chainId, address: wallet.address, total: result.total,
        });
        return result;
      } catch (syncErr) {
        if (syncErr instanceof PlanExpiredError) {
          planExpiredDetected = true;
          setPlanExpiredMessage(syncErr.limitMessage);
          setIsSyncing(false);
          LoggingService.warn('InboxController: プラン期限切れのため同期停止', { message: syncErr.limitMessage });
        } else {
          LoggingService.error('InboxController: 同期失敗', {
            chainId: wallet.chainId, address: wallet.address, syncErr,
          });
        }
        return null;
      }
    });

    await Promise.all(syncPromises);
    const now = Date.now();
    const addresses = [...new Set(targetWallets.map((w) => w.address.toLowerCase()))];
    addresses.forEach((addr) => { lastSyncedAt[addr] = now; });
    setIsSyncing(false);
    try {
      const activeAddresses = [...new Set(walletsRef.current.map((w) => w.address.toLowerCase()))];
      const addrFilter = activeAddresses.length > 0 ? activeAddresses : undefined;
      const addr = selectedAddressRef.current;
      const dir = directionFilterRef.current;
      const tabOpts = tabToQueryOptions(activeTabRef.current);
      const [refreshed, counts] = await Promise.all([
        TransactionService.getTransactionsFromCache(userId, addr
          ? { page: 1, pageSize: PAGE_SIZE, watchedAddress: addr, direction: dir, ...tabOpts }
          : { page: 1, pageSize: PAGE_SIZE, activeAddresses: addrFilter, direction: dir, ...tabOpts },
        ),
        IndexedDBService.countUserTransactions(userId, addr ? [addr] : addrFilter),
      ]);
      setTransactions(refreshed.transactions);
      setTotalCount(refreshed.total);
      setPage(1);
      setBadgeCounts(counts);
    } catch (refreshErr) {
      LoggingService.error('InboxController: 同期後のキャッシュ再ロード失敗', { refreshErr });
    }
  }, [planExpiredMessage, loadFromCache]);

  // ============================================================
  // 初期ロード
  // ============================================================

  const loadInitial = useCallback(async () => {
    if (initialLoadedRef.current) return;
    initialLoadedRef.current = true;
    setIsInboxInitializing(true);
    setWalletsLoading(true);
    setError(null);

    try {
      const [fetchedWallets, fetchedContacts, labelsData] = await Promise.all([
        WalletService.getWatchedWallets(),
        ContactService.getContacts(),
        LabelService.getLabels(),
      ]);
      setWallets(fetchedWallets);
      setContacts(fetchedContacts);
      setTxLabels(labelsData.labels);

      if (fetchedWallets.length === 0) {
        setWalletsLoading(false);
        setIsInboxInitializing(false);
        return;
      }

      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error(t('inbox.notAuthenticated'));

      const savedAddr = LocalStorageService.getActiveWalletAddress();
      const exists = savedAddr && fetchedWallets.some(w => w.address.toLowerCase() === savedAddr.toLowerCase());
      const targetAddr = exists ? savedAddr! : fetchedWallets[0].address.toLowerCase();

      setSelectedAddress(targetAddr);
      selectedAddressRef.current = targetAddr;
      LocalStorageService.setActiveWalletAddress(targetAddr);

      const activeAddresses = [...new Set(fetchedWallets.map((w) => w.address.toLowerCase()))];
      const cachePresence = await TransactionService.getTransactionsFromCache(userId, {
        page: 1,
        pageSize: 1,
        activeAddresses,
      });
      await loadFromCache(userId, fetchedWallets, targetAddr);
      const hadLocalCache = cachePresence.total > 0;
      setWalletsLoading(false);

      const targetWallets = hadLocalCache
        ? fetchedWallets.filter((w) => w.address.toLowerCase() === targetAddr)
        : fetchedWallets.filter((w) => w.isActive);
      if (!hadLocalCache) {
        setInitialSyncLoading(true);
      } else {
        setIsInboxInitializing(false);
      }

      (async () => {
        try {
          if (!hadLocalCache) {
            LocalStorageService.setUserTransactionSyncCursor(userId, null);
          }
          await TransactionService.syncUserTransactionDeltas(
            userId,
            () => loadFromCache(userId, fetchedWallets, targetAddr),
          );
          await loadFromCache(userId, fetchedWallets, targetAddr);
        } catch (syncErr) {
          LoggingService.error('InboxController: user_transactions 差分同期失敗', { syncErr });
        }

        try {
          await syncWallets(targetWallets, userId);
        } catch (err) {
          LoggingService.error('InboxController: バックグラウンド同期失敗', { err });
        } finally {
          setInitialSyncLoading(false);
          setIsInboxInitializing(false);
        }
      })();
    } catch (err) {
      LoggingService.error('InboxController: 初期ロード失敗', { err });
      setError(err instanceof Error ? err.message : t('inbox.loadFailed'));
      setWalletsLoading(false);
      setInitialSyncLoading(false);
      setIsInboxInitializing(false);
    }
  }, [loadFromCache, syncWallets, t]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // IN/OUT・タブ切り替え時に DB レベルで再フェッチ（初期ロード後のみ）
  useEffect(() => {
    if (!initialLoadedRef.current) return;
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    loadFromCache(userId);
  }, [directionFilter, activeTab, loadFromCache]);

  // 5分ごとの自動同期
  useEffect(() => {
    const timer = setInterval(() => {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (!userId || isSyncing || planExpiredMessage) return;
      const targetWallets = selectedAddress
        ? wallets.filter((w) => w.address.toLowerCase() === selectedAddress)
        : wallets;
      syncWallets(targetWallets, userId);
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [selectedAddress, wallets, isSyncing, planExpiredMessage, syncWallets]);

  // 手動同期
  const handleManualSync = useCallback(async () => {
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId || isSyncing) return;
    const targetWallets = selectedAddress
      ? wallets.filter((w) => w.address.toLowerCase() === selectedAddress)
      : wallets;
    await syncWallets(targetWallets, userId, true);
  }, [selectedAddress, wallets, isSyncing, syncWallets]);

  // 検索フィルタが変わったら IndexedDB 全件検索
  useEffect(() => {
    if (!hasSearchFilter) { setSearchResults(null); return; }
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const activeAddresses = wallets.map((w) => w.address.toLowerCase());
    setSearchLoading(true);
    IndexedDBService.searchTransactions(userId, {
      txHash: searchTxHash || undefined,
      fromAddress: searchFrom || undefined,
      toAddress: searchTo || undefined,
      asset: searchToken || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      activeAddresses: activeAddresses.length > 0 ? activeAddresses : undefined,
    }).then((results) => {
      setSearchResults(results);
    }).catch((err) => {
      LoggingService.error('InboxController: 検索失敗', { err });
    }).finally(() => {
      setSearchLoading(false);
    });
  }, [hasSearchFilter, searchTxHash, searchFrom, searchTo, searchToken, dateFrom, dateTo, wallets]);

  // チェーンフィルタ・ラベルフィルタ クリック外で閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chainFilterRef.current && !chainFilterRef.current.contains(e.target as Node)) {
        setChainFilterOpen(false);
      }
      if (labelFilterRef.current && !labelFilterRef.current.contains(e.target as Node)) {
        setLabelFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ============================================================
  // アドレスタブ切り替え
  // ============================================================

  const handleAddressSelect = useCallback(async (addr: string) => {
    const normalizedAddr = addr.toLowerCase();
    if (normalizedAddr === selectedAddress) return;
    setSelectedAddress(normalizedAddr);
    selectedAddressRef.current = normalizedAddr;
    LocalStorageService.setActiveWalletAddress(normalizedAddr);
    setPage(1);
    setSelectedTx(null);

    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await loadFromCache(userId, undefined, normalizedAddr);

    const targetWallets = wallets.filter((w) => w.address.toLowerCase() === addr);
    syncWallets(targetWallets, userId);
  }, [selectedAddress, wallets, loadFromCache, syncWallets]);

  // ============================================================
  // ウォレット追加完了
  // ============================================================

  const handleWalletAdded = useCallback(async (addedWallets: WalletAddress[]) => {
    setShowAddModal(false);
    const newAddr = addedWallets[0]?.address.toLowerCase();
    if (!newAddr) return;

    const refreshed = await WalletService.getWatchedWallets();
    setWallets(refreshed);
    setSelectedAddress(newAddr);
    selectedAddressRef.current = newAddr;
    LocalStorageService.setActiveWalletAddress(newAddr);
    setPage(1);
    setSelectedTx(null);

    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await loadFromCache(userId, refreshed, newAddr);
    const targetWallets = refreshed.filter((w) => w.address.toLowerCase() === newAddr);
    await syncWallets(targetWallets, userId);
  }, [loadFromCache, syncWallets]);

  // ============================================================
  // ウォレット削除
  // ============================================================

  const handleDeleteAddress = useCallback(async (addr: string) => {
    setDeleteLoading(true);
    try {
      const targetIds = wallets
        .filter((w) => w.address.toLowerCase() === addr)
        .map((w) => w.id);

      await Promise.all(targetIds.map((id) => WalletService.deleteWatchedWallet(id)));

      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          await IndexedDBService.deleteTransactionsByAddress(userId, addr);
        } catch (err) {
          LoggingService.error('InboxController: IndexedDB トランザクション削除失敗', { err, addr });
        }
      }

      setTransactions((prev) => prev.filter((tx) => tx.watchedAddress?.toLowerCase() !== addr.toLowerCase()));

      const refreshed = await WalletService.getWatchedWallets();
      setWallets(refreshed);
      setDeleteConfirmAddress(null);

      const remaining = Array.from(new Set(refreshed.map((w) => w.address.toLowerCase())));
      if (remaining.length === 0) {
        setSelectedAddress(null);
        selectedAddressRef.current = null;
        LocalStorageService.setActiveWalletAddress(null);
        setTransactions([]);
        setTotalCount(0);
        setBadgeCounts({ unread: 0, flagged: 0, hidden: 0 });
      } else {
        const nextAddr = remaining[0];
        setSelectedAddress(nextAddr);
        selectedAddressRef.current = nextAddr;
        LocalStorageService.setActiveWalletAddress(nextAddr);
        const auth2 = getFirebaseAuth();
        const userId2 = auth2.currentUser?.uid;
        if (userId2) {
          await loadFromCache(userId2, refreshed, nextAddr);
          const targetWallets = refreshed.filter((w) => w.address.toLowerCase() === nextAddr);
          await syncWallets(targetWallets, userId2);
        }
      }
    } catch (err) {
      LoggingService.error('InboxController: ウォレット削除失敗', { err, addr });
      setError(err instanceof Error ? err.message : t('inbox.walletDeleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  }, [wallets, loadFromCache, syncWallets, t]);

  // ============================================================
  // ページネーション
  // ============================================================

  const handleLoadMore = useCallback(async () => {
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const nextPage = page + 1;
    setTxLoading(true);
    try {
      const addr = selectedAddressRef.current;
      const dir = directionFilterRef.current;
      const tabOpts = tabToQueryOptions(activeTabRef.current);
      const activeAddresses = [...new Set(walletsRef.current.map((w) => w.address.toLowerCase()))];
      const addrFilter = activeAddresses.length > 0 ? activeAddresses : undefined;
      const result = await TransactionService.getTransactionsFromCache(userId, addr
        ? { page: nextPage, pageSize: PAGE_SIZE, watchedAddress: addr, direction: dir, ...tabOpts }
        : { page: nextPage, pageSize: PAGE_SIZE, activeAddresses: addrFilter, direction: dir, ...tabOpts },
      );
      setTransactions((prev) => {
        const ids = new Set(prev.map((t) => t.userTransactionId));
        return [...prev, ...result.transactions.filter((t) => !ids.has(t.userTransactionId))];
      });
      setTotalCount(result.total);
      setPage(nextPage);
    } catch (err) {
      LoggingService.error('InboxController: さらに読み込み失敗', { err });
    } finally {
      setTxLoading(false);
    }
  }, [page]);

  // ============================================================
  // 行クリック → 既読 + 詳細表示
  // ============================================================

  const handleRowClick = useCallback(async (tx: TransactionView) => {
    setSelectedTx(tx);
    if (tx.state === 'unread') {
      try {
        const result = await TransactionService.updateUserTransaction(tx.userTransactionId, { state: 'read' });
        patchTransactionState(tx.userTransactionId, {
          state: 'read',
          syncRevision: result.syncRevision,
          updatedAt: result.updatedAt,
        });
        updateBadgeCounts({ unread: -1 });
      } catch (err) {
        LoggingService.error('InboxController: 既読更新失敗', { err, txId: tx.userTransactionId });
      }
    }
  }, [patchTransactionState, updateBadgeCounts]);

  // ============================================================
  // フラグ切り替え
  // ============================================================

  const handleToggleFlag = useCallback(async (e: React.MouseEvent, tx: TransactionView) => {
    e.stopPropagation();
    const nextFlagged = !tx.isFlagged;
    try {
      const result = await TransactionService.updateUserTransaction(tx.userTransactionId, { isFlagged: nextFlagged });
      patchTransactionState(tx.userTransactionId, {
        isFlagged: nextFlagged,
        syncRevision: result.syncRevision,
        updatedAt: result.updatedAt,
      });
      updateBadgeCounts({ flagged: nextFlagged ? 1 : -1 });
    } catch (err) {
      LoggingService.error('InboxController: フラグ切り替え失敗', { err, txId: tx.userTransactionId });
    }
  }, [patchTransactionState, updateBadgeCounts]);

  // ============================================================
  // 未読に戻す
  // ============================================================

  const handleMarkUnread = useCallback(async (e: React.MouseEvent, tx: TransactionView) => {
    e.stopPropagation();
    if (tx.state === 'unread') return;
    try {
      const result = await TransactionService.updateUserTransaction(tx.userTransactionId, { state: 'unread' });
      patchTransactionState(tx.userTransactionId, {
        state: 'unread',
        syncRevision: result.syncRevision,
        updatedAt: result.updatedAt,
      });
      updateBadgeCounts({ unread: 1 });
    } catch (err) {
      LoggingService.error('InboxController: 未読に戻す失敗', { err, txId: tx.userTransactionId });
    }
  }, [patchTransactionState, updateBadgeCounts]);

  // ============================================================
  // 非表示切り替え
  // ============================================================

  const handleToggleHidden = useCallback(async (e: React.MouseEvent, tx: TransactionView) => {
    e.stopPropagation();
    const nextHidden = !tx.isHidden;
    try {
      const result = await TransactionService.updateUserTransaction(tx.userTransactionId, { isHidden: nextHidden });
      patchTransactionState(tx.userTransactionId, {
        isHidden: nextHidden,
        syncRevision: result.syncRevision,
        updatedAt: result.updatedAt,
      });
      updateBadgeCounts({ hidden: nextHidden ? 1 : -1 });
    } catch (err) {
      LoggingService.error('InboxController: 非表示切り替え失敗', { err, txId: tx.userTransactionId });
    }
  }, [patchTransactionState, updateBadgeCounts]);

  // ============================================================
  // ラベル付与 / 解除
  // ============================================================

  const handleAssignLabel = useCallback(async (userTransactionId: number, labelId: number) => {
    const result = await LabelService.assignLabel(userTransactionId, labelId);
    setTransactions((prev) => prev.map((t) =>
      t.userTransactionId === userTransactionId
        ? { ...t, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
        : t,
    ));
    setSearchResults((prev) => prev
      ? prev.map((t) => t.userTransactionId === userTransactionId
        ? { ...t, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
        : t)
      : prev,
    );
    setSelectedTx((prev) => prev?.userTransactionId === userTransactionId
      ? { ...prev, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
      : prev);
  }, []);

  const handleRemoveLabelFromTx = useCallback(async (userTransactionId: number, labelId: number) => {
    const result = await LabelService.removeLabel(userTransactionId, labelId);
    setTransactions((prev) => prev.map((t) =>
      t.userTransactionId === userTransactionId
        ? { ...t, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
        : t,
    ));
    setSearchResults((prev) => prev
      ? prev.map((t) => t.userTransactionId === userTransactionId
        ? { ...t, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
        : t)
      : prev,
    );
    setSelectedTx((prev) => prev?.userTransactionId === userTransactionId
      ? { ...prev, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
      : prev);
  }, []);

  const handleCreateAndAssignLabel = useCallback(async (name: string, color: string, userTransactionId: number): Promise<TransactionLabel> => {
    const label = await LabelService.createLabel(name, color);
    setTxLabels((prev) => [...prev, label]);
    const result = await LabelService.assignLabel(userTransactionId, label.id);
    setTransactions((prev) => prev.map((t) =>
      t.userTransactionId === userTransactionId
        ? { ...t, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
        : t,
    ));
    setSearchResults((prev) => prev
      ? prev.map((t) => t.userTransactionId === userTransactionId
        ? { ...t, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
        : t)
      : prev,
    );
    setSelectedTx((prev) => prev?.userTransactionId === userTransactionId
      ? { ...prev, labelIds: result.labelIds, syncRevision: result.syncRevision, updatedAt: result.updatedAt }
      : prev);
    return label;
  }, []);

  // ============================================================
  // コピー
  // ============================================================

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => { setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 1500); })
      .catch((err) => LoggingService.error('InboxController: クリップボードコピー失敗', { err }));
  }, []);

  // ============================================================
  // プランアップグレード
  // ============================================================

  const handleUpgradePlan = async (planKey: 'light' | 'heavy') => {
    setPlanCheckoutLoading(true);
    try {
      await PlanService.startCheckout(planKey);
    } catch (err) {
      LoggingService.error('InboxController: handleUpgradePlan error', { err });
      alert(err instanceof Error ? err.message : t('inbox.checkoutFailed'));
    } finally {
      setPlanCheckoutLoading(false);
    }
  };

  // ============================================================
  // フィルタリング（クライアントサイド）
  // ============================================================

  const txLabelById = useMemo(() => {
    const map = new Map<number, TransactionLabel>();
    for (const label of txLabels) {
      map.set(label.id, label);
    }
    return map;
  }, [txLabels]);

  const baseTransactions = hasSearchFilter ? (searchResults ?? []) : transactions;

  const filtered = baseTransactions.filter((tx) => {
    if (selectedAddress && tx.watchedAddress.toLowerCase() !== selectedAddress) return false;
    if (tx.direction !== directionFilter) return false;
    if (activeTab === 'unread' && tx.state !== 'unread') return false;
    if (activeTab === 'flagged' && !tx.isFlagged) return false;
    if (activeTab === 'hidden' && !tx.isHidden) return false;
    if (selectedChainIds.size > 0 && !selectedChainIds.has(tx.chainId)) return false;
    if (selectedLabelIds.size > 0) {
      const txLabelIds = new Set(tx.labelIds ?? []);
      if (labelFilterMode === 'and') {
        for (const labelId of selectedLabelIds) {
          if (!txLabelIds.has(labelId)) return false;
        }
      } else {
        let hasAny = false;
        for (const labelId of selectedLabelIds) {
          if (txLabelIds.has(labelId)) { hasAny = true; break; }
        }
        if (!hasAny) return false;
      }
    }
    return true;
  });

  // ============================================================
  // CSV エクスポート（現在の検索・フィルタ条件適用済みの全件）
  // ============================================================

  const handleExportCsv = useCallback(async () => {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) return;

    const escape = (s: string) =>
      s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;

    const formatValue = (value: string, decimals: number): string => {
      if (decimals === 0) return value;
      try {
        const raw = BigInt(value);
        const divisor = BigInt(10) ** BigInt(decimals);
        const whole = raw / divisor;
        const remainder = raw % divisor;
        if (remainder === BigInt(0)) return whole.toString();
        const remainderStr = remainder.toString().padStart(decimals, '0');
        const truncated = remainderStr.slice(0, 6).replace(/0+$/, '');
        return truncated === '' ? whole.toString() : `${whole}.${truncated}`;
      } catch {
        const num = parseFloat(value) / Math.pow(10, decimals);
        return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
      }
    };

    const resolveAddr = (addr: string): string => {
      const lower = addr.toLowerCase();
      const contact = contacts.find((c) => c.address.toLowerCase() === lower);
      if (contact) return `${contact.label}<${addr}>`;
      const wallet = wallets.find((w) => w.address.toLowerCase() === lower);
      if (wallet?.label) return `${wallet.label}<${addr}>`;
      return addr;
    };

    // IndexedDB から全件取得（ページネーションを回避）
    const activeAddresses = selectedAddress
      ? [selectedAddress]
      : wallets.map((w) => w.address.toLowerCase());

    const allTxs = await IndexedDBService.searchTransactions(userId, {
      txHash: searchTxHash || undefined,
      fromAddress: searchFrom || undefined,
      toAddress: searchTo || undefined,
      asset: searchToken || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      activeAddresses: activeAddresses.length > 0 ? activeAddresses : undefined,
    });

    // 画面と同じフィルタを適用
    const exportRows = allTxs.filter((tx) => {
      if (activeTab === 'unread' && tx.state !== 'unread') return false;
      if (activeTab === 'flagged' && !tx.isFlagged) return false;
      if (activeTab === 'hidden' && !tx.isHidden) return false;
      if (selectedChainIds.size > 0 && !selectedChainIds.has(tx.chainId)) return false;
      if (tx.direction !== directionFilter) return false;
      if (selectedLabelIds.size > 0) {
        const txLabelIdSet = new Set(tx.labelIds ?? []);
        if (labelFilterMode === 'and') {
          for (const labelId of selectedLabelIds) {
            if (!txLabelIdSet.has(labelId)) return false;
          }
        } else {
          let hasAny = false;
          for (const labelId of selectedLabelIds) {
            if (txLabelIdSet.has(labelId)) { hasAny = true; break; }
          }
          if (!hasAny) return false;
        }
      }
      return true;
    });

    const header = [
      'datetime', 'direction', 'network', 'chain_id',
      'tx_hash', 'from', 'to', 'watched_address',
      'asset', 'amount', 'category',
      'state', 'is_flagged', 'is_hidden', 'labels',
      'block_number', 'contract_address', 'token_id',
    ].join(',');

    const rows = exportRows.map((tx) => {
      const datetime = new Date(tx.blockTimestamp).toLocaleString('sv-SE', {
        timeZone: selectedTimezone,
      }).replace('T', ' ');
      const network = CHAIN_CONFIG_MAP[tx.chainId]?.csvName ?? String(tx.chainId);
      const labelNames = (tx.labelIds ?? [])
        .map((id) => txLabelById.get(id)?.name ?? '')
        .filter(Boolean)
        .join(';');
      return [
        escape(datetime),
        tx.direction,
        escape(network),
        tx.chainId,
        tx.txHash,
        escape(resolveAddr(tx.fromAddress)),
        escape(resolveAddr(tx.toAddress)),
        tx.watchedAddress,
        tx.asset,
        formatValue(tx.value, tx.decimals),
        tx.category,
        tx.state,
        tx.isFlagged,
        tx.isHidden,
        escape(labelNames),
        tx.blockNumber,
        tx.contractAddress ?? '',
        tx.tokenId ?? '',
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inbox_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    contacts, wallets, selectedAddress, searchTxHash, searchFrom, searchTo,
    searchToken, dateFrom, dateTo, activeTab, selectedChainIds, directionFilter,
    selectedLabelIds, labelFilterMode, txLabelById, selectedTimezone,
  ]);

  const unreadCount = badgeCounts.unread;
  const flaggedCount = badgeCounts.flagged;
  const hiddenCount = badgeCounts.hidden;
  const availableChainIds = Array.from(new Set(
    wallets
      .filter((w) => (!selectedAddress || w.address.toLowerCase() === selectedAddress) && w.isActive)
      .map((w) => w.chainId)
  ));

  return {
    // State
    wallets,
    walletsLoading,
    transactions,
    totalCount,
    page,
    txLoading,
    isListLoading,
    initialSyncLoading,
    isInboxInitializing,
    isSyncing,
    planExpiredMessage,
    planCheckoutLoading,
    activeTab,
    selectedChainIds,
    directionFilter,
    chainFilterOpen,
    selectedTx,
    copyFeedback,
    error,
    contacts,
    selectedAddress,
    showAddModal,
    deleteConfirmAddress,
    deleteLoading,
    txLabels,
    selectedLabelIds,
    labelFilterMode,
    labelFilterOpen,
    labelPickerTxId,
    searchOpen,
    searchFrom,
    searchTo,
    searchToken,
    searchTxHash,
    dateFrom,
    dateTo,
    searchResults,
    searchLoading,
    selectedTimezone,
    // Setters（View で直接使用するもの）
    setActiveTab,
    setChainFilterOpen,
    setSelectedChainIds,
    setDirectionFilter,
    setLabelFilterOpen,
    setSelectedLabelIds,
    setLabelFilterMode,
    setLabelPickerTxId,
    setDeleteConfirmAddress,
    setShowAddModal,
    setSearchOpen,
    setSearchFrom,
    setSearchTo,
    setSearchToken,
    setSearchTxHash,
    setDateFrom,
    setDateTo,
    setSelectedTx,
    setSelectedAddress,
    // DOM Refs
    chainFilterRef,
    labelFilterRef,
    // Handlers
    handleManualSync,
    handleAddressSelect,
    handleWalletAdded,
    handleDeleteAddress,

    handleLoadMore,
    handleRowClick,
    handleToggleFlag,
    handleMarkUnread,
    handleToggleHidden,
    handleAssignLabel,
    handleRemoveLabelFromTx,
    handleCreateAndAssignLabel,
    handleCopy,
    handleUpgradePlan,
    handleTimezoneChange,
    handleExportCsv,
    clearSearch,
    // Computed
    uniqueAddresses,
    getAddressLabel,
    txLabelById,
    filtered,
    unreadCount,
    flaggedCount,
    hiddenCount,
    availableChainIds,
    hasSearchFilter,
  };
}
