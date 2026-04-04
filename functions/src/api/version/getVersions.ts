import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { getAdminConnection } from '../../common/db';

async function handleGetVersions(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const conn = await getAdminConnection(env);
    const [rows] = await conn.execute('SELECT * FROM platform_versions ORDER BY platform');
    await conn.end();
    res.json({ versions: rows });
  } catch (e) {
    functions.logger.error('getVersions error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getVersionsDev = regionalFunctions.https.onRequest((req, res) => handleGetVersions(req, res, 'dev'));
export const getVersionsPrd = regionalFunctions.https.onRequest((req, res) => handleGetVersions(req, res, 'prd'));
