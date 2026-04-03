import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { getActivePlan, PLAN_LIMITS, PlanKey } from '../../common/planLimits';
import { getStripe } from './_helpers';
import { ResultSetHeader } from 'mysql2';

async function handleVerifyPlanPayment(
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

  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  try {
    const stripe = getStripe(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      res.status(400).json({ error: '決済が完了していません' });
      return;
    }

    // metadata から planKey を取得
    const planKey = session.metadata?.planKey as PlanKey | undefined;
    if (!planKey || !['light', 'heavy'].includes(planKey)) {
      res.status(400).json({ error: '決済情報が不正です' });
      return;
    }

    const customerId = session.customer as string;

    const conn = await getConnection(env);
    try {
      // 既存の同一 plan_key を expire させてから新規レコードを insert
      await conn.execute<ResultSetHeader>(
        `UPDATE billing_status_t
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE user_id = ? AND plan_key = ? AND status = 'active' AND delete_flg = 0`,
        [userId, planKey],
      );

      await conn.execute<ResultSetHeader>(
        `INSERT INTO billing_status_t
           (user_id, plan_key, billing_type, stripe_customer_id, status,
            subscribed_at, current_period_start, current_period_end)
         VALUES (?, ?, 'one_time', ?, 'active', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [userId, planKey, customerId],
      );

      const activePlan = await getActivePlan(conn, userId);
      const limits = PLAN_LIMITS[activePlan.planKey];

      res.json({
        success: true,
        planKey: activePlan.planKey,
        expiresAt: activePlan.expiresAt ? activePlan.expiresAt.toISOString() : null,
        limits,
      });
    } finally {
      await conn.end();
    }
  } catch (error) {
    functions.logger.error('handleVerifyPlanPayment error', { error, userId });
    res.status(500).json({ error: 'Payment verification failed' });
  }
}

export const verifyPlanPaymentDev = functions.region(REGION).https.onRequest((req, res) => handleVerifyPlanPayment(req, res, 'dev'));
export const verifyPlanPaymentPrd = functions.region(REGION).https.onRequest((req, res) => handleVerifyPlanPayment(req, res, 'prd'));
