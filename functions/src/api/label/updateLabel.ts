import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { ResultSetHeader } from 'mysql2';

async function handleUpdateLabel(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id, name, color } = req.body as { id: number; name: string; color: string };
  if (!id || !name || !color) {
    res.status(400).json({ error: 'id, name, color は必須です' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE transaction_labels_t
       SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [name.trim(), color, id, userId],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'ラベルが見つかりません' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleUpdateLabel error', { error, userId, id });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const updateLabelDev = regionalFunctions.https.onRequest((req, res) => handleUpdateLabel(req, res, 'dev'));
export const updateLabelPrd = regionalFunctions.https.onRequest((req, res) => handleUpdateLabel(req, res, 'prd'));
