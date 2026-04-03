import { getFirebaseAuth, getApiUrl } from '../../services/FirebaseService';
import { PlanKey, PlanStatus } from '../../models/index';

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('認証されていません。ログインしてください。');
  return token;
}

async function callApi<T>(apiName: string, body: unknown): Promise<T> {
  const idToken = await getIdToken();
  const url = getApiUrl(apiName);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API ${apiName} failed: ${response.status} ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

export class PlanService {
  /** 現在のプランステータスを取得 */
  static async getPlanStatus(): Promise<PlanStatus> {
    return callApi<PlanStatus>('getPlanStatus', {});
  }

  /**
   * Stripe Checkout URL を取得して遷移する。
   * - planKey: 'light' | 'heavy'
   * - 現在 light が有効で heavy を購入する場合は自動でアップグレード価格（¥1600）が適用される
   */
  static async startCheckout(planKey: 'light' | 'heavy'): Promise<void> {
    const result = await callApi<{ url: string; sessionId: string }>('createPlanCheckout', {
      planKey,
      successUrl: `${window.location.origin}/?plan=success`,
      cancelUrl: `${window.location.origin}/?plan=cancel`,
    });
    if (!result.url) throw new Error('Checkout URL が取得できませんでした');
    window.location.href = result.url;
  }

  /**
   * 決済完了後に呼び出す。sessionId を検証してプランを有効化する。
   */
  static async verifyPayment(sessionId: string): Promise<{
    success: boolean;
    planKey: PlanKey;
    expiresAt: string | null;
  }> {
    return callApi('verifyPlanPayment', { sessionId });
  }
}
