import { Connection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';

export type PlanKey = 'free' | 'light' | 'heavy';

export interface PlanLimits {
  maxAddresses: number | null;  // null = unlimited
  maxNetworksPerAddress: number | null;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free:  { maxAddresses: 2,    maxNetworksPerAddress: 5 },
  light: { maxAddresses: 5,    maxNetworksPerAddress: 25 },
  heavy: { maxAddresses: null, maxNetworksPerAddress: null },
};

export interface ActivePlan {
  planKey: PlanKey;
  expiresAt: Date | null;
}

/**
 * アクティブなプランを取得。heavy > light > free の優先順位。
 * status = 'active' かつ current_period_end > NOW() のものが有効。
 */
export async function getActivePlan(conn: Connection, userId: string): Promise<ActivePlan> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT plan_key, current_period_end
     FROM billing_status_t
     WHERE user_id = ? AND status = 'active' AND delete_flg = 0
       AND current_period_end > NOW()
     ORDER BY FIELD(plan_key, 'heavy', 'light') ASC
     LIMIT 1`,
    [userId],
  );

  if (rows.length === 0) {
    return { planKey: 'free', expiresAt: null };
  }

  const row = rows[0];
  const planKey = (row.plan_key as PlanKey) === 'heavy' ? 'heavy'
    : (row.plan_key as PlanKey) === 'light' ? 'light'
    : 'free';

  return {
    planKey,
    expiresAt: row.current_period_end instanceof Date ? row.current_period_end : new Date(row.current_period_end),
  };
}
