import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
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

export interface PlatformVersion {
  id: number;
  platform: string;
  version: string;
  release_notes: string | null;
  download_url: string | null;
  created_at: string;
  updated_at: string;
}

// GET /getVersions?env=dev  （認証不要 - クライアントアプリから叩く）
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
    console.error('getVersions error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /upsertVersion  （管理者認証必須）
// body: { platform, version, release_notes?, download_url? }
async function handleUpsertVersion(
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

  const { platform, version, release_notes, download_url } = req.body as {
    platform: string; version: string; release_notes?: string; download_url?: string;
  };

  if (!platform || !version) {
    res.status(400).json({ error: 'platform and version are required' }); return;
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    res.status(400).json({ error: 'version must be x.y.z format' }); return;
  }

  try {
    const conn = await getAdminConnection(env);
    await conn.execute(
      `INSERT INTO platform_versions (platform, version, release_notes, download_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         version = VALUES(version),
         release_notes = VALUES(release_notes),
         download_url = VALUES(download_url),
         updated_at = CURRENT_TIMESTAMP`,
      [platform.toUpperCase(), version, release_notes ?? null, download_url ?? null],
    );
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    console.error('upsertVersion error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// DELETE /deleteVersion  （管理者認証必須）
// body: { platform }
async function handleDeleteVersion(
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

  const { platform } = req.body as { platform: string };
  if (!platform) { res.status(400).json({ error: 'platform is required' }); return; }

  try {
    const conn = await getAdminConnection(env);
    await conn.execute('DELETE FROM platform_versions WHERE platform = ?', [platform.toUpperCase()]);
    await conn.end();
    res.json({ success: true });
  } catch (e) {
    console.error('deleteVersion error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

// POST /adminLogin （認証不要）
// body: { mail_address, password }
async function handleAdminLogin(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { mail_address, password } = req.body as { mail_address: string; password: string };
  if (!mail_address || !password) {
    res.status(400).json({ error: 'mail_address and password are required' }); return;
  }

  try {
    const conn = await getAdminConnection(env);
    const [rows] = await conn.execute(
      'SELECT * FROM admin_users WHERE mail_address = ? LIMIT 1',
      [mail_address],
    ) as any[];
    await conn.end();

    if (!rows.length) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }

    const user = rows[0];
    const hash = crypto.createHash('sha512').update(password).digest('hex');
    if (hash !== user.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }

    const customToken = await admin.auth().createCustomToken(
      `admin_${user.id}`,
      { adminLevel: user.auth_level, env },
    );
    res.json({ customToken, mail_address: user.mail_address, auth_level: user.auth_level });
  } catch (e) {
    console.error('adminLogin error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getVersionsDev    = functions.region(REGION).https.onRequest((req, res) => handleGetVersions(req, res, 'dev'));
export const getVersionsPrd    = functions.region(REGION).https.onRequest((req, res) => handleGetVersions(req, res, 'prd'));
export const upsertVersionDev  = functions.region(REGION).https.onRequest((req, res) => handleUpsertVersion(req, res, 'dev'));
export const upsertVersionPrd  = functions.region(REGION).https.onRequest((req, res) => handleUpsertVersion(req, res, 'prd'));
export const deleteVersionDev  = functions.region(REGION).https.onRequest((req, res) => handleDeleteVersion(req, res, 'dev'));
export const deleteVersionPrd  = functions.region(REGION).https.onRequest((req, res) => handleDeleteVersion(req, res, 'prd'));
export const adminLoginDev     = functions.region(REGION).https.onRequest((req, res) => handleAdminLogin(req, res, 'dev'));
export const adminLoginPrd     = functions.region(REGION).https.onRequest((req, res) => handleAdminLogin(req, res, 'prd'));
