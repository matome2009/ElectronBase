import { getFirebaseAuth, getApiUrl } from '../../services/FirebaseService';
import { IndexedDBService } from './IndexedDBService';
import { LocalStorageService, UserTransactionSyncCursor } from '../../services/LocalStorageService';
import { LoggingService } from '../../services/LoggingService';
import {
  NormalizedTransaction,
  UserTransaction,
  TransactionView,
  TransactionState,
  GetTransactionsResponse,
  GetUserTransactionDeltasResponse,
  SyncTransactionsRequest,
  UpdateUserTransactionRequest,
  ChainId,
} from '../../models/index';

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('認証されていません。ログインしてください。');
  return token;
}

export class PlanExpiredError extends Error {
  readonly planKey: string;
  readonly limitMessage: string;
  constructor(message: string, planKey: string, limitMessage: string) {
    super(message);
    this.name = 'PlanExpiredError';
    this.planKey = planKey;
    this.limitMessage = limitMessage;
  }
}

async function callApi<T>(apiName: string, body: unknown): Promise<T> {
  const idToken = await getIdToken();
  const url = getApiUrl(apiName);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // プラン期限切れエラーは専用クラスでスロー
    try {
      const parsed = JSON.parse(errorBody) as { error?: string; message?: string; planKey?: string };
      if (parsed.error === 'PLAN_EXPIRED') {
        throw new PlanExpiredError(
          parsed.message ?? 'プランの有効期限が切れています',
          parsed.planKey ?? 'free',
          parsed.message ?? '',
        );
      }
    } catch (e) {
      if (e instanceof PlanExpiredError) throw e;
    }
    throw new Error(`API ${apiName} failed: ${response.status} ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

/**
 * TransactionView を NormalizedTransaction と UserTransaction に分離する。
 * Cloud Functions から受信した結合データをローカルキャッシュ用に分割する際に使用。
 */
export function splitTransactionView(view: TransactionView): {
  transaction: NormalizedTransaction;
  userTransaction: UserTransaction;
} {
  const {
    userTransactionId,
    userId,
    transactionId,
    watchedAddress,
    direction,
    state,
    isFlagged,
    isHidden,
    labelIds,
    syncRevision,
    createdAt,
    updatedAt,
    ...txFields
  } = view;

  return {
    transaction: txFields as NormalizedTransaction,
    userTransaction: {
      id: userTransactionId,
      userId,
      transactionId,
      watchedAddress,
      direction,
      state,
      isFlagged,
      isHidden,
      labelIds: labelIds ?? [],
      syncRevision,
      createdAt,
      updatedAt,
    },
  };
}

function compareSyncCursor(a: UserTransactionSyncCursor, b: UserTransactionSyncCursor): number {
  const timeDiff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.lastSeenUserTransactionId - b.lastSeenUserTransactionId;
}

export class TransactionService {
  private static async persistTransactionViews(userId: string, views: TransactionView[]): Promise<void> {
    const separated = views.map(splitTransactionView);
    await IndexedDBService.saveTransactions(separated.map((s) => s.transaction));
    await IndexedDBService.saveUserTransactions(separated.map((s) => s.userTransaction));
    this.advanceSyncCursor(userId, views);
  }

  private static advanceSyncCursor(userId: string, views: Array<Pick<TransactionView, 'updatedAt' | 'userTransactionId'>>): void {
    if (views.length === 0) return;
    const latest = views.reduce<UserTransactionSyncCursor>((maxCursor, view) => {
      const nextCursor = {
        updatedAt: view.updatedAt,
        lastSeenUserTransactionId: view.userTransactionId,
      };
      return compareSyncCursor(nextCursor, maxCursor) > 0 ? nextCursor : maxCursor;
    }, {
      updatedAt: views[0].updatedAt,
      lastSeenUserTransactionId: views[0].userTransactionId,
    });

    const current = LocalStorageService.getUserTransactionSyncCursor(userId);
    if (!current || compareSyncCursor(latest, current) > 0) {
      LocalStorageService.setUserTransactionSyncCursor(userId, latest);
    }
  }

  /**
   * 1. Alchemy → TiDB 同期（Cloud Function 経由）
   * 2. inserted > 0 の場合のみ TiDB から再取得して IndexedDB を更新
   * 3. inserted === 0 の場合は IndexedDB キャッシュをそのまま返す
   *
   * 同期失敗時はキャッシュから返す（オフライン対応）。
   */
  static async syncAndGetTransactions(
    chainId: ChainId,
    address: string,
    options: { page?: number; pageSize?: number } = {},
    onBatchComplete?: () => void,
  ): Promise<GetTransactionsResponse> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 50;

    LoggingService.info('TransactionService.syncAndGetTransactions', { chainId, address, page });

    // Step 1: Alchemy → TiDB 同期（Cloud Function 経由）
    // hasMore === true の間ループして全件取得する
    // 1バッチごとに TiDB 再取得 → IndexedDB 更新して UI に反映する
    // ただし PLAN_EXPIRED は上位に伝える（ユーザーへの通知が必要なため）
    let inserted = 0;
    const syncBody: SyncTransactionsRequest = { chainId, address };
    let hasMore = true;
    while (hasMore) {
      let batchInserted = 0;
      try {
        const syncResult = await callApi<{ success: boolean; inserted: number; hasMore: boolean; skippedReason?: string | null; tidbMaxBlock?: number | null }>('syncTransactions', syncBody);
        batchInserted = syncResult.inserted;
        inserted += batchInserted;
        hasMore = syncResult.hasMore;
        if (syncResult.skippedReason === 'no_new_blocks') {
          LoggingService.info('syncTransactions skipped — no new logs for address', {
            tidbMaxBlock: syncResult.tidbMaxBlock,
          });
        } else if (syncResult.skippedReason === 'no_new_transfers') {
          LoggingService.info('syncTransactions — no new transfers', {
            tidbMaxBlock: syncResult.tidbMaxBlock,
          });
        } else {
          LoggingService.info('syncTransactions complete', { inserted: batchInserted, hasMore });
        }
      } catch (error) {
        if (error instanceof PlanExpiredError) throw error;
        LoggingService.error('syncTransactions failed — falling back to IndexedDB cache', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // TiDB から差分を全ページ取得して IndexedDB に保存する
      // IndexedDB の最大ブロック番号より新しいものだけ取得（差分のみ）
      // キャッシュクリア後など IndexedDB が空の場合も必ず実行する
      try {
        const uid = getFirebaseAuth().currentUser?.uid;
        if (!uid) throw new Error('認証されていません。ログインしてください。');
        const TIDB_BATCH_SIZE = 200;
        const indexedDBMaxBlock = await IndexedDBService.getMaxBlockNumber(uid, chainId, address);

        // 新規取得もなく IndexedDB も空でない場合はスキップ
        if (batchInserted === 0 && indexedDBMaxBlock > 0) continue;
        let tidbPage = 1;
        let lastResult: GetTransactionsResponse | null = null;

        while (true) {
          const tidbResult = await callApi<GetTransactionsResponse>('getTransactions', {
            page: tidbPage,
            pageSize: TIDB_BATCH_SIZE,
            chainId,
            watchedAddress: address,
            fromBlock: indexedDBMaxBlock,
          });

          if (tidbResult.transactions.length === 0) break;

          // 旧スキーマレスポンス検出
          if (!('userTransactionId' in tidbResult.transactions[0])) {
            LoggingService.error('syncAndGetTransactions: old schema response detected (missing userTransactionId), falling back to cache');
            const cached = await IndexedDBService.getTransactions(uid, { page: 1, pageSize, chainId, watchedAddress: address });
            return { transactions: cached.transactions, total: cached.total, page: 1, pageSize };
          }

          try {
            await this.persistTransactionViews(uid, tidbResult.transactions);
          } catch (err) {
            LoggingService.error('IndexedDB save failed', { err });
          }

          lastResult = tidbResult;
          // 1ページ目取得後に UI を即時更新
          if (tidbPage === 1) onBatchComplete?.();

          if (tidbResult.transactions.length < TIDB_BATCH_SIZE) break;
          tidbPage++;
        }

        if (!hasMore && lastResult) return lastResult;
        if (hasMore) continue;
      } catch (error) {
        LoggingService.error('getTransactions from TiDB failed', { error });
      }
    }

    // inserted === 0（新規データなし）は IndexedDB キャッシュをそのまま返す
    if (inserted === 0) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) throw new Error('認証されていません。ログインしてください。');
      const cached = await IndexedDBService.getTransactions(uid, { page: 1, pageSize, chainId, watchedAddress: address });
      return { transactions: cached.transactions, total: cached.total, page: 1, pageSize };
    }

    // 全バッチ完了後の最終取得（上のループで return されなかった場合）
    let tidbResult: GetTransactionsResponse;
    try {
      tidbResult = await callApi<GetTransactionsResponse>('getTransactions', {
        page,
        pageSize,
        chainId,
        watchedAddress: address,
      });
    } catch (error) {
      LoggingService.error('getTransactions from TiDB failed — using IndexedDB cache', { error });
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) throw error;
      const cached = await IndexedDBService.getTransactions(uid, { page: 1, pageSize, chainId, watchedAddress: address });
      return { transactions: cached.transactions, total: cached.total, page: 1, pageSize };
    }

    try {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (uid) {
        await this.persistTransactionViews(uid, tidbResult.transactions);
      }
    } catch (error) {
      LoggingService.error('IndexedDB save failed', { error });
    }

    return tidbResult;
  }

  /**
   * トランザクションのユーザー固有状態を更新する。
   * state（既読/未読）・isFlagged（★）・isHidden（非表示）は独立して更新可能。
   * 書き込み順序: TiDB 先 → IndexedDB 後
   */
  static async updateUserTransaction(
    userTransactionId: number,
    update: { state?: TransactionState; isFlagged?: boolean; isHidden?: boolean },
  ): Promise<{ syncRevision: number; updatedAt: string }> {
    LoggingService.info('TransactionService.updateUserTransaction', { userTransactionId, ...update });

    // 1. TiDB に書き込む（Cloud Function 経由）
    const body: UpdateUserTransactionRequest = { userTransactionId, ...update };
    const result = await callApi<{ success: boolean; syncRevision: number; updatedAt: string }>('updateTransactionState', body);

    // 2. TiDB 成功後に IndexedDB を更新
    try {
      const userId = getFirebaseAuth().currentUser?.uid;
      await IndexedDBService.updateUserTransaction(userTransactionId, {
        ...update,
        syncRevision: result.syncRevision,
        updatedAt: result.updatedAt,
      });
      if (userId) {
        this.advanceSyncCursor(userId, [{
          updatedAt: result.updatedAt,
          userTransactionId,
        }]);
      }
    } catch (error) {
      // リモートは成功済みなので次回同期で回復する — エラーは上位に伝えない
      LoggingService.error('IndexedDB updateUserTransaction failed', { error, userTransactionId });
    }
    return {
      syncRevision: result.syncRevision,
      updatedAt: result.updatedAt,
    };
  }

  static async syncUserTransactionDeltas(
    userId: string,
    onBatchComplete?: () => void,
  ): Promise<void> {
    const DELTA_BATCH_SIZE = 200;
    let cursor = LocalStorageService.getUserTransactionSyncCursor(userId);
    let hasMore = true;
    let firstApplied = false;

    while (hasMore) {
      const result = await callApi<GetUserTransactionDeltasResponse>('getUserTransactionDeltas', {
        updatedAfter: cursor?.updatedAt,
        lastSeenUserTransactionId: cursor?.lastSeenUserTransactionId ?? 0,
        limit: DELTA_BATCH_SIZE,
      });

      if (result.transactions.length > 0) {
        await this.persistTransactionViews(userId, result.transactions);
        if (!firstApplied) {
          onBatchComplete?.();
          firstApplied = true;
        }
      }

      if (result.nextCursor) {
        LocalStorageService.setUserTransactionSyncCursor(userId, result.nextCursor);
        cursor = result.nextCursor;
      }
      hasMore = result.hasMore;
      if (!hasMore) break;
    }
  }

  /**
   * IndexedDB キャッシュのみから読む（オフライン表示・ページ初期描画の高速化用）。
   */
  static async getTransactionsFromCache(
    userId: string,
    options: {
      page: number;
      pageSize: number;
      chainId?: ChainId;
      state?: string;
      isFlagged?: boolean;
      isHidden?: boolean;
      watchedAddress?: string;
      activeAddresses?: string[];
      direction?: 'in' | 'out';
    },
  ): Promise<GetTransactionsResponse> {
    const result = await IndexedDBService.getTransactions(userId, options);
    return {
      transactions: result.transactions,
      total: result.total,
      page: options.page,
      pageSize: options.pageSize,
    };
  }
}
