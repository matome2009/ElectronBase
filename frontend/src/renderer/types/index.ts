// ---- 課金 ----

export type BillingStatus = 'free' | 'requires_subscription' | 'subscribed';

export interface BillingInfo {
  status: BillingStatus;
  /** 初回利用月 (YYYY-MM) */
  firstUsageMonth: string | null;
  /** 前月ポイント合計 */
  lastMonthPoints: number;
  /** 当月ポイント合計 */
  currentMonthPoints: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface PointRecord {
  id: string;
  type: 'transaction' | 'kyc_email';
  description: string;
  points: number;
  createdAt: string;
  sessionId?: string;
  sessionName?: string;
  recipientAddress?: string;
}

export interface PointSummary {
  totalPoints: number;
  transactionPoints: number;
  kycEmailPoints: number;
  records: PointRecord[];
}

// ---- ウォレット ----

export interface WalletState {
  address?: string;
  chainId?: number;
  isConnected: boolean;
}
