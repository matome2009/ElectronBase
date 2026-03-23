import { ref, push, get, set, query, orderByChild } from 'firebase/database';
import { getFirebaseDatabase, getApiUrl, getUserDbRoot } from './FirebaseService';
import { getFirebaseAuth } from './FirebaseService';
import { PointRecord, PointSummary, BillingInfo, BillingStatus } from '../types/index';

const FREE_POINT_THRESHOLD = 100;

/**
 * ポイント管理サービス
 * - Transaction実行: 1ポイント/回
 * - KYCメール送信: 1ポイント/回
 * Firebase Realtime DBに記録し、Stripe従量課金の根拠とする
 */
export class PointService {
  private static getPointsRef() {
    const db = getFirebaseDatabase();
    return ref(db, `${getUserDbRoot()}/points`);
  }

  /**
   * 認証状態を確認
   */
  private static ensureAuth(): void {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error('認証されていません。ログインしてください。');
    }
  }

  /**
   * ポイントを記録する
   */
  static async addPoint(record: Omit<PointRecord, 'id' | 'createdAt'>): Promise<string> {
    this.ensureAuth();
    const pointsRef = this.getPointsRef();
    const newRef = push(pointsRef);
    const now = new Date().toISOString();
    // Firebase Realtime DB は undefined を許可しないため除去
    const clean = Object.fromEntries(
      Object.entries(record).filter(([, v]) => v !== undefined),
    );
    const data: PointRecord = {
      ...clean,
      id: newRef.key!,
      createdAt: now,
    } as PointRecord;
    await set(newRef, data);
    return newRef.key!;
  }

  /**
   * トランザクション実行ポイントを加算（1回 = 1ポイント）
   */
  static async addTransactionPoint(sessionId: string, sessionName: string): Promise<string> {
    return this.addPoint({
      type: 'transaction',
      description: `transaction:${sessionName}`,
      points: 1,
      sessionId,
      sessionName,
    });
  }

  /**
   * KYCメール送信ポイントを加算（1通 = 1ポイント）
   */
  static async addKycEmailPoint(
    recipientAddress: string,
    sessionName: string,
    sessionId?: string,
  ): Promise<string> {
    return this.addPoint({
      type: 'kyc_email',
      description: `kyc_email:${recipientAddress.slice(0, 10)}...`,
      points: 1,
      sessionId,
      sessionName,
      recipientAddress,
    });
  }

  /**
   * ポイント一覧を取得
   */
  static async getPoints(): Promise<PointRecord[]> {
    this.ensureAuth();
    const pointsRef = this.getPointsRef();
    const q = query(pointsRef, orderByChild('createdAt'));
    const snapshot = await get(q);
    if (!snapshot.exists()) return [];

    const records: PointRecord[] = [];
    snapshot.forEach((child) => {
      records.push(child.val() as PointRecord);
    });
    // 新しい順にソート
    return records.reverse();
  }

  /**
   * ポイントサマリーを取得
   */
  static async getSummary(): Promise<PointSummary> {
    const records = await this.getPoints();
    const transactionPoints = records
      .filter((r) => r.type === 'transaction')
      .reduce((sum, r) => sum + r.points, 0);
    const kycEmailPoints = records
      .filter((r) => r.type === 'kyc_email')
      .reduce((sum, r) => sum + r.points, 0);

    return {
      totalPoints: transactionPoints + kycEmailPoints,
      transactionPoints,
      kycEmailPoints,
      records,
    };
  }

  /**
   * 月別ポイントサマリーを取得（Stripe課金用）
   */
  static async getMonthlySummary(year: number, month: number): Promise<PointSummary> {
    const records = await this.getPoints();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const filtered = records.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= startDate && d < endDate;
    });

    const transactionPoints = filtered
      .filter((r) => r.type === 'transaction')
      .reduce((sum, r) => sum + r.points, 0);
    const kycEmailPoints = filtered
      .filter((r) => r.type === 'kyc_email')
      .reduce((sum, r) => sum + r.points, 0);

    return {
      totalPoints: transactionPoints + kycEmailPoints,
      transactionPoints,
      kycEmailPoints,
      records: filtered,
    };
  }

  // ============================================================
  // 課金ステータス管理
  // ============================================================

  private static getBillingRef() {
    const db = getFirebaseDatabase();
    return ref(db, `${getUserDbRoot()}/billing`);
  }

  /**
   * Stripe登録情報を保存
   */
  static async saveStripeInfo(stripeCustomerId: string, stripeSubscriptionId: string): Promise<void> {
    this.ensureAuth();
    const billingRef = this.getBillingRef();
    await set(billingRef, {
      stripeCustomerId,
      stripeSubscriptionId,
      subscribedAt: new Date().toISOString(),
    });
  }

  /**
   * Stripe登録情報を取得
   */
  static async getStripeInfo(): Promise<{ stripeCustomerId?: string; stripeSubscriptionId?: string; cancelAtPeriodEnd?: boolean } | null> {
    this.ensureAuth();
    const billingRef = this.getBillingRef();
    const snapshot = await get(billingRef);
    if (!snapshot.exists()) return null;
    return snapshot.val();
  }

  /**
   * 課金ステータスを判定
   *
   * ロジック:
   * - 初月（最初のポイント記録がある月）は無料（何pt使ってもOK）
   * - 過去のどこかの月で100pt以上使った実績があれば、
   *   その翌月以降は requires_subscription（Stripe登録しないと使えない）
   * - Stripe登録済みなら subscribed
   */
  static async getBillingInfo(): Promise<BillingInfo> {
    const records = await this.getPoints();
    const stripeInfo = await this.getStripeInfo();

    // 初回利用月を特定
    let firstUsageMonth: string | null = null;
    if (records.length > 0) {
      const oldest = records[records.length - 1];
      const d = new Date(oldest.createdAt);
      firstUsageMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    const currentMonthPoints = this.sumPointsForMonth(records, currentYear, currentMonth);
    const lastMonthPoints = this.sumPointsForMonth(records, prevYear, prevMonth);

    // ステータス判定
    let status: BillingStatus = 'free';

    if (stripeInfo?.stripeSubscriptionId) {
      // Stripe登録済み → OK
      status = 'subscribed';
    } else {
      // 過去の月（当月を除く）で100pt以上使った月が1つでもあるか
      const hasHeavyUsageMonth = this.hasAnyMonthOver(records, FREE_POINT_THRESHOLD, currentMonthKey);
      if (hasHeavyUsageMonth) {
        status = 'requires_subscription';
      }
      // else: まだ初月 or どの月も100pt未満 → free
    }

    return {
      status,
      firstUsageMonth,
      lastMonthPoints,
      currentMonthPoints,
      stripeCustomerId: stripeInfo?.stripeCustomerId,
      stripeSubscriptionId: stripeInfo?.stripeSubscriptionId,
      cancelAtPeriodEnd: stripeInfo?.cancelAtPeriodEnd ?? false,
    };
  }

  /**
   * 当月を除く過去の月で、thresholdポイント以上使った月があるか
   */
  private static hasAnyMonthOver(
    records: PointRecord[],
    threshold: number,
    currentMonthKey: string,
  ): boolean {
    // 月ごとにポイントを集計
    const monthlyTotals = new Map<string, number>();
    for (const r of records) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + r.points);
    }
    // 当月を除いて100pt以上の月があるか
    for (const [month, total] of monthlyTotals) {
      if (month !== currentMonthKey && total >= threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * 操作可能かチェック（ブロック判定）
   * requires_subscription なら false を返す
   */
  static async canOperate(): Promise<{ allowed: boolean; billing: BillingInfo }> {
    const billing = await this.getBillingInfo();
    return {
      allowed: billing.status !== 'requires_subscription',
      billing,
    };
  }

  /**
   * 指定月のポイント合計
   */
  private static sumPointsForMonth(records: PointRecord[], year: number, month: number): number {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return records
      .filter((r) => {
        const d = new Date(r.createdAt);
        return d >= start && d < end;
      })
      .reduce((sum, r) => sum + r.points, 0);
  }

  /**
   * Stripe に使用量を報告（metered billing 用）
   * サブスク未登録の場合は何もしない
   */
  static async reportUsage(quantity: number = 1): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      await fetch(`${getApiUrl('reportUsage')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ quantity }),
      });
    } catch (e) {
      console.warn('Stripe使用量報告失敗:', e);
    }
  }
}
