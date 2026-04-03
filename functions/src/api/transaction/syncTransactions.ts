import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { getActivePlan, PLAN_LIMITS } from '../../common/planLimits';
import { RowDataPacket } from 'mysql2';
import { syncAddressTransfers } from './_helpers';

async function handleSyncTransactions(
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

  const { chainId, address } = req.body as { chainId: number; address: string };
  if (!chainId || !address) {
    res.status(400).json({ error: 'chainId and address are required' });
    return;
  }

  const checkConn = await getConnection(env);
  try {
    const [rows] = await checkConn.execute<RowDataPacket[]>(
      `SELECT is_active FROM watched_wallets_t
       WHERE user_id = ? AND chain_id = ? AND address = ? AND delete_flg = 0 LIMIT 1`,
      [userId, chainId, address.toLowerCase()],
    );
    if (rows.length > 0 && rows[0].is_active === 0) {
      res.json({ success: true, inserted: 0, skipped: true });
      return;
    }

    const activePlan = await getActivePlan(checkConn, userId);
    const limits = PLAN_LIMITS[activePlan.planKey];

    const overItems: string[] = [];

    let currentAddressCount = 0;
    if (limits.maxAddresses !== null) {
      const [[addrRow]] = await checkConn.execute<Array<{ cnt: number } & RowDataPacket>>(
        `SELECT COUNT(DISTINCT address) AS cnt FROM watched_wallets_t
         WHERE user_id = ? AND delete_flg = 0`,
        [userId],
      );
      currentAddressCount = addrRow.cnt;
      if (addrRow.cnt > limits.maxAddresses) {
        overItems.push(`アドレス数: 現在${addrRow.cnt}件 / 上限${limits.maxAddresses}件`);
      }
    }

    if (limits.maxNetworksPerAddress !== null) {
      const [[netRow]] = await checkConn.execute<Array<{ cnt: number } & RowDataPacket>>(
        `SELECT COUNT(*) AS cnt FROM watched_wallets_t
         WHERE user_id = ? AND address = ? AND delete_flg = 0 AND is_active = 1`,
        [userId, address],
      );
      if (netRow.cnt > limits.maxNetworksPerAddress) {
        overItems.push(`ネットワーク数: 現在${netRow.cnt}件 / 上限${limits.maxNetworksPerAddress}件`);
      }
    }

    if (overItems.length > 0) {
      const planLabel = activePlan.planKey === 'free' ? 'free' : activePlan.planKey === 'light' ? 'light' : 'heavy';
      res.status(403).json({
        error: 'PLAN_EXPIRED',
        message: `同期が停止しています（${planLabel}プラン上限超過）。${overItems.join('、')}。プランをアップグレードしてください。`,
        planKey: activePlan.planKey,
        limits,
        currentAddressCount,
      });
      return;
    }
  } finally {
    await checkConn.end();
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    functions.logger.error('ALCHEMY_API_KEY is not set');
    res.status(500).json({ error: 'Alchemy API key not configured' });
    return;
  }

  const normalizedAddress = address.toLowerCase();
  const conn = await getConnection(env);
  try {
    const result = await syncAddressTransfers(conn, userId, chainId, normalizedAddress, apiKey);
    res.json({ success: true, inserted: result.inserted, hasMore: result.hasMore, skippedReason: result.skippedReason, tidbMaxBlock: result.tidbMaxBlock });
  } catch (error) {
    functions.logger.error('handleSyncTransactions error', { error: error instanceof Error ? error.message : String(error), userId, chainId, address });
    res.status(500).json({ error: 'Sync failed' });
  } finally {
    await conn.end();
  }
}

export const syncTransactionsDev = functions.region(REGION).https.onRequest((req, res) => handleSyncTransactions(req, res, 'dev'));
export const syncTransactionsPrd = functions.region(REGION).https.onRequest((req, res) => handleSyncTransactions(req, res, 'prd'));
