import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import { rowToTransactionView } from './_helpers';

async function handleGetTransactions(
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

  const _body = req.body as {
    page?: number;
    pageSize?: number;
    chainId?: number;
    state?: string;
    watchedAddress?: string;
    fromBlock?: number;
  };
  const page     = Number(_body.page     ?? 1);
  const pageSize = Number(_body.pageSize ?? 50);
  const chainId     = _body.chainId     !== undefined ? Number(_body.chainId) : undefined;
  const state       = _body.state;
  const watchedAddress = _body.watchedAddress;
  const fromBlock   = _body.fromBlock   !== undefined ? Number(_body.fromBlock) : undefined;

  if (pageSize < 1 || pageSize > 200) {
    res.status(400).json({ error: 'pageSize must be between 1 and 200' });
    return;
  }

  const conditions: string[] = ['ut.user_id = ?', 'ut.delete_flg = 0', 't.delete_flg = 0'];
  const params: (string | number | null)[] = [userId];

  if (chainId !== undefined) { conditions.push('t.chain_id = ?'); params.push(chainId); }
  if (state) { conditions.push('ut.state = ?'); params.push(state); }
  if (watchedAddress) { conditions.push('ut.watched_address = ?'); params.push(watchedAddress.toLowerCase()); }
  if (fromBlock !== undefined) { conditions.push('t.block_number > ?'); params.push(fromBlock); }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const conn = await getConnection(env);
  try {
    const [[countRow]] = await conn.execute<Array<{ total: number } & RowDataPacket>>(
      `SELECT COUNT(*) AS total
       FROM transactions_t t
       JOIN user_transactions_t ut ON t.id = ut.transaction_id
       WHERE ${where}`,
      params,
    );

    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT
         t.id, t.chain_id, t.tx_hash, t.block_number, t.block_timestamp,
         t.from_address, t.to_address, t.asset, t.contract_address, t.token_id,
         t.value, t.decimals, t.category, t.gas_used, t.gas_price, t.synced_at,
         ut.id AS user_transaction_id, ut.user_id, ut.transaction_id,
         ut.watched_address, ut.direction, ut.state, ut.is_flagged, ut.is_hidden, ut.label_ids,
         ut.sync_revision, ut.created_at, ut.updated_at
       FROM transactions_t t
       JOIN user_transactions_t ut ON t.id = ut.transaction_id
       WHERE ${where}
       ORDER BY t.block_timestamp DESC, t.id DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    res.json({
      transactions: rows.map(rowToTransactionView),
      total: countRow.total,
      page,
      pageSize,
    });
  } catch (error) {
    functions.logger.error('handleGetTransactions error', { error });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const getTransactionsDev = functions.region(REGION).https.onRequest((req, res) => handleGetTransactions(req, res, 'dev'));
export const getTransactionsPrd = functions.region(REGION).https.onRequest((req, res) => handleGetTransactions(req, res, 'prd'));
