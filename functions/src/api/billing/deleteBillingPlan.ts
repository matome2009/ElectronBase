import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';
import { ResultSetHeader } from 'mysql2';

async function handleDeleteBillingPlan(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    await verifyAdmin(req, { env, minLevel: 'admin' });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.body as { id: number };
  if (!id) { res.status(400).json({ error: 'id は必須です' }); return; }

  const conn = await getAdminConnection(env);
  try {
    await conn.execute<ResultSetHeader>(
      `UPDATE billing_plan_m SET delete_flg = 1, updated_at = NOW() WHERE id = ?`,
      [id],
    );
    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleDeleteBillingPlan error', { error });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const deleteBillingPlanDev = regionalFunctions.https.onRequest((req, res) => handleDeleteBillingPlan(req, res, 'dev'));
export const deleteBillingPlanPrd = regionalFunctions.https.onRequest((req, res) => handleDeleteBillingPlan(req, res, 'prd'));
