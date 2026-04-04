import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { regionalFunctions, setCors } from '../../common/cors';
import { findOrCreateUser, updateLastLoginAt } from '../../common/db';
import { getOrCreateFirebaseUser, verifyAppleIdToken, APPLE_CLIENT_ID } from './_helpers';

async function handleVerifyAppleToken(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { idToken } = req.body as { idToken: string };
  if (!idToken) {
    res.status(400).json({ error: 'idToken is required' });
    return;
  }
  if (!APPLE_CLIENT_ID) {
    res.status(500).json({ error: 'Apple Sign In is not configured on the server' });
    return;
  }

  let appleSub: string;
  try {
    const result = await verifyAppleIdToken(idToken, APPLE_CLIENT_ID);
    appleSub = result.sub;
  } catch {
    res.status(401).json({ error: 'Invalid Apple id_token' });
    return;
  }

  const uid = await findOrCreateUser(env, 'apple', appleSub, uuidv4());
  await getOrCreateFirebaseUser(uid);
  await updateLastLoginAt(env, uid);

  const customToken = await admin.auth().createCustomToken(uid, { loginType: 'apple' });
  res.json({ customToken, userId: uid });
}

export const verifyAppleTokenDev = regionalFunctions.https.onRequest((req, res) => handleVerifyAppleToken(req, res, 'dev'));
export const verifyAppleTokenPrd = regionalFunctions.https.onRequest((req, res) => handleVerifyAppleToken(req, res, 'prd'));
