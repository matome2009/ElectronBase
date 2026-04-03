import Stripe from 'stripe';
import { getAdminConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';

export function getStripe(env: 'dev' | 'prd'): Stripe {
  void env;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

export function getStripeWebhookSecret(env: 'dev' | 'prd'): string {
  void env;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

/** billing_plan_m から plan_key に対応する unit_amount と display_name_ja を取得 */
export async function getPlanPrice(
  env: 'dev' | 'prd',
  planKey: string,
): Promise<{ unitAmount: number; displayName: string }> {
  const conn = await getAdminConnection(env);
  try {
    const [[row]] = await conn.execute<Array<{ unit_amount: number; display_name_ja: string } & RowDataPacket>>(
      `SELECT unit_amount, display_name_ja FROM billing_plan_m
       WHERE plan_key = ? AND is_active = 1 AND delete_flg = 0 LIMIT 1`,
      [planKey],
    );
    if (!row) throw new Error(`billing_plan_m に plan_key='${planKey}' が見つかりません`);
    return { unitAmount: row.unit_amount, displayName: row.display_name_ja };
  } finally {
    await conn.end();
  }
}

export function getHostingUrl(env: 'dev' | 'prd'): string {
  return env === 'prd'
    ? 'https://token-batch-transfer-prd.web.app'
    : 'https://token-batch-transfer-dev.web.app';
}
