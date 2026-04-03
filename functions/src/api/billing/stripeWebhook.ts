import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { REGION } from '../../common/cors';
import { getConnection } from '../../common/db';
import { getStripe, getStripeWebhookSecret } from './_helpers';
import { ResultSetHeader } from 'mysql2';

async function handleStripeWebhook(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  const webhookSecret = getStripeWebhookSecret(dbRoot as 'dev' | 'prd');

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    const stripe = getStripe(dbRoot as 'dev' | 'prd');
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    functions.logger.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // checkout.session.completed (カード等の同期決済) または
  // checkout.session.async_payment_succeeded (PayPay等の非同期決済) で共通処理
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const firebaseUid = session.metadata?.firebaseUid;
    const customerId = session.customer as string;

    const planKey = session.metadata?.planKey;
    const env = (session.metadata?.env ?? 'dev') as 'dev' | 'prd';

    if (planKey && ['light', 'heavy'].includes(planKey) && firebaseUid) {
      // 同期決済: completed 時点で paid になる
      // 非同期決済(PayPay等): async_payment_succeeded 時点で paid になる
      // completed で payment_status=unpaid の場合は async_payment_succeeded を待つ
      if (session.payment_status !== 'paid') {
        functions.logger.info('checkout.session.completed: payment_status is not paid yet (async payment pending)', {
          sessionId: session.id,
          payment_status: session.payment_status,
        });
        res.json({ received: true });
        return;
      }

      const conn = await getConnection(env);
      try {
        // billing_status_t: 残り日数があれば延長、なければ NOW()+30日
        await conn.execute<ResultSetHeader>(
          `INSERT INTO billing_status_t
             (user_id, plan_key, billing_type, stripe_customer_id, status,
              subscribed_at, current_period_start, current_period_end)
           VALUES (?, ?, 'one_time', ?, 'active', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
           ON DUPLICATE KEY UPDATE
             billing_type        = 'one_time',
             stripe_customer_id  = VALUES(stripe_customer_id),
             status              = 'active',
             current_period_start = NOW(),
             current_period_end  = IF(
               current_period_end > NOW(),
               DATE_ADD(current_period_end, INTERVAL 30 DAY),
               DATE_ADD(NOW(), INTERVAL 30 DAY)
             ),
             updated_at = NOW()`,
          [firebaseUid, planKey, customerId],
        );

        // billing_log_t: 購入ごとに必ず1行INSERT
        await conn.execute(
          `INSERT INTO billing_log_t
             (user_id, plan_key, event_type, stripe_event_id, amount, currency, description)
           VALUES (?, ?, 'one_time_paid', ?, ?, 'jpy', ?)`,
          [
            firebaseUid,
            planKey,
            event.type === 'checkout.session.async_payment_succeeded' ? `async:${session.id}` : session.id,
            session.amount_total ?? null,
            `Stripe Checkout 決済完了 sessionId=${session.id} event=${event.type}`,
          ],
        );

        functions.logger.info('Plan activated via webhook', { firebaseUid, planKey, env, eventType: event.type });
      } catch (err) {
        functions.logger.error('Failed to activate plan via webhook', { err, firebaseUid, planKey });
        res.status(500).json({ error: 'Failed to activate plan' });
        return;
      } finally {
        await conn.end();
      }
      return;
    }
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    functions.logger.warn('Async payment failed', {
      sessionId: session.id,
      firebaseUid: session.metadata?.firebaseUid,
    });
  }

  res.json({ received: true });
}

export const stripeWebhookDev = functions.region(REGION).https.onRequest((req, res) => handleStripeWebhook(req, res, 'dev'));
export const stripeWebhookPrd = functions.region(REGION).https.onRequest((req, res) => handleStripeWebhook(req, res, 'prd'));
