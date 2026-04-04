import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { getActivePlan, PLAN_LIMITS } from '../../common/planLimits';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rowToWallet } from './_helpers';

async function handleAddWatchedWallet(
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

  const { address, chainIds, label } = req.body as {
    address: string;
    chainIds: number[];
    label?: string;
  };

  if (!address || !Array.isArray(chainIds) || chainIds.length === 0) {
    res.status(400).json({ error: 'address と chainIds（配列）は必須です' });
    return;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: '不正なウォレットアドレス形式です' });
    return;
  }

  const normalizedAddress = address.toLowerCase();
  const conn = await getConnection(env);
  try {
    const activePlan = await getActivePlan(conn, userId);
    const limits = PLAN_LIMITS[activePlan.planKey];
    if (limits.maxAddresses !== null) {
      const [[countRow]] = await conn.execute<Array<{ cnt: number } & RowDataPacket>>(
        `SELECT COUNT(DISTINCT address) AS cnt FROM watched_wallets_t
         WHERE user_id = ? AND delete_flg = 0`,
        [userId],
      );
      const [[existRow]] = await conn.execute<Array<{ cnt: number } & RowDataPacket>>(
        `SELECT COUNT(*) AS cnt FROM watched_wallets_t
         WHERE user_id = ? AND address = ? AND delete_flg = 0`,
        [userId, normalizedAddress],
      );
      const isNewAddress = existRow.cnt === 0;
      if (isNewAddress && countRow.cnt >= limits.maxAddresses) {
        res.status(403).json({
          error: 'PLAN_LIMIT_ADDRESSES',
          message: `現在のプラン（${activePlan.planKey}）では監視アドレスを${limits.maxAddresses}件まで登録できます。アップグレードすると制限が緩和されます。`,
          planKey: activePlan.planKey,
          limit: limits.maxAddresses,
          current: countRow.cnt,
        });
        return;
      }
    }

    for (const chainId of chainIds) {
      await conn.execute<ResultSetHeader>(
        `INSERT INTO watched_wallets_t (user_id, address, chain_id, label, is_active)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           label = IF(VALUES(label) IS NOT NULL, VALUES(label), label),
           updated_at = CURRENT_TIMESTAMP`,
        [userId, normalizedAddress, chainId, label ?? null],
      );
    }

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM watched_wallets_t
       WHERE user_id = ? AND address = ? AND delete_flg = 0`,
      [userId, normalizedAddress],
    );

    res.json({ success: true, wallets: rows.map(rowToWallet) });
  } catch (error) {
    functions.logger.error('handleAddWatchedWallet error', { error, userId, address });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const addWatchedWalletDev = regionalFunctions.https.onRequest((req, res) => handleAddWatchedWallet(req, res, 'dev'));
export const addWatchedWalletPrd = regionalFunctions.https.onRequest((req, res) => handleAddWatchedWallet(req, res, 'prd'));
