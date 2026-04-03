import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { getActivePlan, PLAN_LIMITS } from '../../common/planLimits';
import { RowDataPacket } from 'mysql2';

async function handleGetPlanStatus(
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
    const activePlan = await getActivePlan(conn, userId);
    const limits = PLAN_LIMITS[activePlan.planKey];

    // 現在のウォレット数（ユニーク address 数）
    const [[addrRow]] = await conn.execute<Array<{ cnt: number } & RowDataPacket>>(
      `SELECT COUNT(DISTINCT address) AS cnt FROM watched_wallets_t
       WHERE user_id = ? AND delete_flg = 0`,
      [userId],
    );

    // アドレスごとのアクティブネットワーク数の最大値（is_active=1 のみ）
    const [[netRow]] = await conn.execute<Array<{ max_cnt: number } & RowDataPacket>>(
      `SELECT COALESCE(MAX(cnt), 0) AS max_cnt FROM (
         SELECT address, COUNT(*) AS cnt FROM watched_wallets_t
         WHERE user_id = ? AND delete_flg = 0 AND is_active = 1
         GROUP BY address
       ) t`,
      [userId],
    );

    // billing_status_t の履歴（active 含む全件）
    const [billingRows] = await conn.execute<RowDataPacket[]>(
      `SELECT plan_key, status, current_period_start, current_period_end, created_at
       FROM billing_status_t
       WHERE user_id = ? AND delete_flg = 0
       ORDER BY created_at DESC`,
      [userId],
    );

    res.json({
      planKey: activePlan.planKey,
      expiresAt: activePlan.expiresAt ? activePlan.expiresAt.toISOString() : null,
      limits,
      currentAddressCount: addrRow.cnt,
      currentMaxNetworkCount: netRow.max_cnt,
      billingHistory: billingRows.map((r) => ({
        planKey: r.plan_key,
        status: r.status,
        periodStart: r.current_period_start instanceof Date
          ? r.current_period_start.toISOString() : r.current_period_start,
        periodEnd: r.current_period_end instanceof Date
          ? r.current_period_end.toISOString() : r.current_period_end,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      })),
    });
  } catch (error) {
    functions.logger.error('handleGetPlanStatus error', { error, userId });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const getPlanStatusDev = functions.region(REGION).https.onRequest((req, res) => handleGetPlanStatus(req, res, 'dev'));
export const getPlanStatusPrd = functions.region(REGION).https.onRequest((req, res) => handleGetPlanStatus(req, res, 'prd'));
