import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleGetExcludeUsers(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try { await verifyAdmin(req, { env, minLevel: 'admin' }); } catch {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }

  try {
    const conn = await getAdminConnection(env);
    const [rows] = await conn.execute(
      'SELECT * FROM exclude_users WHERE delete_flg = 0 ORDER BY created_at DESC',
    );
    await conn.end();
    res.json({ users: rows });
  } catch (e) {
    functions.logger.error('getExcludeUsers error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getExcludeUsersDev = functions.region(REGION).https.onRequest((req, res) => handleGetExcludeUsers(req, res, 'dev'));
export const getExcludeUsersPrd = functions.region(REGION).https.onRequest((req, res) => handleGetExcludeUsers(req, res, 'prd'));
