import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { ResultSetHeader } from 'mysql2';

async function handleUpdateWalletLabel(
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

  const { address, label } = req.body as { address: string; label: string | null };
  if (!address) {
    res.status(400).json({ error: 'address は必須です' });
    return;
  }

  const normalizedAddress = address.toLowerCase();
  const conn = await getConnection(env);
  try {
    await conn.execute<ResultSetHeader>(
      `UPDATE watched_wallets_t
       SET label = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND address = ? AND delete_flg = 0`,
      [label ?? null, userId, normalizedAddress],
    );
    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleUpdateWalletLabel error', { error, userId, address });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const updateWalletLabelDev = functions.region(REGION).https.onRequest((req, res) => handleUpdateWalletLabel(req, res, 'dev'));
export const updateWalletLabelPrd = functions.region(REGION).https.onRequest((req, res) => handleUpdateWalletLabel(req, res, 'prd'));
