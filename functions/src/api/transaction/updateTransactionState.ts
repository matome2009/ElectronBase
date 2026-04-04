import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { ResultSetHeader } from 'mysql2';

async function handleUpdateTransactionState(
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

  const { userTransactionId, state, isFlagged, isHidden } = req.body as {
    userTransactionId: number;
    state?: string;
    isFlagged?: boolean;
    isHidden?: boolean;
  };

  if (!userTransactionId) {
    res.status(400).json({ error: 'userTransactionId is required' });
    return;
  }
  if (state !== undefined && !['unread', 'read'].includes(state)) {
    res.status(400).json({ error: 'state must be unread or read' });
    return;
  }
  if (state === undefined && isFlagged === undefined && isHidden === undefined) {
    res.status(400).json({ error: 'at least one of state, isFlagged, isHidden is required' });
    return;
  }

  const setClauses: string[] = [];
  const params: (string | number)[] = [];
  if (state !== undefined)     { setClauses.push('state = ?');      params.push(state); }
  if (isFlagged !== undefined) { setClauses.push('is_flagged = ?'); params.push(isFlagged ? 1 : 0); }
  if (isHidden !== undefined)  { setClauses.push('is_hidden = ?');  params.push(isHidden ? 1 : 0); }
  setClauses.push('updated_at = CURRENT_TIMESTAMP(6)');

  const conn = await getConnection(env);
  try {
    const [result] = await conn.execute<ResultSetHeader>(
      `UPDATE user_transactions_t
       SET ${setClauses.join(', ')}, sync_revision = sync_revision + 1
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [...params, userTransactionId, userId],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    const [rows] = await conn.execute<import('mysql2').RowDataPacket[]>(
      `SELECT sync_revision, updated_at
       FROM user_transactions_t
       WHERE id = ? AND user_id = ? AND delete_flg = 0`,
      [userTransactionId, userId],
    );
    const row = rows[0];
    res.json({
      success: true,
      syncRevision: Number(row?.sync_revision ?? 0),
      updatedAt: row?.updated_at instanceof Date ? row.updated_at.toISOString() : row?.updated_at ?? '',
    });
  } catch (error) {
    functions.logger.error('handleUpdateTransactionState error', { error });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const updateTransactionStateDev = regionalFunctions.https.onRequest((req, res) => handleUpdateTransactionState(req, res, 'dev'));
export const updateTransactionStatePrd = regionalFunctions.https.onRequest((req, res) => handleUpdateTransactionState(req, res, 'prd'));
