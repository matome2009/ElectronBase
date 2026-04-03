import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import { rowToLabel } from './_helpers';

async function handleGetLabels(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const conn = await getConnection(env);
  try {
    const [labels] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM transaction_labels_t WHERE user_id = ? AND delete_flg = 0 ORDER BY created_at ASC`,
      [userId],
    );
    res.json({ labels: labels.map(rowToLabel) });
  } catch (error) {
    functions.logger.error('handleGetLabels error', { error, userId });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const getLabelsDev = functions.region(REGION).https.onRequest((req, res) => handleGetLabels(req, res, 'dev'));
export const getLabelsPrd = functions.region(REGION).https.onRequest((req, res) => handleGetLabels(req, res, 'prd'));
