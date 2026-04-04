import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function handleDeleteLabel(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id } = req.body as { id: number };
  if (!id) { res.status(400).json({ error: 'id は必須です' }); return; }

  const conn = await getConnection(env);
  try {
    // ラベルを論理削除
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE transaction_labels_t
       SET delete_flg = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [id, userId],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'ラベルが見つかりません' });
      return;
    }

    // user_transactions_t の label_ids からこのラベルIDを除去（アプリケーションレベル）
    const [txRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, label_ids FROM user_transactions_t WHERE user_id = ? AND JSON_CONTAINS(label_ids, JSON_ARRAY(?))`,
      [userId, id],
    );
    for (const row of txRows) {
      const currentIds: number[] = JSON.parse(typeof row.label_ids === 'string' ? row.label_ids : JSON.stringify(row.label_ids));
      const newIds = currentIds.filter((lid: number) => lid !== id);
      await conn.execute(
        `UPDATE user_transactions_t SET label_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(newIds), row.id],
      );
    }

    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleDeleteLabel error', { error, userId, id });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const deleteLabelDev = regionalFunctions.https.onRequest((req, res) => handleDeleteLabel(req, res, 'dev'));
export const deleteLabelPrd = regionalFunctions.https.onRequest((req, res) => handleDeleteLabel(req, res, 'prd'));
