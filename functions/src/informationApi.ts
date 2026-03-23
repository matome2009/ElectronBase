import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getAdminConnection } from './tidb';

const REGION = 'asia-northeast1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function setCors(res: functions.Response) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
}

async function verifyAdmin(req: functions.https.Request): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
}

// GET /getInformationAll （管理者認証必須 - 全件取得）
async function handleGetInformationAll(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  try { await verifyAdmin(req); } catch {
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
    console.error('getInformationAll error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// GET /getInformation （認証不要 - 表示期間内のお知らせのみ返す）
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
    console.error('getInformation error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /upsertInformation （管理者認証必須）
async function handleUpsertInformation(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try { await verifyAdmin(req); } catch {
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
    console.error('upsertInformation error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /deleteInformation （管理者認証必須）
async function handleDeleteInformation(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try { await verifyAdmin(req); } catch {
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
    console.error('deleteInformation error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getInformationAllDev = functions.region(REGION).https.onRequest((req, res) => handleGetInformationAll(req, res, 'dev'));
export const getInformationAllPrd = functions.region(REGION).https.onRequest((req, res) => handleGetInformationAll(req, res, 'prd'));
export const getInformationDev    = functions.region(REGION).https.onRequest((req, res) => handleGetInformation(req, res, 'dev'));
export const getInformationPrd    = functions.region(REGION).https.onRequest((req, res) => handleGetInformation(req, res, 'prd'));
export const upsertInformationDev = functions.region(REGION).https.onRequest((req, res) => handleUpsertInformation(req, res, 'dev'));
export const upsertInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleUpsertInformation(req, res, 'prd'));
export const deleteInformationDev = functions.region(REGION).https.onRequest((req, res) => handleDeleteInformation(req, res, 'dev'));
export const deleteInformationPrd = functions.region(REGION).https.onRequest((req, res) => handleDeleteInformation(req, res, 'prd'));
