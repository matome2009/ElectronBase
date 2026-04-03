import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleDeleteVersion(
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

  const { platform } = req.body as { platform: string };
  if (!platform) { res.status(400).json({ error: 'platform is required' }); return; }

  try {
    const conn = await getAdminConnection(env);
    await conn.execute('DELETE FROM platform_versions WHERE platform = ?', [platform.toUpperCase()]);
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    functions.logger.error('deleteVersion error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const deleteVersionDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteVersion(req, res, 'dev'));
export const deleteVersionPrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteVersion(req, res, 'prd'));
