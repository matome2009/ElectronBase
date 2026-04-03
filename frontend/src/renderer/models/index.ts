// ---- ウォレット ----

export interface WalletState {
  address?: string;
  chainId?: number;
  isConnected: boolean;
}

// ---- ブロックチェーン トランザクション ----

/** サポートチェーンID（config/chains.ts の ALL_CHAINS と対応） */
export type ChainId =
  // メインネット
  | 1 | 137 | 42161 | 10 | 56 | 8453 | 59144 | 1329
  // テストネット
  | 11155111 | 80002 | 421614 | 11155420 | 97 | 84532 | 59141 | 1328;

/** Alchemy alchemy_getAssetTransfers が返すカテゴリ */
export type TransferCategory = 'external' | 'internal' | 'erc20' | 'erc721' | 'erc1155';

/** トランザクションの既読状態 */
export type TransactionState = 'unread' | 'read' | 'flagged' | 'hidden';

/** ウォレットアドレス帳エントリ */
export interface Contact {
  id: number;
  userId: string;
  address: string;       // lowercase 0x address
  label: string;
  description: string | null;
  createdAt: string;
}

/** 監視ウォレットアドレス */
export interface WalletAddress {
  id: number;
  userId: string;
  address: string;       // lowercase 0x address
  chainId: ChainId;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

/** オンチェーン事実（transactions_t 対応） */
export interface NormalizedTransaction {
  id: number;
  chainId: ChainId;
  txHash: string;
  blockNumber: number;
  blockTimestamp: string;           // ISO 8601
  fromAddress: string;
  toAddress: string;
  asset: string;             // 'ETH', 'USDC' 等
  contractAddress: string | null;
  tokenId: string | null;    // ERC-721/1155 トークンID（十進文字列）
  value: string;             // raw value（浮動小数点誤差回避のため文字列）
  decimals: number;
  category: TransferCategory;
  gasUsed: string | null;    // レシートの gasUsed（10進文字列）
  gasPrice: string | null;   // effectiveGasPrice（Wei、10進文字列）
  syncedAt: string;          // ISO 8601
}

/** ユーザー×トランザクション紐付け（user_transactions_t 対応） */
export interface UserTransaction {
  id: number;
  userId: string;
  transactionId: number;
  watchedAddress: string;
  direction: 'in' | 'out';
  state: TransactionState;
  isFlagged: boolean;
  isHidden: boolean;
  labelIds: number[];
  syncRevision: number;
  createdAt: string;
  updatedAt: string;
}

/** フロントエンド表示用の結合型 */
export interface TransactionView extends NormalizedTransaction {
  userTransactionId: number;
  userId: string;
  transactionId: number;
  watchedAddress: string;
  direction: 'in' | 'out';
  state: TransactionState;
  isFlagged: boolean;
  isHidden: boolean;
  labelIds: number[];
  syncRevision: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserTransactionSyncCursor {
  updatedAt: string;
  lastSeenUserTransactionId: number;
}

/** トランザクションラベル */
export interface TransactionLabel {
  id: number;
  userId: string;
  name: string;
  color: string;  // hex color e.g. '#6366f1'
  createdAt: string;
}

/** プランキー */
export type PlanKey = 'free' | 'light' | 'heavy';

/** プランごとの制限値 */
export interface PlanLimits {
  maxAddresses: number | null;
  maxNetworksPerAddress: number | null;
}

/** getPlanStatus レスポンス */
export interface PlanStatus {
  planKey: PlanKey;
  expiresAt: string | null;
  limits: PlanLimits;
  currentAddressCount: number;
  currentMaxNetworkCount: number;
  billingHistory: Array<{
    planKey: PlanKey;
    status: string;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
  }>;
}

/** syncTransactions が返すプラン期限切れエラー */
export interface PlanExpiredError {
  error: 'PLAN_EXPIRED';
  message: string;
  planKey: PlanKey;
  limits: PlanLimits;
  currentAddressCount: number;
}

/** Cloud Functions getTransactions レスポンス */
export interface GetTransactionsResponse {
  transactions: TransactionView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetUserTransactionDeltasResponse {
  transactions: TransactionView[];
  hasMore: boolean;
  nextCursor: UserTransactionSyncCursor | null;
}

/** Cloud Functions syncTransactions リクエスト */
export interface SyncTransactionsRequest {
  chainId: ChainId;
  address: string;
}

/** Cloud Functions updateUserTransaction リクエスト */
export interface UpdateUserTransactionRequest {
  userTransactionId: number;
  state?: TransactionState;
  isFlagged?: boolean;
  isHidden?: boolean;
}

/** Alchemy alchemy_getAssetTransfers の生レスポンス型（必要フィールドのみ） */
export interface AlchemyTransfer {
  blockNum: string;          // hex block number
  hash: string;
  from: string;
  to: string | null;
  value: number | null;      // NFT の場合 null のことがある
  asset: string | null;
  category: TransferCategory;
  rawContract: {
    value: string | null;    // hex 文字列
    address: string | null;
    decimal: string | null;  // hex 文字列（decimals）
  };
  metadata: {
    blockTimestamp: string;  // ISO 8601
  } | null;
  tokenId: string | null;
  erc1155Metadata: Array<{ tokenId: string; value: string }> | null;
}

export interface AlchemyAssetTransfersResponse {
  transfers: AlchemyTransfer[];
  pageKey?: string;
}
