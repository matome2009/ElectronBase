import { openDB, IDBPDatabase } from 'idb';
import { NormalizedTransaction, UserTransaction, TransactionView, TransactionState, WalletAddress, Contact, TransactionLabel } from '../../models/index';
import { LoggingService } from '../../services/LoggingService';

const DB_NAME = 'web3tx';
const DB_VERSION = 5;

/** idb スキーマ型定義 */
interface Web3TxDB {
  transactions: {
    key: number;
    value: NormalizedTransaction;
    indexes: {
      'by-chainId': number;
      'by-txHash':  string;
    };
  };
  user_transactions: {
    key: number;
    value: UserTransaction;
    indexes: {
      'by-userId':                string;
      'by-userId-transactionId':  [string, number];
      'by-userId-state':          [string, string];
      'by-userId-watchedAddress': [string, string];
    };
  };
  watched_wallets: {
    key: number;
    value: WalletAddress;
    indexes: {
      'by-userId':         string;
      'by-userId-chainId': [string, number];
    };
  };
  contacts: {
    key: number;
    value: Contact;
    indexes: {
      'by-userId': string;
    };
  };
  transaction_labels: {
    key: number;
    value: TransactionLabel;
    indexes: {
      'by-userId': string;
    };
  };
}

let dbInstance: IDBPDatabase<Web3TxDB> | null = null;

function normalizeUserTransaction(ut: UserTransaction): UserTransaction {
  return {
    ...ut,
    labelIds: ut.labelIds ?? [],
    syncRevision: Number(ut.syncRevision ?? 0),
    createdAt: ut.createdAt ?? '',
    updatedAt: ut.updatedAt ?? '',
  };
}

async function getDb(): Promise<IDBPDatabase<Web3TxDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<Web3TxDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('by-userId-chainId',        ['userId', 'chainId']);
        txStore.createIndex('by-userId-state',          ['userId', 'state']);
        txStore.createIndex('by-userId-blockTimestamp', ['userId', 'blockTimestamp']);
        txStore.createIndex('by-userId-watchedAddress', ['userId', 'watchedAddress']);

        const walletStore = db.createObjectStore('watched_wallets', { keyPath: 'id' });
        walletStore.createIndex('by-userId',         'userId');
        walletStore.createIndex('by-userId-chainId', ['userId', 'chainId']);
      }
      if (oldVersion < 2) {
        const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
        contactStore.createIndex('by-userId', 'userId');
      }
      if (oldVersion < 3) {
        const labelStore = db.createObjectStore('transaction_labels', { keyPath: 'id' });
        labelStore.createIndex('by-userId', 'userId');

        const assignmentStore = db.createObjectStore('transaction_label_assignments', { keyPath: 'id' });
        assignmentStore.createIndex('by-userId',               'userId');
        assignmentStore.createIndex('by-userId-transactionId', ['userId', 'transactionId']);
        assignmentStore.createIndex('by-userId-labelId',       ['userId', 'labelId']);
      }
      if (oldVersion < 4) {
        // 1. user_transactions ストアを作成
        const utStore = db.createObjectStore('user_transactions', { keyPath: 'id' });
        utStore.createIndex('by-userId',                'userId');
        utStore.createIndex('by-userId-transactionId',  ['userId', 'transactionId']);
        utStore.createIndex('by-userId-state',          ['userId', 'state']);
        utStore.createIndex('by-userId-watchedAddress', ['userId', 'watchedAddress']);

        // 2. transactions ストアの旧インデックスを削除し、新インデックスを作成
        const txStore = transaction.objectStore('transactions');
        for (const name of Array.from(txStore.indexNames)) {
          txStore.deleteIndex(name);
        }
        txStore.createIndex('by-chainId', 'chainId');
        txStore.createIndex('by-txHash',  'txHash');

        // 3. transaction_label_assignments のインデックスを更新
        if (db.objectStoreNames.contains('transaction_label_assignments')) {
          const assignStore = transaction.objectStore('transaction_label_assignments');
          if (assignStore.indexNames.contains('by-userId-transactionId')) {
            assignStore.deleteIndex('by-userId-transactionId');
          }
          assignStore.createIndex('by-userId-userTransactionId', ['userId', 'userTransactionId']);
        }
      }
      if (oldVersion < 5) {
        // transaction_label_assignments ストアを廃止（label_ids は user_transactions_t に移動）
        if (db.objectStoreNames.contains('transaction_label_assignments')) {
          db.deleteObjectStore('transaction_label_assignments');
        }
      }
    },
  });

  return dbInstance;
}

export class IndexedDBService {
  // ---- Transactions (on-chain facts) ----

  /**
   * オンチェーントランザクションを一括保存（upsert）。
   * 必ず TiDB への書き込み成功後に呼ぶこと。
   */
  static async saveTransactions(transactions: NormalizedTransaction[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('transactions', 'readwrite');
    try {
      await Promise.all(transactions.map((t) => tx.store.put(t)));
      await tx.done;
    } catch (error) {
      LoggingService.error('IndexedDBService.saveTransactions failed', { error, count: transactions.length });
      throw error;
    }
  }

  // ---- UserTransactions ----

  /**
   * ユーザー×トランザクション紐付けを一括保存（upsert）。
   * 必ず TiDB への書き込み成功後に呼ぶこと。
   */
  static async saveUserTransactions(userTransactions: UserTransaction[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('user_transactions', 'readwrite');
    try {
      await Promise.all(userTransactions.map((ut) => tx.store.put(normalizeUserTransaction(ut))));
      await tx.done;
    } catch (error) {
      LoggingService.error('IndexedDBService.saveUserTransactions failed', { error, count: userTransactions.length });
      throw error;
    }
  }

  static async getUserTransaction(userTransactionId: number): Promise<UserTransaction | null> {
    const db = await getDb();
    const userTransaction = await db.get('user_transactions', userTransactionId);
    return userTransaction ? normalizeUserTransaction(userTransaction) : null;
  }

  /**
   * 検索フィルタに一致する全トランザクションを IndexedDB 全件から返す。
   * 表示中のページに限らず全データを対象にする。
   */
  static async searchTransactions(
    userId: string,
    filters: {
      txHash?: string;
      fromAddress?: string;
      toAddress?: string;
      asset?: string;
      dateFrom?: string;
      dateTo?: string;
      activeAddresses?: string[];
    },
  ): Promise<TransactionView[]> {
    const db = await getDb();

    // tx_hash 完全一致の場合は index を使って高速検索
    if (filters.txHash && filters.txHash.length === 66) {
      const tx = await db.getFromIndex('transactions', 'by-txHash', filters.txHash.toLowerCase());
      if (!tx) return [];
      const userTxs = await db.getAllFromIndex(
        'user_transactions', 'by-userId', userId,
      );
      const views: TransactionView[] = [];
      for (const ut of userTxs) {
        if (ut.transactionId !== tx.id) continue;
        const normalizedUt = normalizeUserTransaction(ut);
        views.push({
          ...tx,
          userTransactionId: normalizedUt.id,
          userId: normalizedUt.userId,
          transactionId: normalizedUt.transactionId,
          watchedAddress: normalizedUt.watchedAddress,
          direction: normalizedUt.direction,
          state: normalizedUt.state,
          isFlagged: normalizedUt.isFlagged,
          isHidden: normalizedUt.isHidden,
          labelIds: normalizedUt.labelIds,
          syncRevision: normalizedUt.syncRevision,
          createdAt: normalizedUt.createdAt,
          updatedAt: normalizedUt.updatedAt,
        });
      }
      return views;
    }

    // それ以外は全件スキャン
    const userTxs = await db.getAllFromIndex('user_transactions', 'by-userId', userId);

    const addrSet = filters.activeAddresses
      ? new Set(filters.activeAddresses.map((a) => a.toLowerCase()))
      : null;

    const dateFromMs = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const dateToMs = filters.dateTo
      ? (() => { const d = new Date(filters.dateTo); d.setHours(23, 59, 59, 999); return d.getTime(); })()
      : null;

    const views: TransactionView[] = [];
    for (const ut of userTxs) {
      const normalizedUt = normalizeUserTransaction(ut);
      if (addrSet && !addrSet.has(normalizedUt.watchedAddress.toLowerCase())) continue;
      const normalizedTx = await db.get('transactions', normalizedUt.transactionId);
      if (!normalizedTx) continue;

      if (filters.txHash && !normalizedTx.txHash.toLowerCase().includes(filters.txHash.toLowerCase())) continue;
      if (filters.fromAddress && !normalizedTx.fromAddress.toLowerCase().includes(filters.fromAddress.toLowerCase())) continue;
      if (filters.toAddress && !normalizedTx.toAddress.toLowerCase().includes(filters.toAddress.toLowerCase())) continue;
      if (filters.asset && !normalizedTx.asset.toLowerCase().includes(filters.asset.toLowerCase())) continue;
      if (dateFromMs && new Date(normalizedTx.blockTimestamp).getTime() < dateFromMs) continue;
      if (dateToMs && new Date(normalizedTx.blockTimestamp).getTime() > dateToMs) continue;

      views.push({
        ...normalizedTx,
        userTransactionId: normalizedUt.id,
        userId: normalizedUt.userId,
        transactionId: normalizedUt.transactionId,
        watchedAddress: normalizedUt.watchedAddress,
        direction: normalizedUt.direction,
        state: normalizedUt.state,
        isFlagged: normalizedUt.isFlagged,
        isHidden: normalizedUt.isHidden,
        labelIds: normalizedUt.labelIds,
        syncRevision: normalizedUt.syncRevision,
        createdAt: normalizedUt.createdAt,
        updatedAt: normalizedUt.updatedAt,
      });
    }

    views.sort((a, b) => new Date(b.blockTimestamp).getTime() - new Date(a.blockTimestamp).getTime() || b.id - a.id);
    return views;
  }

  /**
   * IndexedDB 内のこのユーザー+アドレス+チェーンの最大ブロック番号を返す。
   * レコードがなければ 0 を返す。
   */
  static async getMaxBlockNumber(userId: string, chainId: number, watchedAddress: string): Promise<number> {
    const db = await getDb();
    const userTxs = await db.getAllFromIndex(
      'user_transactions',
      'by-userId-watchedAddress',
      IDBKeyRange.only([userId, watchedAddress.toLowerCase()]),
    );
    if (userTxs.length === 0) return 0;
    let max = 0;
    for (const ut of userTxs) {
      const tx = await db.get('transactions', ut.transactionId);
      if (tx && tx.chainId === chainId && tx.blockNumber > max) {
        max = tx.blockNumber;
      }
    }
    return max;
  }

  /**
   * ユーザーのトランザクション一覧を取得（ページネーション付き）。
   * user_transactions → transactions を結合して TransactionView を返す。
   */
  /**
   * タブバッジ用カウント。user_transactions のみスキャン（join なし）で高速。
   */
  static async countUserTransactions(
    userId: string,
    activeAddresses?: string[],
  ): Promise<{ unread: number; flagged: number; hidden: number }> {
    const db = await getDb();
    const userTxs = await db.getAllFromIndex('user_transactions', 'by-userId', userId);
    const addrSet = activeAddresses
      ? new Set(activeAddresses.map((a) => a.toLowerCase()))
      : null;

    let unread = 0;
    let flagged = 0;
    let hidden = 0;
    for (const ut of userTxs) {
      if (addrSet && !addrSet.has(ut.watchedAddress.toLowerCase())) continue;
      if (ut.state === 'unread') unread++;
      if (ut.isFlagged) flagged++;
      if (ut.isHidden) hidden++;
    }
    return { unread, flagged, hidden };
  }

  static async getTransactions(
    userId: string,
    options: {
      page: number;
      pageSize: number;
      chainId?: number;
      state?: string;
      isFlagged?: boolean;
      isHidden?: boolean;
      watchedAddress?: string;
      activeAddresses?: string[];
      direction?: 'in' | 'out';
    },
  ): Promise<{ transactions: TransactionView[]; total: number }> {
    const db = await getDb();

    // 1. user_transactions ストアからフィルタリング
    let userTxs: UserTransaction[];
    if (options.state) {
      userTxs = await db.getAllFromIndex(
        'user_transactions',
        'by-userId-state',
        IDBKeyRange.only([userId, options.state]),
      );
    } else if (options.watchedAddress) {
      userTxs = await db.getAllFromIndex(
        'user_transactions',
        'by-userId-watchedAddress',
        IDBKeyRange.only([userId, options.watchedAddress.toLowerCase()]),
      );
    } else {
      userTxs = await db.getAllFromIndex(
        'user_transactions',
        'by-userId',
        userId,
      );
    }

    // Additional in-memory filters
    if (options.state && options.watchedAddress) {
      const addrLower = options.watchedAddress.toLowerCase();
      userTxs = userTxs.filter((ut) => ut.watchedAddress.toLowerCase() === addrLower);
    }
    if (!options.state && !options.watchedAddress && options.watchedAddress === undefined) {
      // already fetched all by userId
    }
    if (options.activeAddresses) {
      const set = new Set(options.activeAddresses.map((a) => a.toLowerCase()));
      userTxs = userTxs.filter((ut) => set.has(ut.watchedAddress.toLowerCase()));
    }
    if (options.direction) {
      userTxs = userTxs.filter((ut) => ut.direction === options.direction);
    }
    if (options.state) {
      userTxs = userTxs.filter((ut) => ut.state === options.state);
    }
    if (options.isFlagged !== undefined) {
      userTxs = userTxs.filter((ut) => ut.isFlagged === options.isFlagged);
    }
    if (options.isHidden !== undefined) {
      userTxs = userTxs.filter((ut) => ut.isHidden === options.isHidden);
    }

    // 2. transactionId で transactions ストアから取得し TransactionView に結合
    const views: TransactionView[] = [];
    for (const ut of userTxs) {
      const normalizedUt = normalizeUserTransaction(ut);
      const normalizedTx = await db.get('transactions', ut.transactionId);
      if (!normalizedTx) {
        LoggingService.warn('IndexedDBService.getTransactions: orphaned user_transaction, skipping', {
          userTransactionId: normalizedUt.id,
          transactionId: normalizedUt.transactionId,
        });
        continue;
      }

      // chainId filter (applied after join since chainId is on transactions)
      if (options.chainId !== undefined && normalizedTx.chainId !== options.chainId) {
        continue;
      }

      views.push({
        ...normalizedTx,
        userTransactionId: normalizedUt.id,
        userId: normalizedUt.userId,
        transactionId: normalizedUt.transactionId,
        watchedAddress: normalizedUt.watchedAddress,
        direction: normalizedUt.direction,
        state: normalizedUt.state,
        isFlagged: normalizedUt.isFlagged,
        isHidden: normalizedUt.isHidden,
        labelIds: normalizedUt.labelIds,
        syncRevision: normalizedUt.syncRevision,
        createdAt: normalizedUt.createdAt,
        updatedAt: normalizedUt.updatedAt,
      });
    }

    // 3. blockTimestamp 降順ソート
    views.sort((a, b) => {
      const tA = new Date(a.blockTimestamp).getTime();
      const tB = new Date(b.blockTimestamp).getTime();
      return tB - tA || b.userTransactionId - a.userTransactionId;
    });

    // ページネーション適用
    const total = views.length;
    const start = (options.page - 1) * options.pageSize;
    return { transactions: views.slice(start, start + options.pageSize), total };
  }

  /**
   * 指定アドレスのトランザクション履歴からユニーク ERC20 トークンを返す。
   * user_transactions → transactions を結合して検索する。
   */
  static async getUniqueErc20Tokens(
    userId: string,
    watchedAddress: string,
  ): Promise<{ chainId: number; asset: string; contractAddress: string; decimals: number }[]> {
    const db = await getDb();
    const userTxs = await db.getAllFromIndex(
      'user_transactions',
      'by-userId-watchedAddress',
      IDBKeyRange.only([userId, watchedAddress.toLowerCase()]),
    );

    const seen = new Map<string, { chainId: number; asset: string; contractAddress: string; decimals: number }>();
    for (const ut of userTxs) {
      const tx = await db.get('transactions', ut.transactionId);
      if (!tx) continue;
      if (tx.category !== 'erc20' || !tx.contractAddress) continue;
      const key = `${tx.chainId}:${tx.contractAddress.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, {
          chainId: tx.chainId,
          asset: tx.asset,
          contractAddress: tx.contractAddress,
          decimals: tx.decimals,
        });
      }
    }
    return Array.from(seen.values());
  }

  /**
   * 単一 UserTransaction を部分更新。
   * 必ず TiDB への書き込み成功後に呼ぶこと。
   */
  static async updateUserTransaction(
    userTransactionId: number,
    update: {
      state?: TransactionState;
      isFlagged?: boolean;
      isHidden?: boolean;
      labelIds?: number[];
      syncRevision?: number;
      createdAt?: string;
      updatedAt?: string;
    },
  ): Promise<void> {
    const db = await getDb();
    const existing = await db.get('user_transactions', userTransactionId);
    if (!existing) {
      LoggingService.warn('IndexedDBService.updateUserTransaction: id not found in IndexedDB', { userTransactionId });
      return;
    }
    await db.put('user_transactions', normalizeUserTransaction({ ...existing, ...update }));
  }

  /**
   * 指定アドレスのトランザクションを IndexedDB から全削除（両ストア対応）。
   * WalletService.deleteWatchedWallet 成功後に呼ぶこと。
   */
  static async deleteTransactionsByAddress(userId: string, address: string): Promise<void> {
    const db = await getDb();
    const addrLower = address.toLowerCase();

    // 1. user_transactions ストアから該当レコードを削除し、transactionId を収集
    const transactionIdsToDelete = new Set<number>();
    const utTx = db.transaction('user_transactions', 'readwrite');
    let utCursor = await utTx.store.openCursor();
    while (utCursor) {
      if (
        utCursor.value.userId === userId &&
        utCursor.value.watchedAddress.toLowerCase() === addrLower
      ) {
        transactionIdsToDelete.add(utCursor.value.transactionId);
        await utCursor.delete();
      }
      utCursor = await utCursor.continue();
    }
    await utTx.done;

    // 2. transactions ストアから関連レコードを削除
    if (transactionIdsToDelete.size > 0) {
      const txTx = db.transaction('transactions', 'readwrite');
      for (const txId of transactionIdsToDelete) {
        await txTx.store.delete(txId);
      }
      await txTx.done;
    }
  }

  // ---- WatchedWallets ----

  static async deleteWatchedWallet(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('watched_wallets', id);
  }

  /**
   * 監視ウォレットを一括保存（upsert）。
   * 必ず TiDB への書き込み成功後に呼ぶこと。
   */
  static async saveWatchedWallets(wallets: WalletAddress[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('watched_wallets', 'readwrite');
    try {
      await Promise.all(wallets.map((w) => tx.store.put(w)));
      await tx.done;
    } catch (error) {
      LoggingService.error('IndexedDBService.saveWatchedWallets failed', { error });
      throw error;
    }
  }

  static async getWatchedWallets(userId: string): Promise<WalletAddress[]> {
    const db = await getDb();
    return db.getAllFromIndex('watched_wallets', 'by-userId', userId);
  }

  // ---- Contacts ----

  static async saveContacts(contacts: Contact[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('contacts', 'readwrite');
    try {
      await Promise.all(contacts.map((c) => tx.store.put(c)));
      await tx.done;
    } catch (error) {
      LoggingService.error('IndexedDBService.saveContacts failed', { error });
      throw error;
    }
  }

  static async getContacts(userId: string): Promise<Contact[]> {
    const db = await getDb();
    return db.getAllFromIndex('contacts', 'by-userId', userId);
  }

  static async deleteContact(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('contacts', id);
  }

  // ---- TransactionLabels ----

  /**
   * ラベル一覧をユーザー単位でまるごと置換（サーバーからの全件取得時に使用）。
   * 必ず TiDB からの取得後に呼ぶこと。
   */
  static async replaceTransactionLabels(userId: string, labels: TransactionLabel[]): Promise<void> {
    const db = await getDb();
    const existing = await db.getAllFromIndex('transaction_labels', 'by-userId', userId);
    const tx = db.transaction('transaction_labels', 'readwrite');
    try {
      await Promise.all(existing.map((l) => tx.store.delete(l.id)));
      await Promise.all(labels.map((l) => tx.store.put(l)));
      await tx.done;
    } catch (error) {
      LoggingService.error('IndexedDBService.replaceTransactionLabels failed', { error });
      throw error;
    }
  }

  static async getTransactionLabels(userId: string): Promise<TransactionLabel[]> {
    const db = await getDb();
    return db.getAllFromIndex('transaction_labels', 'by-userId', userId);
  }

  /** ラベルを1件追加/更新（upsert）。必ず TiDB への書き込み成功後に呼ぶこと。 */
  static async saveTransactionLabel(label: TransactionLabel): Promise<void> {
    const db = await getDb();
    await db.put('transaction_labels', label);
  }

  static async deleteTransactionLabel(id: number): Promise<void> {
    const db = await getDb();
    await db.delete('transaction_labels', id);
  }

  /**
   * ラベルが削除されたとき、全 user_transactions の labelIds からそのラベルIDを除去する。
   * 必ず TiDB への削除成功後に呼ぶこと。
   */
  static async removeLabelFromAllUserTransactions(userId: string, labelId: number): Promise<void> {
    const db = await getDb();
    const userTxs = await db.getAllFromIndex('user_transactions', 'by-userId', userId);
    for (const ut of userTxs) {
      if (!ut.labelIds?.includes(labelId)) continue;
      const newLabelIds = ut.labelIds.filter((id: number) => id !== labelId);
      await db.put('user_transactions', { ...ut, labelIds: newLabelIds });
    }
  }

  /** 全ストアのデータを削除する（キャッシュクリア用）。TiDB から再同期される。 */
  static async clearAll(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(
      ['transactions', 'user_transactions', 'watched_wallets', 'contacts', 'transaction_labels'],
      'readwrite',
    );
    try {
      await Promise.all([
        tx.objectStore('transactions').clear(),
        tx.objectStore('user_transactions').clear(),
        tx.objectStore('watched_wallets').clear(),
        tx.objectStore('contacts').clear(),
        tx.objectStore('transaction_labels').clear(),
      ]);
      await tx.done;
    } catch (error) {
      LoggingService.error('IndexedDBService.clearAll failed', { error });
      throw error;
    }
  }
}
