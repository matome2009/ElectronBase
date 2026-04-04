import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleAddExcludeUser(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try { await verifyAdmin(req, { env, minLevel: 'admin' }); } catch {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }

  const { user_id } = req.body as { user_id: string };
  if (!user_id) { res.status(400).json({ error: 'user_id is required' }); return; }

  try {
    const conn = await getAdminConnection(env);
    await conn.execute(
      'INSERT INTO exclude_users (user_id) VALUES (?) ON DUPLICATE KEY UPDATE delete_flg=0',
      [user_id],
    );
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    functions.logger.error('addExcludeUser error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const addExcludeUserDev = regionalFunctions.https.onRequest((req, res) => handleAddExcludeUser(req, res, 'dev'));
export const addExcludeUserPrd = regionalFunctions.https.onRequest((req, res) => handleAddExcludeUser(req, res, 'prd'));
