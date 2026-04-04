import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import { fetchBlockTimestampsFromAnkr } from './_helpers';

async function handleBackfillBlockTimestamps(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    await verifyUser(req);
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const conn = await getConnection(env);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, chain_id, block_number FROM transactions_t
       WHERE block_timestamp IS NULL
       ORDER BY chain_id, block_number`,
    );

    if (rows.length === 0) {
      res.json({ updated: 0, message: 'NULL レコードなし' });
      return;
    }

    // chainId ごとにグループ化
    const byChain = new Map<number, { id: number; blockNumber: number }[]>();
    for (const row of rows) {
      const chainId = row.chain_id as number;
      if (!byChain.has(chainId)) byChain.set(chainId, []);
      byChain.get(chainId)!.push({ id: row.id, blockNumber: row.block_number });
    }

    let totalUpdated = 0;

    for (const [chainId, records] of byChain) {
      const blockNumbers = [...new Set(records.map(r => r.blockNumber))];
      let tsMap: Map<number, string>;
      try {
        tsMap = await fetchBlockTimestampsFromAnkr(chainId, blockNumbers);
      } catch (err) {
        functions.logger.error(`backfill: chainId=${chainId} Ankr RPC 失敗`, { err });
        continue;
      }

      for (const record of records) {
        const ts = tsMap.get(record.blockNumber);
        if (!ts) {
          functions.logger.error(`backfill: chainId=${chainId} blockNumber=${record.blockNumber} timestamp 取得不可`);
          continue;
        }
        await conn.execute(
          `UPDATE transactions_t SET block_timestamp = ? WHERE id = ?`,
          [ts, record.id],
        );
        totalUpdated++;
      }
    }

    res.json({ updated: totalUpdated, total: rows.length });
  } catch (error) {
    functions.logger.error('handleBackfillBlockTimestamps error', { error });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const backfillBlockTimestampsDev = regionalFunctions.https.onRequest((req, res) => handleBackfillBlockTimestamps(req, res, 'dev'));
export const backfillBlockTimestampsPrd = regionalFunctions.https.onRequest((req, res) => handleBackfillBlockTimestamps(req, res, 'prd'));
