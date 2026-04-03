import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { getAdminConnection } from '../../common/db';

async function handleGetInformation(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try {
    const conn = await getAdminConnection(env);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [rows] = await conn.execute(
      `SELECT * FROM information_m
       WHERE delete_flg = 0
         AND display_start_at <= ?
         AND (display_end_at IS NULL OR display_end_at >= ?)
       ORDER BY priority DESC, display_start_at DESC`,
      [now, now],
    );
    await conn.end();
    res.json({ records: rows });
  } catch (e) {
    functions.logger.error('getInformation error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getInformationDev = functions.region(REGION).https.onRequest((req, res) => handleGetInformation(req, res, 'dev'));
export const getInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleGetInformation(req, res, 'prd'));
