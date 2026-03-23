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

// GET /getMaintenanceAll （管理者認証必須 - 全件取得）
async function handleGetMaintenanceAll(
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
      'SELECT * FROM maintenance_m WHERE delete_flg = 0 ORDER BY updated_at DESC',
    );
    await conn.end();
    res.json({ records: rows });
  } catch (e) {
    console.error('getMaintenanceAll error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// GET /getMaintenance （認証不要 - クライアントから叩く）
// walletAddress クエリパラメータがあれば除外ユーザーチェックも行う
async function handleGetMaintenance(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const conn = await getAdminConnection(env);

    // 有効なメンテナンス設定を取得（delete_flg=0 の最新1件）
    const [rows] = await conn.execute(
      'SELECT * FROM maintenance_m WHERE delete_flg = 0 ORDER BY updated_at DESC LIMIT 1',
    ) as any[];

    if (!rows.length || rows[0].status === 0) {
      await conn.end();
      res.json({ maintenance: false });
      return;
    }

    const maintenance = rows[0];

    // status=2（除外ユーザーのみ除外モード）の場合、walletAddressをチェック
    if (maintenance.status === 2) {
      const walletAddress = (req.query.walletAddress as string)?.toLowerCase();
      if (walletAddress) {
        const [excludeRows] = await conn.execute(
          'SELECT id FROM exclude_users WHERE wallet_address = ? AND delete_flg = 0 LIMIT 1',
          [walletAddress],
        ) as any[];
        if (excludeRows.length) {
          await conn.end();
          res.json({ maintenance: false });
          return;
        }
      }
    }

    await conn.end();
    res.json({
      maintenance: true,
      status: maintenance.status,
      message_ja: maintenance.message_ja,
      message_en: maintenance.message_en,
      message_ko: maintenance.message_ko,
      message_cn: maintenance.message_cn,
    });
  } catch (e) {
    console.error('getMaintenance error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /upsertMaintenance （管理者認証必須）
async function handleUpsertMaintenance(
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
    console.error('upsertMaintenance error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /deleteMaintenance （管理者認証必須）
async function handleDeleteMaintenance(
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
    await conn.execute('UPDATE maintenance_m SET delete_flg=1 WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    console.error('deleteMaintenance error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// GET /getExcludeUsers （管理者認証必須）
async function handleGetExcludeUsers(
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
      'SELECT * FROM exclude_users WHERE delete_flg = 0 ORDER BY created_at DESC',
    );
    await conn.end();
    res.json({ users: rows });
  } catch (e) {
    console.error('getExcludeUsers error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /addExcludeUser （管理者認証必須）
async function handleAddExcludeUser(
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

  const { wallet_address } = req.body as { wallet_address: string };
  if (!wallet_address) { res.status(400).json({ error: 'wallet_address is required' }); return; }

  try {
    const conn = await getAdminConnection(env);
    await conn.execute(
      'INSERT INTO exclude_users (wallet_address) VALUES (?) ON DUPLICATE KEY UPDATE delete_flg=0, updated_at=CURRENT_TIMESTAMP',
      [wallet_address.toLowerCase()],
    );
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    console.error('addExcludeUser error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /deleteExcludeUser （管理者認証必須）
async function handleDeleteExcludeUser(
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
    await conn.execute('UPDATE exclude_users SET delete_flg=1 WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    console.error('deleteExcludeUser error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getMaintenanceAllDev = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenanceAll(req, res, 'dev'));
export const getMaintenanceAllPrd = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenanceAll(req, res, 'prd'));
export const getMaintenanceDev     = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenance(req, res, 'dev'));
export const getMaintenancePrd     = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenance(req, res, 'prd'));
export const upsertMaintenanceDev  = functions.region(REGION).https.onRequest((req, res) => handleUpsertMaintenance(req, res, 'dev'));
export const upsertMaintenancePrd  = functions.region(REGION).https.onRequest((req, res) => handleUpsertMaintenance(req, res, 'prd'));
export const deleteMaintenanceDev  = functions.region(REGION).https.onRequest((req, res) => handleDeleteMaintenance(req, res, 'dev'));
export const deleteMaintenancePrd  = functions.region(REGION).https.onRequest((req, res) => handleDeleteMaintenance(req, res, 'prd'));
export const getExcludeUsersDev    = functions.region(REGION).https.onRequest((req, res) => handleGetExcludeUsers(req, res, 'dev'));
export const getExcludeUsersPrd    = functions.region(REGION).https.onRequest((req, res) => handleGetExcludeUsers(req, res, 'prd'));
export const addExcludeUserDev     = functions.region(REGION).https.onRequest((req, res) => handleAddExcludeUser(req, res, 'dev'));
export const addExcludeUserPrd     = functions.region(REGION).https.onRequest((req, res) => handleAddExcludeUser(req, res, 'prd'));
export const deleteExcludeUserDev  = functions.region(REGION).https.onRequest((req, res) => handleDeleteExcludeUser(req, res, 'dev'));
export const deleteExcludeUserPrd  = functions.region(REGION).https.onRequest((req, res) => handleDeleteExcludeUser(req, res, 'prd'));
