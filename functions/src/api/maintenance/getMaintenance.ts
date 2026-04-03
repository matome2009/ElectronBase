import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { getAdminConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';

interface MaintenanceRow extends RowDataPacket {
  id: number;
  status: number;
  message_ja: string;
  message_en: string;
  message_ko: string;
  message_cn: string;
}

async function handleGetMaintenance(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const conn = await getAdminConnection(env);

    const [rows] = await conn.execute<MaintenanceRow[]>(
      'SELECT * FROM maintenance_m WHERE delete_flg = 0 ORDER BY updated_at DESC LIMIT 1',
    );

    if (!rows.length || rows[0].status === 0) {
      await conn.end();
      res.json({ maintenance: false });
      return;
    }

    const maintenance = rows[0];

    if (maintenance.status === 2) {
      const userId = req.query.userId as string;
      if (userId) {
        const [excludeRows] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM exclude_users WHERE user_id = ? AND delete_flg = 0 LIMIT 1',
          [userId],
        );
        if (excludeRows.length) {
          await conn.end();
          res.json({ maintenance: false });
          return;
        }
      }
    }

    await conn.end();
    res.json({
      maintenance: true,
      status: maintenance.status,
      message_ja: maintenance.message_ja,
      message_en: maintenance.message_en,
      message_ko: maintenance.message_ko,
      message_cn: maintenance.message_cn,
    });
  } catch (e) {
    functions.logger.error('getMaintenance error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const getMaintenanceDev = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenance(req, res, 'dev'));
export const getMaintenancePrd = functions.region(REGION).https.onRequest((req, res) => handleGetMaintenance(req, res, 'prd'));
