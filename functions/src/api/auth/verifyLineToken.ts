import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { regionalFunctions, setCors } from '../../common/cors';
import { findOrCreateUser, updateLastLoginAt } from '../../common/db';
import { getOrCreateFirebaseUser, LINE_CHANNEL_ID } from './_helpers';

async function handleVerifyLineToken(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { accessToken } = req.body as { accessToken: string };
  if (!accessToken) {
    res.status(400).json({ error: 'accessToken is required' });
    return;
  }
  if (!LINE_CHANNEL_ID) {
    res.status(500).json({ error: 'LINE Sign In is not configured on the server' });
    return;
  }

  // LINE Verify v2.1 API でトークン検証
  let lineUserId: string;
  try {
    const verifyRes = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!verifyRes.ok) throw new Error('LINE verify failed');
    const verifyData = await verifyRes.json() as { client_id: string; expires_in: number };
    if (verifyData.client_id !== LINE_CHANNEL_ID) {
      res.status(401).json({ error: 'Invalid LINE channel' });
      return;
    }

    // プロフィール取得でuserIdを取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) throw new Error('Failed to get LINE profile');
    const profile = await profileRes.json() as { userId: string };
    lineUserId = profile.userId;
  } catch {
    res.status(401).json({ error: 'Invalid LINE access token' });
    return;
  }

  const uid = await findOrCreateUser(env, 'line', lineUserId, uuidv4());
  await getOrCreateFirebaseUser(uid);
  await updateLastLoginAt(env, uid);

  const customToken = await admin.auth().createCustomToken(uid, { loginType: 'line' });
  res.json({ customToken, userId: uid });
}

export const verifyLineTokenDev = regionalFunctions.https.onRequest((req, res) => handleVerifyLineToken(req, res, 'dev'));
export const verifyLineTokenPrd = regionalFunctions.https.onRequest((req, res) => handleVerifyLineToken(req, res, 'prd'));
