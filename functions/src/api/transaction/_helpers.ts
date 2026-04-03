import * as functions from 'firebase-functions';
import { RowDataPacket } from 'mysql2';
import { getConnection } from '../../common/db';

// blockTimestamp が取れなかった場合の Ankr RPC フォールバック（全チェーン共通）
const ANKR_RPC_URLS: Partial<Record<number, string>> = {
  1:        process.env.ANKR_RPC_ETH,
  137:      process.env.ANKR_RPC_POLYGON,
  42161:    process.env.ANKR_RPC_ARBITRUM,
  10:       process.env.ANKR_RPC_OPTIMISM,
  56:       process.env.ANKR_RPC_BSC,
  8453:     process.env.ANKR_RPC_BASE,
  59144:    process.env.ANKR_RPC_LINEA,
  1329:     process.env.ANKR_RPC_SEI,
  11155111: process.env.ANKR_RPC_ETH_SEPOLIA,
  80002:    process.env.ANKR_RPC_POLYGON_AMOY,
  421614:   process.env.ANKR_RPC_ARBITRUM_SEPOLIA,
  11155420: process.env.ANKR_RPC_OPTIMISM_SEPOLIA,
  97:       process.env.ANKR_RPC_BSC_TESTNET,
  84532:    process.env.ANKR_RPC_BASE_SEPOLIA,
  59141:    process.env.ANKR_RPC_LINEA_SEPOLIA,
};

export async function fetchBlockTimestampsFromAnkr(
  chainId: number,
  blockNumbers: number[],
): Promise<Map<number, string>> {
  const rpcUrl = ANKR_RPC_URLS[chainId];
  if (!rpcUrl) throw new Error(`No Ankr RPC URL configured for chainId: ${chainId}`);

  const uniqueBlocks = [...new Set(blockNumbers)];
  const timestampMap = new Map<number, string>();

  const requests = uniqueBlocks.map((blockNum, i) => ({
    jsonrpc: '2.0',
    id: i + 1,
    method: 'eth_getBlockByNumber',
    params: [`0x${blockNum.toString(16)}`, false],
  }));

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ankr RPC HTTP ${response.status}: ${text}`);
  }

  const results = await response.json() as Array<{
    id: number;
    result: { timestamp: string } | null;
    error?: { message: string };
  }>;

  for (const item of results) {
    if (item.error) throw new Error(`Ankr RPC error: ${item.error.message}`);
    if (item.result) {
      const blockNum = uniqueBlocks[item.id - 1];
      const unixSec = parseInt(item.result.timestamp, 16);
      timestampMap.set(blockNum, new Date(unixSec * 1000).toISOString());
    }
  }

  return timestampMap;
}

export const ALCHEMY_BASE_URLS: Record<number, string> = {
  // メインネット
  1:       'https://eth-mainnet.g.alchemy.com/v2',
  137:     'https://polygon-mainnet.g.alchemy.com/v2',
  42161:   'https://arb-mainnet.g.alchemy.com/v2',
  10:      'https://opt-mainnet.g.alchemy.com/v2',
  56:      'https://bnb-mainnet.g.alchemy.com/v2',
  8453:    'https://base-mainnet.g.alchemy.com/v2',
  59144:   'https://linea-mainnet.g.alchemy.com/v2',
  1329:    'https://sei-mainnet.g.alchemy.com/v2',
  // テストネット
  11155111: 'https://eth-sepolia.g.alchemy.com/v2',
  80002:    'https://polygon-amoy.g.alchemy.com/v2',
  421614:   'https://arb-sepolia.g.alchemy.com/v2',
  11155420: 'https://opt-sepolia.g.alchemy.com/v2',
  97:       'https://bnb-testnet.g.alchemy.com/v2',
  84532:    'https://base-sepolia.g.alchemy.com/v2',
  59141:    'https://linea-sepolia.g.alchemy.com/v2',
  1328:     'https://sei-testnet.g.alchemy.com/v2',
};

export interface AlchemyTransferRaw {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  asset: string | null;
  category: string;
  rawContract: { value: string | null; address: string | null; decimal: string | null };
  metadata: { blockTimestamp: string } | null;
  tokenId: string | null;
}

export async function fetchAlchemyTransfers(
  chainId: number,
  apiKey: string,
  params: Record<string, unknown>,
): Promise<{ transfers: AlchemyTransferRaw[]; pageKey?: string }> {
  const baseUrl = ALCHEMY_BASE_URLS[chainId];
  if (!baseUrl) throw new Error(`Unsupported chainId: ${chainId}`);

  const response = await fetch(`${baseUrl}/${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [{
        ...params,
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: '0x64',
      }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Alchemy HTTP ${response.status}: ${text}`);
  }

  const json = await response.json() as {
    result: { transfers: AlchemyTransferRaw[]; pageKey?: string };
    error?: { message: string };
  };
  if (json.error) throw new Error(`Alchemy RPC error: ${json.error.message}`);
  return json.result;
}

export function hexToDecimalString(hex: string | null): string {
  if (!hex) return '0';
  return BigInt(hex).toString(10);
}

export async function fetchGasDataFromAnkr(
  chainId: number,
  txHashes: string[],
): Promise<Map<string, { gasUsed: string; gasPrice: string }>> {
  const rpcUrl = ANKR_RPC_URLS[chainId];
  if (!rpcUrl) throw new Error(`No Ankr RPC URL configured for chainId: ${chainId}`);

  const unique = [...new Set(txHashes)];
  const gasMap = new Map<string, { gasUsed: string; gasPrice: string }>();

  const requests = unique.map((hash, i) => ({
    jsonrpc: '2.0',
    id: i + 1,
    method: 'eth_getTransactionReceipt',
    params: [hash],
  }));

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ankr RPC HTTP ${response.status}: ${text}`);
  }

  const results = await response.json() as Array<{
    id: number;
    result: { gasUsed: string; effectiveGasPrice?: string; gasPrice?: string } | null;
    error?: { message: string };
  }>;

  for (const item of results) {
    if (item.error) throw new Error(`Ankr RPC error (eth_getTransactionReceipt): ${item.error.message}`);
    if (item.result) {
      const hash = unique[item.id - 1];
      const gasUsed = hexToDecimalString(item.result.gasUsed);
      const priceHex = item.result.effectiveGasPrice ?? item.result.gasPrice ?? null;
      const gasPrice = hexToDecimalString(priceHex);
      gasMap.set(hash, { gasUsed, gasPrice });
    }
  }

  return gasMap;
}

export type DbConnection = Awaited<ReturnType<typeof getConnection>>;

export async function upsertTransfers(
  conn: DbConnection,
  userId: string,
  chainId: number,
  watchedAddress: string,
  direction: 'in' | 'out',
  transfers: AlchemyTransferRaw[],
): Promise<number> {
  let insertCount = 0;

  // ガス代をバッチ取得
  const txHashes = transfers.map(t => t.hash);
  let gasMap = new Map<string, { gasUsed: string; gasPrice: string }>();
  try {
    gasMap = await fetchGasDataFromAnkr(chainId, txHashes);
  } catch (error) {
    functions.logger.error('fetchGasDataFromAnkr failed, gas data will be null', { chainId, error: error instanceof Error ? error.message : String(error) });
  }

  for (const t of transfers) {
    const blockTimestamp = t.metadata?.blockTimestamp;
    if (!blockTimestamp) throw new Error(`blockTimestamp が未補完のトランザクションがあります hash=${t.hash}`);

    const value = hexToDecimalString(t.rawContract.value);
    const decimals = t.rawContract.decimal ? parseInt(t.rawContract.decimal, 16) : 18;
    const blockNumber = parseInt(t.blockNum, 16);
    const gasData = gasMap.get(t.hash) ?? null;

    await conn.execute(
      `INSERT IGNORE INTO transactions_t
         (chain_id, tx_hash, block_number, block_timestamp, from_address, to_address,
          asset, contract_address, token_id, value, decimals, category, gas_used, gas_price, raw_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chainId, t.hash, blockNumber, blockTimestamp,
        t.from.toLowerCase(), (t.to ?? '').toLowerCase(),
        (t.asset ?? 'UNKNOWN').slice(0, 20), t.rawContract.address ?? null, t.tokenId ?? null,
        value, decimals, t.category,
        gasData?.gasUsed ?? null, gasData?.gasPrice ?? null,
        JSON.stringify(t),
      ],
    );
    const [[txRow]] = await conn.execute<Array<{ id: number } & RowDataPacket>>(
      `SELECT id FROM transactions_t
       WHERE chain_id = ? AND tx_hash = ? AND from_address = ? AND to_address = ? AND asset = ?`,
      [
        chainId, t.hash,
        t.from.toLowerCase(), (t.to ?? '').toLowerCase(),
        (t.asset ?? 'UNKNOWN').slice(0, 20),
      ],
    );
    const transactionId = txRow.id;

    const [userTxResult] = await conn.execute<import('mysql2').ResultSetHeader>(
      `INSERT IGNORE INTO user_transactions_t
         (user_id, transaction_id, watched_address, direction, state, is_flagged, is_hidden, label_ids)
       VALUES (?, ?, ?, ?, 'unread', 0, 0, '[]')`,
      [userId, transactionId, watchedAddress, direction],
    );

    if (userTxResult.affectedRows === 1) {
      insertCount++;
    }
  }

  return insertCount;
}

export async function syncAddressTransfers(
  conn: DbConnection,
  userId: string,
  chainId: number,
  address: string,
  apiKey: string,
): Promise<{ inserted: number; hasMore: boolean; skippedReason: string | null; tidbMaxBlock: number | null }> {
  const MAX_PAGES = 1;
  let totalInserted = 0;

  const [[userMaxBlockRow]] = await conn.execute<Array<{ max_block: number | null } & RowDataPacket>>(
    `SELECT MAX(t.block_number) AS max_block
     FROM transactions_t t
     JOIN user_transactions_t ut ON t.id = ut.transaction_id
     WHERE ut.user_id = ? AND t.chain_id = ? AND ut.watched_address = ?`,
    [userId, chainId, address],
  );
  const userMaxBlock = userMaxBlockRow.max_block ?? 0;

  const [[globalMaxBlockRow]] = await conn.execute<Array<{ max_block: number | null } & RowDataPacket>>(
    `SELECT MAX(block_number) AS max_block
     FROM transactions_t
     WHERE chain_id = ? AND (from_address = ? OR to_address = ?)`,
    [chainId, address, address],
  );
  const globalMaxBlock = globalMaxBlockRow.max_block ?? 0;

  if (globalMaxBlock > userMaxBlock) {
    const [inResult] = await conn.execute<import('mysql2').ResultSetHeader>(
      `INSERT IGNORE INTO user_transactions_t
         (user_id, transaction_id, watched_address, direction, state, is_flagged, is_hidden, label_ids)
       SELECT ?, id, ?, 'in', 'unread', 0, 0, '[]'
       FROM transactions_t
       WHERE chain_id = ? AND to_address = ?`,
      [userId, address, chainId, address],
    );
    const [outResult] = await conn.execute<import('mysql2').ResultSetHeader>(
      `INSERT IGNORE INTO user_transactions_t
         (user_id, transaction_id, watched_address, direction, state, is_flagged, is_hidden, label_ids)
       SELECT ?, id, ?, 'out', 'unread', 0, 0, '[]'
       FROM transactions_t
       WHERE chain_id = ? AND from_address = ?`,
      [userId, address, chainId, address],
    );
    totalInserted += inResult.affectedRows + outResult.affectedRows;
    functions.logger.info('syncAddressTransfers: copied existing transactions to new user', {
      userId, chainId, address, globalMaxBlock, userMaxBlock,
      copiedIn: inResult.affectedRows,
      copiedOut: outResult.affectedRows,
    });
  }

  const tidbMaxBlock = Math.max(userMaxBlock, globalMaxBlock);
  const fromBlock = tidbMaxBlock + 1;
  const fromBlockHex = `0x${fromBlock.toString(16)}`;

  let insertedIn = 0;
  let insertedOut = 0;
  let hasMoreIn = false;
  let hasMoreOut = false;

  for (const direction of ['in', 'out'] as const) {
    const category = ['external', 'erc20'];
    const baseParams: Record<string, unknown> = {
      fromBlock: fromBlockHex,
      toBlock: 'latest',
      category,
    };
    if (direction === 'in') {
      baseParams.toAddress = address;
    } else {
      baseParams.fromAddress = address;
    }

    let pageKey: string | undefined;
    let page = 0;
    while (page < MAX_PAGES) {
      const params = pageKey ? { ...baseParams, pageKey } : baseParams;
      const result = await fetchAlchemyTransfers(chainId, apiKey, params);

      if (result.transfers.length > 0) {
        const missing = result.transfers.filter(t => !t.metadata?.blockTimestamp);
        if (missing.length > 0) {
          const blockNumbers = missing.map(t => parseInt(t.blockNum, 16));
          const tsMap = await fetchBlockTimestampsFromAnkr(chainId, blockNumbers);
          for (const transfer of missing) {
            const blockNum = parseInt(transfer.blockNum, 16);
            const ts = tsMap.get(blockNum);
            if (!ts) throw new Error(`blockTimestamp を取得できませんでした chainId=${chainId} blockNum=${blockNum}`);
            transfer.metadata = { blockTimestamp: ts };
          }
        }
        const count = await upsertTransfers(conn, userId, chainId, address, direction, result.transfers);
        if (direction === 'in') insertedIn += count;
        else insertedOut += count;
      }

      pageKey = result.pageKey;
      page++;
      if (!pageKey) break;
    }

    if (pageKey) {
      if (direction === 'in') hasMoreIn = true;
      else hasMoreOut = true;
    }
  }

  totalInserted += insertedIn + insertedOut;
  const hasMore = hasMoreIn || hasMoreOut;
  functions.logger.info('syncAddressTransfers: complete', {
    chainId, address, insertedIn, insertedOut, hasMoreIn, hasMoreOut,
  });

  return { inserted: totalInserted, hasMore, skippedReason: totalInserted === 0 ? 'no_new_transfers' : null, tidbMaxBlock };
}

export function rowToTransactionView(row: RowDataPacket): object {
  return {
    id:                row.id,
    chainId:           row.chain_id,
    txHash:            row.tx_hash,
    blockNumber:       row.block_number,
    blockTimestamp:    row.block_timestamp instanceof Date
      ? row.block_timestamp.toISOString()
      : row.block_timestamp,
    fromAddress:       row.from_address,
    toAddress:         row.to_address,
    asset:             row.asset,
    contractAddress:   row.contract_address,
    tokenId:           row.token_id,
    value:             row.value,
    decimals:          row.decimals,
    category:          row.category,
    syncedAt:          row.synced_at instanceof Date
      ? row.synced_at.toISOString()
      : row.synced_at,
    gasUsed:           row.gas_used ?? null,
    gasPrice:          row.gas_price ?? null,
    userTransactionId: row.user_transaction_id,
    userId:            row.user_id,
    transactionId:     row.transaction_id,
    watchedAddress:    row.watched_address,
    direction:         row.direction,
    state:             row.state,
    isFlagged:         row.is_flagged === 1,
    isHidden:          row.is_hidden === 1,
    syncRevision:      Number(row.sync_revision ?? 0),
    createdAt:         row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at ?? '',
    updatedAt:         row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : row.updated_at ?? '',
    labelIds:          (() => {
      const raw = row.label_ids;
      if (!raw) return [];
      if (typeof raw === 'string') return JSON.parse(raw) as number[];
      return Array.isArray(raw) ? raw : [];
    })(),
  };
}
