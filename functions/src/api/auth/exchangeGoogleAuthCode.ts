import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { REGION, setCors } from '../../common/cors';
import { findOrCreateUser, updateLastLoginAt } from '../../common/db';
import { getOrCreateFirebaseUser } from './_helpers';

const GOOGLE_CLIENT_ID_DESKTOP = process.env.GOOGLE_CLIENT_ID_DESKTOP || '';
const GOOGLE_CLIENT_SECRET_DESKTOP = process.env.GOOGLE_CLIENT_SECRET_DESKTOP || '';

async function handleExchangeGoogleAuthCode(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { code, codeVerifier, redirectUri } = req.body as {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    dbRoot: string;
  };

  if (!code || !codeVerifier || !redirectUri) {
    res.status(400).json({ error: 'code, codeVerifier, redirectUri are required' });
    return;
  }
  if (!GOOGLE_CLIENT_ID_DESKTOP || !GOOGLE_CLIENT_SECRET_DESKTOP) {
    functions.logger.error('GOOGLE_CLIENT_ID_DESKTOP or GOOGLE_CLIENT_SECRET_DESKTOP is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  // Google トークンエンドポイントで auth code を access_token + id_token に交換
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID_DESKTOP,
      client_secret: GOOGLE_CLIENT_SECRET_DESKTOP,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.json() as { error: string; error_description?: string };
    functions.logger.error('Google token exchange failed', err);
    res.status(400).json({ error: err.error_description || err.error || 'Google token exchange failed' });
    return;
  }
  const { id_token: googleIdToken } = await tokenRes.json() as { id_token: string };

  // Firebase Admin SDK で Google ID トークンを検証し、Google sub を取得
  let googleSub: string;
  try {
    const decoded = await admin.auth().verifyIdToken(googleIdToken);
    const identities = decoded.firebase?.identities as Record<string, string[]> | undefined;
    const googleIdentities = identities?.['google.com'];
    if (!googleIdentities || googleIdentities.length === 0) throw new Error('No Google identity in token');
    googleSub = googleIdentities[0];
  } catch {
    // Google ID トークンは Firebase の verifyIdToken では検証できないため、
    // tokeninfo エンドポイントで sub を取得する
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleIdToken}`);
    if (!infoRes.ok) {
      res.status(401).json({ error: 'Invalid Google ID token' });
      return;
    }
    const info = await infoRes.json() as { sub: string; aud: string };
    if (info.aud !== GOOGLE_CLIENT_ID_DESKTOP) {
      res.status(401).json({ error: 'Token audience mismatch' });
      return;
    }
    googleSub = info.sub;
  }

  const uid = await findOrCreateUser(env, 'google', googleSub, uuidv4());
  await getOrCreateFirebaseUser(uid);
  await updateLastLoginAt(env, uid);

  const customToken = await admin.auth().createCustomToken(uid, { loginType: 'google' });
  res.json({ customToken, userId: uid });
}

export const exchangeGoogleAuthCodeDev = functions.region(REGION).https.onRequest((req, res) => handleExchangeGoogleAuthCode(req, res, 'dev'));
export const exchangeGoogleAuthCodePrd = functions.region(REGION).https.onRequest((req, res) => handleExchangeGoogleAuthCode(req, res, 'prd'));
