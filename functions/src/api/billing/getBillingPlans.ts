import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import { rowToPlan } from './_billingPlanHelpers';
export type { BillingPlan } from './_billingPlanHelpers';

async function handleGetBillingPlans(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    await verifyAdmin(req, { env, minLevel: 'viewer' });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const conn = await getAdminConnection(env);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM billing_plan_m WHERE delete_flg = 0 ORDER BY sort_order ASC, id ASC`,
    );
    res.json({ plans: rows.map(rowToPlan) });
  } catch (error) {
    functions.logger.error('handleGetBillingPlans error', { error });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const getBillingPlansDev = functions.region(REGION).https.onRequest((req, res) => handleGetBillingPlans(req, res, 'dev'));
export const getBillingPlansPrd = functions.region(REGION).https.onRequest((req, res) => handleGetBillingPlans(req, res, 'prd'));
