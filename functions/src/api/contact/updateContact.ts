import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { ResultSetHeader } from 'mysql2';

async function handleUpdateContact(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { id, label, description } = req.body as {
    id: number;
    label: string;
    description?: string | null;
  };

  if (!id || !label) {
    res.status(400).json({ error: 'id と label は必須です' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE wallet_contacts_t
       SET label = ?, description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [label, description ?? null, id, userId],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'コンタクトが見つかりません' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleUpdateContact error', { error, userId, id });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const updateContactDev = functions.region(REGION).https.onRequest((req, res) => handleUpdateContact(req, res, 'dev'));
export const updateContactPrd = functions.region(REGION).https.onRequest((req, res) => handleUpdateContact(req, res, 'prd'));
