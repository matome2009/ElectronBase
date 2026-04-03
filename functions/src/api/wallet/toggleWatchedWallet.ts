import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { getActivePlan, PLAN_LIMITS } from '../../common/planLimits';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function handleToggleWatchedWallet(
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

  const { id, isActive } = req.body as { id: number; isActive: boolean };
  if (!id || typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'id と isActive は必須です' });
    return;
  }

  const conn = await getConnection(env);
  try {
    if (isActive) {
      const activePlan = await getActivePlan(conn, userId);
      const limits = PLAN_LIMITS[activePlan.planKey];
      if (limits.maxNetworksPerAddress !== null) {
        const [[walletRow]] = await conn.execute<Array<{ address: string } & RowDataPacket>>(
          `SELECT address FROM watched_wallets_t WHERE id = ? AND user_id = ? AND delete_flg = 0`,
          [id, userId],
        );
        if (walletRow) {
          const [[activeRow]] = await conn.execute<Array<{ cnt: number } & RowDataPacket>>(
            `SELECT COUNT(*) AS cnt FROM watched_wallets_t
             WHERE user_id = ? AND address = ? AND is_active = 1 AND delete_flg = 0`,
            [userId, walletRow.address],
          );
          if (activeRow.cnt >= limits.maxNetworksPerAddress) {
            res.status(403).json({
              error: 'PLAN_LIMIT_NETWORKS',
              message: `現在のプラン（${activePlan.planKey}）では1アドレスあたり${limits.maxNetworksPerAddress}ネットワークまで有効にできます。`,
              planKey: activePlan.planKey,
              limit: limits.maxNetworksPerAddress,
              current: activeRow.cnt,
            });
            return;
          }
        }
      }
    }

    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE watched_wallets_t
       SET is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [isActive ? 1 : 0, id, userId],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'ウォレットが見つかりません' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleToggleWatchedWallet error', { error, userId, id });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const toggleWatchedWalletDev = functions.region(REGION).https.onRequest((req, res) => handleToggleWatchedWallet(req, res, 'dev'));
export const toggleWatchedWalletPrd = functions.region(REGION).https.onRequest((req, res) => handleToggleWatchedWallet(req, res, 'prd'));
