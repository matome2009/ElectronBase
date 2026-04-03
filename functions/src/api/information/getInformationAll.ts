import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleGetInformationAll(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try { await verifyAdmin(req, { env, minLevel: 'viewer' }); } catch {
    res.status(401).json({ error: 'Unauthorized' }); return;
  }
  try {
    const conn = await getAdminConnection(env);
    const [rows] = await conn.execute(
      'SELECT * FROM information_m WHERE delete_flg = 0 ORDER BY priority DESC, display_start_at DESC',
    );
    await conn.end();
    res.json({ records: rows });
  } catch (e) {
    functions.logger.error('getInformationAll error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getInformationAllDev = functions.region(REGION).https.onRequest((req, res) => handleGetInformationAll(req, res, 'dev'));
export const getInformationAllPrd = functions.region(REGION).https.onRequest((req, res) => handleGetInformationAll(req, res, 'prd'));
