import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleUpsertMaintenance(
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

  const { id, status, message_ja, message_en, message_ko, message_cn } = req.body as {
    id?: number; status: number;
    message_ja: string; message_en: string; message_ko: string; message_cn: string;
  };

  if (status === undefined || !message_ja) {
    res.status(400).json({ error: 'status and message_ja are required' }); return;
  }

  try {
    const conn = await getAdminConnection(env);
    if (id) {
      await conn.execute(
        `UPDATE maintenance_m SET status=?, message_ja=?, message_en=?, message_ko=?, message_cn=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [status, message_ja, message_en, message_ko, message_cn, id],
      );
    } else {
      await conn.execute(
        `INSERT INTO maintenance_m (status, message_ja, message_en, message_ko, message_cn) VALUES (?, ?, ?, ?, ?)`,
        [status, message_ja, message_en, message_ko, message_cn],
      );
    }
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    functions.logger.error('upsertMaintenance error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const upsertMaintenanceDev = regionalFunctions.https.onRequest((req, res) => handleUpsertMaintenance(req, res, 'dev'));
export const upsertMaintenancePrd = regionalFunctions.https.onRequest((req, res) => handleUpsertMaintenance(req, res, 'prd'));
