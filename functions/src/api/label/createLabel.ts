import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rowToLabel } from './_helpers';

async function handleCreateLabel(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { name, color } = req.body as { name: string; color: string };
  if (!name || !color) {
    res.status(400).json({ error: 'name と color は必須です' });
    return;
  }
  if (name.trim().length === 0 || name.length > 100) {
    res.status(400).json({ error: 'ラベル名は1〜100文字にしてください' });
    return;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    res.status(400).json({ error: '不正なカラーコードです（例: #6366f1）' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO transaction_labels_t (user_id, name, color) VALUES (?, ?, ?)`,
      [userId, name.trim(), color],
    );
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM transaction_labels_t WHERE id = ?`,
      [result.insertId],
    );
    res.json({ success: true, label: rowToLabel(rows[0]) });
  } catch (error) {
    functions.logger.error('handleCreateLabel error', { error, userId });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const createLabelDev = functions.region(REGION).https.onRequest((req, res) => handleCreateLabel(req, res, 'dev'));
export const createLabelPrd = functions.region(REGION).https.onRequest((req, res) => handleCreateLabel(req, res, 'prd'));
