import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { getActivePlan } from '../../common/planLimits';
import { getStripe, getPlanPrice, getHostingUrl } from './_helpers';
import { RowDataPacket } from 'mysql2';

async function handleCreatePlanCheckout(
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

  const { planKey, successUrl, cancelUrl } = req.body as {
    planKey: 'light' | 'heavy';
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!planKey || !['light', 'heavy'].includes(planKey)) {
    res.status(400).json({ error: 'planKey は light または heavy を指定してください' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const activePlan = await getActivePlan(conn, userId);

    // アップグレード判定：現在 light が有効で heavy を購入する場合
    const isUpgrade = planKey === 'heavy' && activePlan.planKey === 'light';
    const priceKey = isUpgrade ? 'upgrade_light_to_heavy' : planKey;

    let unitAmount: number;
    let planDisplayName: string;
    try {
      const priceInfo = await getPlanPrice(env, priceKey);
      unitAmount = priceInfo.unitAmount;
      planDisplayName = priceInfo.displayName;
    } catch (err) {
      functions.logger.error('getPlanPrice failed', { err, priceKey });
      res.status(500).json({ error: 'プラン価格の取得に失敗しました。管理画面で billing_plan_m を確認してください。' });
      return;
    }

    const stripe = getStripe(env);
    const hostingUrl = getHostingUrl(env);

    // 既存の Stripe Customer を検索
    const [custRows] = await conn.execute<RowDataPacket[]>(
      `SELECT stripe_customer_id FROM billing_status_t
       WHERE user_id = ? AND stripe_customer_id IS NOT NULL AND delete_flg = 0
       LIMIT 1`,
      [userId],
    );

    let customerId: string | undefined = custRows[0]?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { firebaseUid: userId, env },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      locale: 'auto',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'jpy',
          unit_amount: unitAmount,
          product_data: { name: planDisplayName },
        },
      }],
      success_url: successUrl
        ? `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
        : `${hostingUrl}/?plan=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${hostingUrl}/?plan=cancel`,
      metadata: { firebaseUid: userId, env, planKey, isUpgrade: isUpgrade ? '1' : '0' },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    functions.logger.error('handleCreatePlanCheckout error', { error, userId });
    res.status(500).json({ error: 'Checkout session creation failed' });
  } finally {
    await conn.end();
  }
}

export const createPlanCheckoutDev = functions.region(REGION).https.onRequest((req, res) => handleCreatePlanCheckout(req, res, 'dev'));
export const createPlanCheckoutPrd = functions.region(REGION).https.onRequest((req, res) => handleCreatePlanCheckout(req, res, 'prd'));
