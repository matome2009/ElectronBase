import { getFirebaseAuth, getApiUrl } from '../../services/FirebaseService';
import { IndexedDBService } from './IndexedDBService';
import { LoggingService } from '../../services/LoggingService';
import { TransactionService } from './TransactionService';
import { WalletAddress, ChainId } from '../../models/index';

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('認証されていません。ログインしてください。');
  return token;
}

class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
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
    throw new ApiError(response.status, `API ${apiName} failed: ${response.status} ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

export class WalletService {
  /**
   * ウォレットアドレスを指定チェーンで登録し、バックグラウンドで同期を開始する。
   *
   * 書き込み順序: TiDB → IndexedDB
   * 同期はバックグラウンド実行（UI をブロックしない）
   */
  static async addWatchedWallet(
    address: string,
    chainIds: ChainId[],
    label?: string,
  ): Promise<WalletAddress[]> {
    LoggingService.info('WalletService.addWatchedWallet', { address, chainIds });

    // 1. TiDB に登録（Cloud Function 経由）
    const result = await callApi<{ success: boolean; wallets: WalletAddress[] }>(
      'addWatchedWallet',
      { address, chainIds, label },
    );

    // 2. TiDB 成功後に IndexedDB にミラー
    try {
      await IndexedDBService.saveWatchedWallets(result.wallets);
    } catch (error) {
      LoggingService.error('IndexedDB saveWatchedWallets failed', { error });
      // 次回同期で回復するためエラーは上位に伝えない
    }

    // 3. 各チェーンのフル同期をバックグラウンドで開始（await しない）
    const normalizedAddress = address.toLowerCase();
    for (const chainId of chainIds) {
      TransactionService.syncAndGetTransactions(chainId, normalizedAddress, { page: 1, pageSize: 50 })
        .then((r) => LoggingService.info('background sync complete', { chainId, address, total: r.total }))
        .catch((err) => LoggingService.error('background sync failed', { chainId, address, err }));
    }

    return result.wallets;
  }

  /**
   * 登録済みウォレット一覧を取得する。
   * IndexedDB キャッシュを優先し、なければ TiDB から取得してキャッシュに保存する。
   */
  static async getWatchedWallets(): Promise<WalletAddress[]> {
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('認証されていません');

    // IndexedDB から先に読む（高速表示）
    const cached = await IndexedDBService.getWatchedWallets(userId);
    if (cached.length > 0) {
      // バックグラウンドで TiDB と同期（最新状態に更新）
      this.refreshWatchedWalletsCache(userId).catch((err) =>
        LoggingService.error('refreshWatchedWalletsCache failed', { err }),
      );
      return cached;
    }

    // キャッシュ未取得 → TiDB から取得
    return this.refreshWatchedWalletsCache(userId);
  }

  /** TiDB から最新の登録ウォレットを取得して IndexedDB を更新する */
  private static async refreshWatchedWalletsCache(_userId: string): Promise<WalletAddress[]> {
    const result = await callApi<{ wallets: WalletAddress[] }>('getWatchedWallets', {});

    try {
      await IndexedDBService.saveWatchedWallets(result.wallets);
    } catch (error) {
      LoggingService.error('IndexedDB saveWatchedWallets failed', { error });
    }

    return result.wallets;
  }

  /**
   * ウォレットの同期ON/OFFを切り替える。
   *
   * OFF→ON: カーソルが残っていれば続きから同期、なければ初回同期
   * ON→OFF: 次回以降の同期をスキップ（データは保持）
   *
   * 書き込み順序: TiDB → IndexedDB
   */
  static async toggleWatchedWallet(id: number, isActive: boolean): Promise<void> {
    LoggingService.info('WalletService.toggleWatchedWallet', { id, isActive });

    await callApi<{ success: boolean }>('toggleWatchedWallet', { id, isActive });

    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cached = await IndexedDBService.getWatchedWallets(userId);
        const updated = cached.map((w) => w.id === id ? { ...w, isActive } : w);
        await IndexedDBService.saveWatchedWallets(updated);
      }
    } catch (error) {
      LoggingService.error('IndexedDB toggleWatchedWallet failed', { error, id });
    }
  }

  /**
   * ウォレットのラベルを更新する（同一アドレスの全チェーン行に反映）。
   *
   * 書き込み順序: TiDB → IndexedDB
   */
  static async updateWalletLabel(address: string, label: string | null): Promise<void> {
    LoggingService.info('WalletService.updateWalletLabel', { address, label });

    await callApi<{ success: boolean }>('updateWalletLabel', { address, label });

    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cached = await IndexedDBService.getWatchedWallets(userId);
        const updated = cached.map((w) =>
          w.address.toLowerCase() === address.toLowerCase() ? { ...w, label } : w
        );
        await IndexedDBService.saveWatchedWallets(updated);
      }
    } catch (error) {
      LoggingService.error('IndexedDB updateWalletLabel failed', { error, address });
    }
  }

  /**
   * ウォレットを削除する（ソフトデリート）。
   *
   * 書き込み順序: TiDB → IndexedDB
   */
  static async deleteWatchedWallet(id: number): Promise<void> {
    LoggingService.info('WalletService.deleteWatchedWallet', { id });

    // 1. TiDB から削除（404 = すでに存在しない = IndexedDB の孤立レコードなので続行）
    try {
      await callApi<{ success: boolean }>('deleteWatchedWallet', { id });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
      LoggingService.warn('WalletService.deleteWatchedWallet: TiDB に存在しないためIndexedDBのみ削除', { id });
    }

    // 2. IndexedDB の watched_wallets ストアから削除
    try {
      await IndexedDBService.deleteWatchedWallet(id);
    } catch (error) {
      LoggingService.error('IndexedDB deleteWatchedWallet failed', { error, id });
    }
  }
}
