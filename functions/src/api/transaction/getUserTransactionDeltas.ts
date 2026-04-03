import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import { rowToTransactionView } from './_helpers';

function toSqlDateTime(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} `
    + `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.`
    + `${pad(date.getUTCMilliseconds(), 3)}000`;
}

async function handleGetUserTransactionDeltas(
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

  const body = req.body as {
    updatedAfter?: string;
    lastSeenUserTransactionId?: number;
    limit?: number;
  };
  const updatedAfter = typeof body.updatedAfter === 'string' && body.updatedAfter.trim() !== ''
    ? body.updatedAfter
    : null;
  const lastSeenUserTransactionId = Number(body.lastSeenUserTransactionId ?? 0);
  const limit = Math.min(Math.max(Number(body.limit ?? 200), 1), 500);

  if (updatedAfter && Number.isNaN(Date.parse(updatedAfter))) {
    res.status(400).json({ error: 'updatedAfter must be a valid ISO 8601 string' });
    return;
  }
  if (Number.isNaN(lastSeenUserTransactionId) || lastSeenUserTransactionId < 0) {
    res.status(400).json({ error: 'lastSeenUserTransactionId must be a non-negative number' });
    return;
  }

  const conditions: string[] = ['ut.user_id = ?', 'ut.delete_flg = 0', 't.delete_flg = 0'];
  const params: Array<string | number> = [userId];
  const updatedAfterForSql = updatedAfter ? toSqlDateTime(new Date(updatedAfter)) : null;
  if (updatedAfterForSql) {
    conditions.push('(ut.updated_at > ? OR (ut.updated_at = ? AND ut.id > ?))');
    params.push(updatedAfterForSql, updatedAfterForSql, lastSeenUserTransactionId);
  }

  const conn = await getConnection(env);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT
         t.id, t.chain_id, t.tx_hash, t.block_number, t.block_timestamp,
         t.from_address, t.to_address, t.asset, t.contract_address, t.token_id,
         t.value, t.decimals, t.category, t.gas_used, t.gas_price, t.synced_at,
         ut.id AS user_transaction_id, ut.user_id, ut.transaction_id,
         ut.watched_address, ut.direction, ut.state, ut.is_flagged, ut.is_hidden, ut.label_ids,
         ut.sync_revision, ut.created_at, ut.updated_at
       FROM user_transactions_t ut
       JOIN transactions_t t ON t.id = ut.transaction_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ut.updated_at ASC, ut.id ASC
       LIMIT ${limit + 1}`,
      params,
    );

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    const last = trimmed.length > 0 ? trimmed[trimmed.length - 1] : null;

    res.json({
      transactions: trimmed.map(rowToTransactionView),
      hasMore,
      nextCursor: last
        ? {
            updatedAt: last.updated_at instanceof Date ? last.updated_at.toISOString() : last.updated_at,
            lastSeenUserTransactionId: Number(last.user_transaction_id),
          }
        : null,
    });
  } catch (error) {
    functions.logger.error('handleGetUserTransactionDeltas error', { error, userId });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const getUserTransactionDeltasDev = functions.region(REGION).https.onRequest((req, res) => handleGetUserTransactionDeltas(req, res, 'dev'));
export const getUserTransactionDeltasPrd = functions.region(REGION).https.onRequest((req, res) => handleGetUserTransactionDeltas(req, res, 'prd'));
