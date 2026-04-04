import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyAdmin } from '../../common/auth';
import { getAdminConnection } from '../../common/db';
import { ResultSetHeader } from 'mysql2';
import { BillingPlan } from './_billingPlanHelpers';

async function handleUpsertBillingPlan(
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

  const body = req.body as Partial<BillingPlan> & { id?: number };

  if (!body.plan_key || !body.display_name_ja || body.unit_amount === undefined) {
    res.status(400).json({ error: 'plan_key, display_name_ja, unit_amount は必須です' });
    return;
  }

  const conn = await getAdminConnection(env);
  try {
    if (body.id) {
      await conn.execute<ResultSetHeader>(
        `UPDATE billing_plan_m
         SET plan_key = ?, billing_type = ?, display_name_ja = ?, display_name_en = ?,
             unit_amount = ?, currency = ?, description_ja = ?,
             is_active = ?, sort_order = ?, updated_at = NOW()
         WHERE id = ? AND delete_flg = 0`,
        [
          body.plan_key,
          body.billing_type ?? 'one_time',
          body.display_name_ja,
          body.display_name_en ?? '',
          body.unit_amount,
          body.currency ?? 'jpy',
          body.description_ja ?? null,
          body.is_active ?? 1,
          body.sort_order ?? 0,
          body.id,
        ],
      );
    } else {
      await conn.execute<ResultSetHeader>(
        `INSERT INTO billing_plan_m
           (plan_key, billing_type, display_name_ja, display_name_en,
            unit_amount, currency, description_ja, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.plan_key,
          body.billing_type ?? 'one_time',
          body.display_name_ja,
          body.display_name_en ?? '',
          body.unit_amount,
          body.currency ?? 'jpy',
          body.description_ja ?? null,
          body.is_active ?? 1,
          body.sort_order ?? 0,
        ],
      );
    }
    res.json({ success: true });
  } catch (error) {
    functions.logger.error('handleUpsertBillingPlan error', { error });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const upsertBillingPlanDev = regionalFunctions.https.onRequest((req, res) => handleUpsertBillingPlan(req, res, 'dev'));
export const upsertBillingPlanPrd = regionalFunctions.https.onRequest((req, res) => handleUpsertBillingPlan(req, res, 'prd'));
