import * as functions from 'firebase-functions';
import { regionalFunctions, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { getConnection } from '../../common/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rowToContact } from './_helpers';

async function handleAddContact(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId: string;
  try { userId = await verifyUser(req); } catch { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { address, label, description } = req.body as {
    address: string;
    label: string;
    description?: string;
  };

  if (!address || !label) {
    res.status(400).json({ error: 'address と label は必須です' });
    return;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: '不正なウォレットアドレス形式です' });
    return;
  }

  const normalizedAddress = address.toLowerCase();
  const conn = await getConnection(env);
  try {
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO wallet_contacts_t (user_id, address, label, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         description = VALUES(description),
         delete_flg = 0,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, normalizedAddress, label, description ?? null],
    );

    const insertId = result.insertId > 0 ? result.insertId : null;
    let contact: object;
    if (insertId) {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM wallet_contacts_t WHERE id = ?`,
        [insertId],
      );
      contact = rowToContact(rows[0]);
    } else {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM wallet_contacts_t WHERE user_id = ? AND address = ? AND delete_flg = 0`,
        [userId, normalizedAddress],
      );
      contact = rowToContact(rows[0]);
    }

    res.json({ success: true, contact });
  } catch (error) {
    functions.logger.error('handleAddContact error', { error, userId, address });
    res.status(500).json({ error: 'DB error' });
  } finally {
    await conn.end();
  }
}

export const addContactDev = regionalFunctions.https.onRequest((req, res) => handleAddContact(req, res, 'dev'));
export const addContactPrd = regionalFunctions.https.onRequest((req, res) => handleAddContact(req, res, 'prd'));
