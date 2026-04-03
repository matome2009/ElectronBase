import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';

function parseLabelIds(raw: unknown): number[] {
  if (!raw) return [];
  return JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw)) as number[];
}

async function handleRemoveLabel(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { userTransactionId, labelId, expectedSyncRevision: rawExpectedSyncRevision } = req.body as {
    userTransactionId: number;
    labelId: number;
    expectedSyncRevision: number | string;
  };
  const expectedSyncRevision = Number(rawExpectedSyncRevision);
  if (!userTransactionId || !labelId || rawExpectedSyncRevision === undefined || Number.isNaN(expectedSyncRevision)) {
    res.status(400).json({ error: 'userTransactionId と labelId と expectedSyncRevision は必須です' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const [txRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, label_ids, sync_revision, updated_at
       FROM user_transactions_t
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [userTransactionId, userId],
    );
    if (txRows.length === 0) {
      res.status(404).json({ error: 'トランザクションが見つかりません' });
      return;
    }

    const row = txRows[0];
    const currentIds = parseLabelIds(row.label_ids);
    const currentSyncRevision = Number(row.sync_revision ?? 0);
    if (currentSyncRevision !== expectedSyncRevision) {
      res.status(409).json({
        error: 'LABEL_CONFLICT',
        latestLabelIds: currentIds,
        latestSyncRevision: currentSyncRevision,
        latestUpdatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at ?? '',
      });
      return;
    }

    const newIds = currentIds.filter((lid: number) => lid !== labelId);
    if (newIds.length === currentIds.length) {
      res.json({
        success: true,
        labelIds: currentIds,
        syncRevision: currentSyncRevision,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at ?? '',
      });
      return;
    }

    const [updateResult] = await conn.execute<import('mysql2').ResultSetHeader>(
      `UPDATE user_transactions_t
       SET label_ids = ?, sync_revision = sync_revision + 1, updated_at = CURRENT_TIMESTAMP(6)
       WHERE id = ? AND user_id = ? AND sync_revision = ? AND delete_flg = 0`,
      [JSON.stringify(newIds), userTransactionId, userId, expectedSyncRevision],
    );

    if (updateResult.affectedRows === 0) {
      const [latestRows] = await conn.execute<RowDataPacket[]>(
        `SELECT label_ids, sync_revision, updated_at
         FROM user_transactions_t
         WHERE id = ? AND user_id = ? AND delete_flg = 0`,
        [userTransactionId, userId],
      );
      const latest = latestRows[0];
      res.status(409).json({
        error: 'LABEL_CONFLICT',
        latestLabelIds: parseLabelIds(latest?.label_ids),
        latestSyncRevision: Number(latest?.sync_revision ?? 0),
        latestUpdatedAt: latest?.updated_at instanceof Date ? latest.updated_at.toISOString() : latest?.updated_at ?? '',
      });
      return;
    }

    const [resultRows] = await conn.execute<RowDataPacket[]>(
      `SELECT label_ids, sync_revision, updated_at
       FROM user_transactions_t
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [userTransactionId, userId],
    );
    const resultRow = resultRows[0];
    res.json({
      success: true,
      labelIds: parseLabelIds(resultRow?.label_ids),
      syncRevision: Number(resultRow?.sync_revision ?? currentSyncRevision + 1),
      updatedAt: resultRow?.updated_at instanceof Date ? resultRow.updated_at.toISOString() : resultRow?.updated_at ?? '',
    });
  } catch (error) {
    functions.logger.error('handleRemoveLabel error', {
      error, userId, userTransactionId, labelId, expectedSyncRevision,
    });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const removeLabelDev = functions.region(REGION).https.onRequest((req, res) => handleRemoveLabel(req, res, 'dev'));
export const removeLabelPrd = functions.region(REGION).https.onRequest((req, res) => handleRemoveLabel(req, res, 'prd'));
