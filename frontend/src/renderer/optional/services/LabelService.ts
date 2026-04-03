import { getFirebaseAuth, getApiUrl } from '../../services/FirebaseService';
import { IndexedDBService } from './IndexedDBService';
import { LoggingService } from '../../services/LoggingService';
import { TransactionLabel } from '../../models/index';

class LabelConflictError extends Error {
  readonly latestLabelIds: number[];
  readonly latestSyncRevision: number;
  readonly latestUpdatedAt: string;

  constructor(latestLabelIds: number[], latestSyncRevision: number, latestUpdatedAt: string) {
    super('LABEL_CONFLICT');
    this.name = 'LabelConflictError';
    this.latestLabelIds = latestLabelIds;
    this.latestSyncRevision = latestSyncRevision;
    this.latestUpdatedAt = latestUpdatedAt;
  }
}

interface LabelMutationResponse {
  success: boolean;
  labelIds: number[];
  syncRevision: number;
  updatedAt: string;
}

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('認証されていません。ログインしてください。');
  return token;
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
    try {
      const parsed = JSON.parse(errorBody) as {
        error?: string;
        latestLabelIds?: number[];
        latestSyncRevision?: number;
        latestUpdatedAt?: string;
      };
      if (parsed.error === 'LABEL_CONFLICT') {
        throw new LabelConflictError(
          parsed.latestLabelIds ?? [],
          Number(parsed.latestSyncRevision ?? 0),
          parsed.latestUpdatedAt ?? '',
        );
      }
    } catch (error) {
      if (error instanceof LabelConflictError) throw error;
    }
    throw new Error(`API ${apiName} failed: ${response.status} ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

export class LabelService {
  private static async mutateLabel(
    apiName: 'assignLabel' | 'removeLabel',
    userTransactionId: number,
    labelId: number,
  ): Promise<{ labelIds: number[]; syncRevision: number; updatedAt: string }> {
    const current = await IndexedDBService.getUserTransaction(userTransactionId);
    if (!current) throw new Error(`user_transaction not found in IndexedDB: ${userTransactionId}`);

    const execute = async (expectedSyncRevision: number): Promise<LabelMutationResponse> => callApi(apiName, {
      userTransactionId,
      labelId,
      expectedSyncRevision,
    });

    try {
      const result = await execute(current.syncRevision);
      await IndexedDBService.updateUserTransaction(userTransactionId, {
        labelIds: result.labelIds,
        syncRevision: result.syncRevision,
        updatedAt: result.updatedAt,
      });
      return result;
    } catch (error) {
      if (!(error instanceof LabelConflictError)) throw error;

      await IndexedDBService.updateUserTransaction(userTransactionId, {
        labelIds: error.latestLabelIds,
        syncRevision: error.latestSyncRevision,
        updatedAt: error.latestUpdatedAt,
      });

      const retried = await execute(error.latestSyncRevision);
      await IndexedDBService.updateUserTransaction(userTransactionId, {
        labelIds: retried.labelIds,
        syncRevision: retried.syncRevision,
        updatedAt: retried.updatedAt,
      });
      return retried;
    }
  }

  /**
   * ラベル一覧を取得。
   * IndexedDB キャッシュを優先し、バックグラウンドで TiDB から更新。
   */
  static async getLabels(): Promise<{ labels: TransactionLabel[] }> {
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('認証されていません');

    const cachedLabels = await IndexedDBService.getTransactionLabels(userId);

    if (cachedLabels.length > 0) {
      this.refreshCache(userId).catch((err) =>
        LoggingService.error('LabelService refreshCache failed', { err }),
      );
      return { labels: cachedLabels };
    }

    return this.refreshCache(userId);
  }

  private static async refreshCache(userId: string): Promise<{ labels: TransactionLabel[] }> {
    const result = await callApi<{ labels: TransactionLabel[] }>('getLabels', {});
    try {
      await IndexedDBService.replaceTransactionLabels(userId, result.labels);
    } catch (error) {
      LoggingService.error('IndexedDB replaceLabels failed', { error });
    }
    return result;
  }

  /** ラベルを新規作成。TiDB → IndexedDB の順で書き込む。 */
  static async createLabel(name: string, color: string): Promise<TransactionLabel> {
    LoggingService.info('LabelService.createLabel', { name, color });

    const result = await callApi<{ success: boolean; label: TransactionLabel }>('createLabel', { name, color });

    try {
      await IndexedDBService.saveTransactionLabel(result.label);
    } catch (error) {
      LoggingService.error('IndexedDB saveTransactionLabel failed', { error });
    }

    return result.label;
  }

  /** ラベルを更新。TiDB → IndexedDB の順で書き込む。 */
  static async updateLabel(id: number, name: string, color: string): Promise<void> {
    LoggingService.info('LabelService.updateLabel', { id, name, color });

    await callApi<{ success: boolean }>('updateLabel', { id, name, color });

    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cached = await IndexedDBService.getTransactionLabels(userId);
        const updated = cached.map((l) => (l.id === id ? { ...l, name, color } : l));
        await IndexedDBService.replaceTransactionLabels(userId, updated);
      }
    } catch (error) {
      LoggingService.error('IndexedDB updateLabel cache failed', { error });
    }
  }

  /** ラベルを削除。TiDB → IndexedDB の順で書き込む。 */
  static async deleteLabel(id: number): Promise<void> {
    LoggingService.info('LabelService.deleteLabel', { id });

    await callApi<{ success: boolean }>('deleteLabel', { id });

    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        await IndexedDBService.deleteTransactionLabel(id);
        await IndexedDBService.removeLabelFromAllUserTransactions(userId, id);
      }
    } catch (error) {
      LoggingService.error('IndexedDB deleteLabel cache failed', { error });
    }
  }

  /**
   * トランザクションにラベルを付与。TiDB → IndexedDB の順で書き込む。
   * @returns 更新後の labelIds
   */
  static async assignLabel(userTransactionId: number, labelId: number): Promise<{ labelIds: number[]; syncRevision: number; updatedAt: string }> {
    LoggingService.info('LabelService.assignLabel', { userTransactionId, labelId });
    return this.mutateLabel('assignLabel', userTransactionId, labelId);
  }

  /**
   * トランザクションからラベルを解除。TiDB → IndexedDB の順で書き込む。
   * @returns 更新後の labelIds
   */
  static async removeLabel(userTransactionId: number, labelId: number): Promise<{ labelIds: number[]; syncRevision: number; updatedAt: string }> {
    LoggingService.info('LabelService.removeLabel', { userTransactionId, labelId });
    return this.mutateLabel('removeLabel', userTransactionId, labelId);
  }
}
