import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';

async function handleUpsertVersion(
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
    functions.logger.error('upsertVersion error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const upsertVersionDev = regionalFunctions.https.onRequest((req, res) => handleUpsertVersion(req, res, 'dev'));
export const upsertVersionPrd = regionalFunctions.https.onRequest((req, res) => handleUpsertVersion(req, res, 'prd'));
