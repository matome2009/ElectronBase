import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import { rowToWallet } from './_helpers';

async function handleGetWatchedWallets(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try {
    userId = await verifyUser(req);
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM watched_wallets_t
       WHERE user_id = ? AND delete_flg = 0
       ORDER BY created_at DESC`,
      [userId],
    );
    res.json({ wallets: rows.map(rowToWallet) });
  } catch (error) {
    functions.logger.error('handleGetWatchedWallets error', { error, userId });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const getWatchedWalletsDev = regionalFunctions.https.onRequest((req, res) => handleGetWatchedWallets(req, res, 'dev'));
export const getWatchedWalletsPrd = regionalFunctions.https.onRequest((req, res) => handleGetWatchedWallets(req, res, 'prd'));
