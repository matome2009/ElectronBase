import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleUpsertInformation(
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

  const {
    id, title_ja, title_en, title_ko, title_cn,
    body_ja, body_en, body_ko, body_cn,
    display_start_at, display_end_at, priority,
  } = req.body as {
    id?: number;
    title_ja: string; title_en: string; title_ko: string; title_cn: string;
    body_ja: string; body_en: string; body_ko: string; body_cn: string;
    display_start_at: string; display_end_at?: string;
    priority: number;
  };

  if (!title_ja || !display_start_at) {
    res.status(400).json({ error: 'title_ja and display_start_at are required' }); return;
  }

  try {
    const conn = await getAdminConnection(env);
    if (id) {
      await conn.execute(
        `UPDATE information_m SET
          title_ja=?, title_en=?, title_ko=?, title_cn=?,
          body_ja=?, body_en=?, body_ko=?, body_cn=?,
          display_start_at=?, display_end_at=?, priority=?,
          updated_at=CURRENT_TIMESTAMP
         WHERE id=?`,
        [title_ja, title_en, title_ko, title_cn,
          body_ja, body_en, body_ko, body_cn,
          display_start_at, display_end_at || null, priority, id],
      );
    } else {
      await conn.execute(
        `INSERT INTO information_m
          (title_ja, title_en, title_ko, title_cn, body_ja, body_en, body_ko, body_cn, display_start_at, display_end_at, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title_ja, title_en, title_ko, title_cn,
          body_ja, body_en, body_ko, body_cn,
          display_start_at, display_end_at || null, priority],
      );
    }
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    functions.logger.error('upsertInformation error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const upsertInformationDev = functions.region(REGION).https.onRequest((req, res) => handleUpsertInformation(req, res, 'dev'));
export const upsertInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleUpsertInformation(req, res, 'prd'));
