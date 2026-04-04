import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as crypto from 'crypto';
import { regionalFunctions, setCors } from '../../common/cors';
import { getAdminConnection } from '../../common/db';
import { RowDataPacket } from 'mysql2';
import type { AdminLevel } from '../../common/auth';

interface AdminUserRow extends RowDataPacket {
  id: number;
  mail_address: string;
  password_hash: string;
  auth_level: AdminLevel;
  failed_login_attempts: number | null;
  locked_until: string | null;
}

const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30分

async function handleAdminLogin(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { mail_address, password } = req.body as { mail_address: string; password: string };
  if (!mail_address || !password) {
    res.status(400).json({ error: 'mail_address and password are required' }); return;
  }

  try {
    const conn = await getAdminConnection(env);
    try {
      const [rows] = await conn.execute<AdminUserRow[]>(
        'SELECT * FROM admin_users WHERE mail_address = ? AND delete_flg = 0 LIMIT 1',
        [mail_address],
      );

      if (!rows.length) {
        res.status(401).json({ error: 'Invalid credentials' }); return;
      }

      const user = rows[0];

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        res.status(423).json({ error: 'Account locked. Too many failed login attempts.' }); return;
      }

      const hash = crypto.createHash('sha512').update(password).digest('hex');
      if (hash !== user.password_hash) {
        const newAttempts = (user.failed_login_attempts ?? 0) + 1;
        if (newAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
          await conn.execute(
            'UPDATE admin_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
            [newAttempts, lockedUntil, user.id],
          );
          functions.logger.error('adminLogin: account locked due to too many failed attempts', { mail_address, env });
        } else {
          await conn.execute(
            'UPDATE admin_users SET failed_login_attempts = ? WHERE id = ?',
            [newAttempts, user.id],
          );
        }
        res.status(401).json({ error: 'Invalid credentials' }); return;
      }

      await conn.execute(
        'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
        [user.id],
      );

      const customToken = await admin.auth().createCustomToken(
        `admin_${user.id}`,
        {
          admin: true,
          adminLevel: user.auth_level,
          adminUserId: user.id,
          env,
        },
      );
      res.json({ customToken, mail_address: user.mail_address, auth_level: user.auth_level });
    } finally {
      await conn.end();
    }
  } catch (e) {
    functions.logger.error('adminLogin error:', e);
    res.status(500).json({ error: 'DB error' });
  }
}

export const adminLoginDev = regionalFunctions.https.onRequest((req, res) => handleAdminLogin(req, res, 'dev'));
export const adminLoginPrd = regionalFunctions.https.onRequest((req, res) => handleAdminLogin(req, res, 'prd'));
