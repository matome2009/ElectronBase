import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleGetMaintenanceAll(
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
      'SELECT * FROM maintenance_m WHERE delete_flg = 0 ORDER BY updated_at DESC',
    );
    await conn.end();
    res.json({ records: rows });
  } catch (e) {
    functions.logger.error('getMaintenanceAll error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getMaintenanceAllDev = regionalFunctions.https.onRequest((req, res) => handleGetMaintenanceAll(req, res, 'dev'));
export const getMaintenanceAllPrd = regionalFunctions.https.onRequest((req, res) => handleGetMaintenanceAll(req, res, 'prd'));
