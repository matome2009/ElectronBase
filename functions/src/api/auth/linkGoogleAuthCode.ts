import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { linkLoginToUser } from '../../common/db';

const GOOGLE_CLIENT_ID_DESKTOP = process.env.GOOGLE_CLIENT_ID_DESKTOP || '';
const GOOGLE_CLIENT_SECRET_DESKTOP = process.env.GOOGLE_CLIENT_SECRET_DESKTOP || '';

async function handleLinkGoogleAuthCode(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // ゲストユーザーの Firebase ID token を検証
  let currentUid: string;
  try { currentUid = await verifyUser(req); } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const { code, codeVerifier, redirectUri } = req.body as {
    code: string;
    codeVerifier: string;
    redirectUri: string;
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

  // auth code → Google tokens
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

  // Google sub を取得
  let googleSub: string;
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

  // ゲストアカウントに Google を連携
  try {
    await linkLoginToUser(env, currentUid, 'google', googleSub);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Link failed';
    res.status(409).json({ error: msg });
    return;
  }

  // 連携後のカスタムトークンを返す（同じ uid でログインし直し）
  const customToken = await admin.auth().createCustomToken(currentUid, { loginType: 'google' });
  res.json({ customToken });
}

export const linkGoogleAuthCodeDev = functions.region(REGION).https.onRequest((req, res) => handleLinkGoogleAuthCode(req, res, 'dev'));
export const linkGoogleAuthCodePrd = functions.region(REGION).https.onRequest((req, res) => handleLinkGoogleAuthCode(req, res, 'prd'));
