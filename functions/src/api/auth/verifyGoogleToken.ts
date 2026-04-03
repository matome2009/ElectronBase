import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { REGION, setCors } from '../../common/cors';
import { findOrCreateUser, updateLastLoginAt } from '../../common/db';
import { getOrCreateFirebaseUser } from './_helpers';

async function handleVerifyGoogleToken(
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

  // Firebase Admin SDK で ID トークンを検証し、Google sub を取得
  let googleSub: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const identities = decoded.firebase?.identities as Record<string, string[]> | undefined;
    const googleIdentities = identities?.['google.com'];
    if (!googleIdentities || googleIdentities.length === 0) throw new Error('No Google identity in token');
    googleSub = googleIdentities[0];
  } catch {
    res.status(401).json({ error: 'Invalid Firebase ID token' });
    return;
  }

  const uid = await findOrCreateUser(env, 'google', googleSub, uuidv4());
  await getOrCreateFirebaseUser(uid);
  await updateLastLoginAt(env, uid);

  const customToken = await admin.auth().createCustomToken(uid, { loginType: 'google' });
  res.json({ customToken, userId: uid });
}

export const verifyGoogleTokenDev = functions.region(REGION).https.onRequest((req, res) => handleVerifyGoogleToken(req, res, 'dev'));
export const verifyGoogleTokenPrd = functions.region(REGION).https.onRequest((req, res) => handleVerifyGoogleToken(req, res, 'prd'));
