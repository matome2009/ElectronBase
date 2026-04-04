import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { regionalFunctions, setCors } from '../../common/cors';
import { createUser, updateLastLoginAt } from '../../common/db';
import { getOrCreateFirebaseUser } from './_helpers';

async function handleStartAsGuest(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const userId = uuidv4();

    // user_tにのみ作成（login_tにはデータを入れない）
    await createUser(env, userId);
    await getOrCreateFirebaseUser(userId);
    await updateLastLoginAt(env, userId);

    const customToken = await admin.auth().createCustomToken(userId, { loginType: 'guest' });
    res.json({ customToken, userId });
  } catch (error) {
    functions.logger.error('[startAsGuest] failed', {
      env,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start as guest',
    });
  }
}

export const startAsGuestDev = regionalFunctions.https.onRequest((req, res) => handleStartAsGuest(req, res, 'dev'));
export const startAsGuestPrd = regionalFunctions.https.onRequest((req, res) => handleStartAsGuest(req, res, 'prd'));
