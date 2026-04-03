import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export type AdminLevel = 'viewer' | 'admin' | 'superadmin';
export type AdminEnv = 'dev' | 'prd';

type DecodedAdminToken = admin.auth.DecodedIdToken & {
  admin?: boolean;
  adminLevel?: AdminLevel;
  env?: AdminEnv;
};

const ADMIN_LEVEL_ORDER: Record<AdminLevel, number> = {
  viewer: 1,
  admin: 2,
  superadmin: 3,
};

function extractBearerToken(req: functions.https.Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token');
  return authHeader.split('Bearer ')[1];
}

function normalizeAdminLevel(value: unknown): AdminLevel | null {
  if (value === 'viewer' || value === 'admin' || value === 'superadmin') {
    return value;
  }
  return null;
}

/**
 * Firebase ID トークンを検証して uid を返す（ユーザー認証）
 */
export async function verifyUser(req: functions.https.Request): Promise<string> {
  const decoded = await admin.auth().verifyIdToken(extractBearerToken(req));
  return decoded.uid;
}

/**
 * Firebase ID トークンを検証する（管理者認証）
 * 検証に失敗した場合は Error をスロー
 */
export async function verifyAdmin(
  req: functions.https.Request,
  options: {
    env: AdminEnv;
    minLevel?: AdminLevel;
  },
): Promise<DecodedAdminToken & { adminLevel: AdminLevel; env: AdminEnv }> {
  const decoded = await admin.auth().verifyIdToken(extractBearerToken(req)) as DecodedAdminToken;
  const adminLevel = normalizeAdminLevel(decoded.adminLevel);
  const minLevel = options.minLevel ?? 'admin';

  if (decoded.admin !== true) {
    throw new Error('Missing admin claim');
  }
  if (!decoded.uid.startsWith('admin_')) {
    throw new Error('Invalid admin uid');
  }
  if (!adminLevel) {
    throw new Error('Invalid admin level');
  }
  if (decoded.env !== options.env) {
    throw new Error('Admin token environment mismatch');
  }
  if (ADMIN_LEVEL_ORDER[adminLevel] < ADMIN_LEVEL_ORDER[minLevel]) {
    throw new Error('Insufficient admin level');
  }

  return {
    ...decoded,
    adminLevel,
    env: options.env,
  };
}
