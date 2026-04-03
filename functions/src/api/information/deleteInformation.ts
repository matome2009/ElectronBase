import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleDeleteInformation(
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

  const { id } = req.body as { id: number };
  if (!id) { res.status(400).json({ error: 'id is required' }); return; }

  try {
    const conn = await getAdminConnection(env);
    await conn.execute('UPDATE information_m SET delete_flg=1 WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    functions.logger.error('deleteInformation error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const deleteInformationDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteInformation(req, res, 'dev'));
export const deleteInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteInformation(req, res, 'prd'));
