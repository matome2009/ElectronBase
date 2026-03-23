import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { findOrCreateUser, linkLoginToUser, createUser } from './tidb';
export { getVersionsDev, getVersionsPrd, upsertVersionDev, upsertVersionPrd, deleteVersionDev, deleteVersionPrd, adminLoginDev, adminLoginPrd } from './versionApi';
export { getMaintenanceAllDev, getMaintenanceAllPrd, getMaintenanceDev, getMaintenancePrd, upsertMaintenanceDev, upsertMaintenancePrd, deleteMaintenanceDev, deleteMaintenancePrd, getExcludeUsersDev, getExcludeUsersPrd, addExcludeUserDev, addExcludeUserPrd, deleteExcludeUserDev, deleteExcludeUserPrd } from './maintenanceApi';
export { rpcHealthCheckDev, rpcHealthCheckPrd, rpcHealthCheckManualDev, rpcHealthCheckManualPrd } from './rpcHealthCheck';
export { getInformationAllDev, getInformationAllPrd, getInformationDev, getInformationPrd, upsertInformationDev, upsertInformationPrd, deleteInformationDev, deleteInformationPrd } from './informationApi';

admin.initializeApp({
  databaseURL: 'https://token-batch-transfer-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const REGION = 'asia-northeast1';
const HOSTING_URL_DEV = 'https://token-batch-transfer-dev.web.app';
const HOSTING_URL_PRD = 'https://token-batch-transfer-prd.web.app';

function getHostingUrl(dbRoot: string): string {
  return dbRoot === 'prd' ? HOSTING_URL_PRD : HOSTING_URL_DEV;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function setCors(res: functions.Response): void {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
}

// ============================================================
// Auth（DEV/PRD共通 — noncesパスはenv非依存）
// ============================================================

export const getNonce = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    const address = (req.query.address as string)?.toLowerCase();
    if (!address || !ethers.isAddress(address)) {
      res.status(400).json({ error: 'Invalid wallet address' });
      return;
    }

    const nonce = Math.floor(Math.random() * 1000000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await admin.database().ref(`nonces/${address}`).set({ nonce, expiresAt });
    res.json({ nonce });
  });

const GOOGLE_CLIENT_ID = '923441812978-cjiflhf36j1kcklh8hp3g1d8erp50nv2.apps.googleusercontent.com';
const LINE_CHANNEL_ID = '2009555679';
// Apple Developer Console で作成した Services ID を設定してください
// 例: com.yourcompany.payrollguardian
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';

function getDbEnv(dbRoot: string): 'dev' | 'prd' {
  return dbRoot === 'prd' ? 'prd' : 'dev';
}

async function getOrCreateFirebaseUser(uid: string): Promise<string> {
  const existing = await admin.auth().getUser(uid).catch(() => null);
  if (!existing) {
    await admin.auth().createUser({ uid });
  }
  return uid;
}

// ============================================================
// verifyWalletConnect — WalletConnect署名検証 → UUID払い出し
// ============================================================

export const verifyWalletConnect = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { address, signature, dbRoot } = req.body as {
      address: string; signature: string; dbRoot: string;
    };
    if (!address || !signature || !dbRoot) {
      res.status(400).json({ error: 'address, signature and dbRoot are required' });
      return;
    }

    const normalizedAddress = address.toLowerCase();

    const nonceSnap = await admin.database().ref(`nonces/${normalizedAddress}`).get();
    if (!nonceSnap.exists()) {
      res.status(400).json({ error: 'Nonce not found. Please request a new nonce.' });
      return;
    }

    const { nonce, expiresAt } = nonceSnap.val() as { nonce: string; expiresAt: number };
    if (Date.now() > expiresAt) {
      await admin.database().ref(`nonces/${normalizedAddress}`).remove();
      res.status(400).json({ error: 'Nonce expired.' });
      return;
    }

    const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== normalizedAddress) {
        res.status(401).json({ error: 'Signature verification failed' });
        return;
      }
    } catch {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    await admin.database().ref(`nonces/${normalizedAddress}`).remove();

    const env = getDbEnv(dbRoot);
    const uid = await findOrCreateUser(env, 'wallet', normalizedAddress, uuidv4());
    await getOrCreateFirebaseUser(uid);

    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'wallet' });
    res.json({ customToken, userId: uid });
  });

// ============================================================
// verifyGoogleToken — Google ID Token検証 → UUID払い出し
// ============================================================

export const verifyGoogleToken = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { accessToken, dbRoot } = req.body as { accessToken: string; dbRoot: string };
    if (!accessToken || !dbRoot) {
      res.status(400).json({ error: 'accessToken and dbRoot are required' });
      return;
    }

    // Google tokeninfo API でアクセストークンを検証し sub を取得
    let googleSub: string;
    try {
      const tokenInfoRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!tokenInfoRes.ok) throw new Error('tokeninfo failed');
      const tokenInfo = await tokenInfoRes.json() as { sub: string; aud: string; error_description?: string };
      if (tokenInfo.error_description) throw new Error(tokenInfo.error_description);
      if (tokenInfo.aud !== GOOGLE_CLIENT_ID) throw new Error('Invalid audience');
      if (!tokenInfo.sub) throw new Error('No sub in tokeninfo');
      googleSub = tokenInfo.sub;
    } catch {
      res.status(401).json({ error: 'Invalid Google access token' });
      return;
    }

    const env = getDbEnv(dbRoot);
    const uid = await findOrCreateUser(env, 'google', googleSub, uuidv4());
    await getOrCreateFirebaseUser(uid);

    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'google' });
    res.json({ customToken, userId: uid });
  });

// ============================================================
// verifyLineToken — LINE Access Token検証 → UUID払い出し
// ============================================================

export const verifyLineToken = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { accessToken, dbRoot } = req.body as { accessToken: string; dbRoot: string };
    if (!accessToken || !dbRoot) {
      res.status(400).json({ error: 'accessToken and dbRoot are required' });
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

    const env = getDbEnv(dbRoot);
    const uid = await findOrCreateUser(env, 'line', lineUserId, uuidv4());
    await getOrCreateFirebaseUser(uid);

    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'line' });
    res.json({ customToken, userId: uid });
  });

// ============================================================
// Apple Sign In — id_token (JWT) 検証ヘルパー
// Node 20 ビルトイン crypto.webcrypto を使用（追加パッケージ不要）
// ============================================================

interface AppleJwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

async function verifyAppleIdToken(idToken: string, clientId: string): Promise<{ sub: string; email?: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { kid: string; alg: string };
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
    iss: string; aud: string; exp: number; sub: string; email?: string;
  };

  // claims 検証
  if (payload.iss !== 'https://appleid.apple.com') throw new Error('Invalid issuer');
  if (payload.aud !== clientId) throw new Error('Invalid audience');
  if (Date.now() / 1000 > payload.exp) throw new Error('Token expired');

  // Apple 公開鍵取得
  const jwksRes = await fetch('https://appleid.apple.com/auth/keys');
  if (!jwksRes.ok) throw new Error('Failed to fetch Apple public keys');
  const jwks = await jwksRes.json() as { keys: AppleJwk[] };

  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('No matching Apple public key');

  // 署名検証（Node 20 webcrypto）
  const { subtle } = (await import('crypto')).webcrypto as unknown as { subtle: SubtleCrypto };
  const publicKey = await subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg, ext: true } as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');
  const valid = await subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);
  if (!valid) throw new Error('Invalid Apple token signature');

  return { sub: payload.sub, email: payload.email };
}

// ============================================================
// verifyAppleToken — Apple id_token 検証 → UUID払い出し
// ============================================================

export const verifyAppleToken = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { idToken, dbRoot } = req.body as { idToken: string; dbRoot: string };
    if (!idToken || !dbRoot) {
      res.status(400).json({ error: 'idToken and dbRoot are required' });
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

    const env = getDbEnv(dbRoot);
    const uid = await findOrCreateUser(env, 'apple', appleSub, uuidv4());
    await getOrCreateFirebaseUser(uid);

    const customToken = await admin.auth().createCustomToken(uid, { loginType: 'apple' });
    res.json({ customToken, userId: uid });
  });

// ============================================================
// startAsGuest — UUID発行のみ（login_tにデータなし）
// ============================================================

export const startAsGuest = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { dbRoot } = req.body as { dbRoot: string };
    if (!dbRoot) {
      res.status(400).json({ error: 'dbRoot is required' });
      return;
    }

    const userId = uuidv4();
    const env = getDbEnv(dbRoot);

    // user_tにのみ作成（login_tにはデータを入れない）
    await createUser(env, userId);
    await getOrCreateFirebaseUser(userId);

    const customToken = await admin.auth().createCustomToken(userId, { loginType: 'guest' });
    res.json({ customToken, userId });
  });

// ============================================================
// linkLogin — 既存ユーザーに wallet/google/line を連携
// ============================================================

export const linkLogin = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    let currentUid: string;
    try { currentUid = await verifyAuth(req); } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const { loginType, loginKey, dbRoot, signature } = req.body as {
      loginType: 'wallet' | 'google' | 'line' | 'apple';
      loginKey: string;
      dbRoot: string;
      signature?: string; // walletの場合のみ必須
    };
    if (!loginType || !loginKey || !dbRoot) {
      res.status(400).json({ error: 'loginType, loginKey and dbRoot are required' });
      return;
    }

    // 最終的にlogin_tに保存するキー（検証後に確定）
    let resolvedLoginKey = loginKey;

    // google連携: access_token → tokeninfo → sub
    if (loginType === 'google') {
      try {
        const tokenInfoRes = await fetch(
          `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(loginKey)}`,
        );
        if (!tokenInfoRes.ok) throw new Error('tokeninfo failed');
        const tokenInfo = await tokenInfoRes.json() as { sub: string; aud: string; error_description?: string };
        if (tokenInfo.error_description) throw new Error(tokenInfo.error_description);
        if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
          res.status(401).json({ error: 'Invalid Google audience' });
          return;
        }
        resolvedLoginKey = tokenInfo.sub;
      } catch {
        res.status(401).json({ error: 'Invalid Google access token' });
        return;
      }
    }

    // apple連携: id_token → verifyAppleIdToken → sub
    if (loginType === 'apple') {
      if (!APPLE_CLIENT_ID) {
        res.status(500).json({ error: 'Apple Sign In is not configured on the server' });
        return;
      }
      try {
        const result = await verifyAppleIdToken(loginKey, APPLE_CLIENT_ID);
        resolvedLoginKey = result.sub;
      } catch {
        res.status(401).json({ error: 'Invalid Apple id_token' });
        return;
      }
    }

    // line連携: access_token → verify + profile → userId
    if (loginType === 'line') {
      try {
        const verifyRes = await fetch(
          `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(loginKey)}`,
        );
        if (!verifyRes.ok) throw new Error('LINE verify failed');
        const verifyData = await verifyRes.json() as { client_id: string };
        if (verifyData.client_id !== LINE_CHANNEL_ID) {
          res.status(401).json({ error: 'Invalid LINE channel' });
          return;
        }
        const profileRes = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${loginKey}` },
        });
        if (!profileRes.ok) throw new Error('Failed to get LINE profile');
        const profile = await profileRes.json() as { userId: string };
        resolvedLoginKey = profile.userId;
      } catch {
        res.status(401).json({ error: 'Invalid LINE access token' });
        return;
      }
    }

    // wallet連携: nonce+署名検証
    if (loginType === 'wallet') {
      const normalizedAddress = loginKey.toLowerCase();
      resolvedLoginKey = normalizedAddress;
      if (!signature) {
        res.status(400).json({ error: 'signature is required for wallet link' });
        return;
      }

      const nonceSnap = await admin.database().ref(`nonces/${normalizedAddress}`).get();
      if (!nonceSnap.exists()) {
        res.status(400).json({ error: 'Nonce not found. Please request a new nonce.' });
        return;
      }
      const { nonce, expiresAt } = nonceSnap.val() as { nonce: string; expiresAt: number };
      if (Date.now() > expiresAt) {
        await admin.database().ref(`nonces/${normalizedAddress}`).remove();
        res.status(400).json({ error: 'Nonce expired.' });
        return;
      }

      const message = `Sign in to Token Batch Transfer\nNonce: ${nonce}`;
      try {
        const recovered = ethers.verifyMessage(message, signature);
        if (recovered.toLowerCase() !== normalizedAddress) {
          res.status(401).json({ error: 'Signature verification failed' });
          return;
        }
      } catch {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      await admin.database().ref(`nonces/${normalizedAddress}`).remove();
    }

    const env = getDbEnv(dbRoot);
    try {
      await linkLoginToUser(env, currentUid, loginType, resolvedLoginKey);
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Link failed';
      res.status(409).json({ error: msg });
    }
  });

// ============================================================
// 共通ユーティリティ
// ============================================================

async function verifyAuth(req: functions.https.Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header is required');
  }
  const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  return decoded.uid;
}

// ============================================================
// ポイント集計API（Stripe従量課金用）
// ============================================================

async function handleGetPointsSummary(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let uid: string;
  try { uid = await verifyAuth(req); } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);

  const db = admin.database();
  const pointsRef = db.ref(`${dbRoot}/users/${uid}/points`);
  const snapshot = await pointsRef.orderByChild('createdAt').get();

  if (!snapshot.exists()) {
    res.json({ totalPoints: 0, transactionPoints: 0, kycEmailPoints: 0, records: [] });
    return;
  }

  const allRecords: Array<{ type: string; points: number; createdAt: string }> = [];
  snapshot.forEach((child) => {
    allRecords.push(child.val());
  });

  let filtered = allRecords;
  if (year && month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    filtered = allRecords.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= startDate && d < endDate;
    });
  }

  const transactionPoints = filtered
    .filter((r) => r.type === 'transaction')
    .reduce((sum, r) => sum + r.points, 0);
  const kycEmailPoints = filtered
    .filter((r) => r.type === 'kyc_email')
    .reduce((sum, r) => sum + r.points, 0);

  res.json({
    totalPoints: transactionPoints + kycEmailPoints,
    transactionPoints,
    kycEmailPoints,
    recordCount: filtered.length,
    period: year && month ? `${year}-${String(month).padStart(2, '0')}` : 'all',
  });
}

// ============================================================
// Stripe 従量課金（初月無料 → 100pt超で課金促進）
// ============================================================

function getStripe(dbRoot: string): Stripe {
  const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
  const key = process.env[`STRIPE_SECRET_KEY_${suffix}`];
  if (!key) throw new Error(`STRIPE_SECRET_KEY_${suffix} is not set`);
  return new Stripe(key);
}

function getStripePriceId(dbRoot: string): string {
  const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
  const id = process.env[`STRIPE_PRICE_ID_${suffix}`];
  if (!id) throw new Error(`STRIPE_PRICE_ID_${suffix} is not set`);
  return id;
}

function getStripeWebhookSecret(dbRoot: string): string {
  const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
  const secret = process.env[`STRIPE_WEBHOOK_SECRET_${suffix}`];
  if (!secret) throw new Error(`STRIPE_WEBHOOK_SECRET_${suffix} is not set`);
  return secret;
}

/**
 * Stripe Checkout Session を作成して課金登録させる
 */
async function handleCreateCheckoutSession(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let uid: string;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('No token');
    const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const priceId = getStripePriceId(dbRoot);

  const { successUrl, cancelUrl } = req.body as { successUrl?: string; cancelUrl?: string };
  const hostingUrl = getHostingUrl(dbRoot);

  try {
    const stripe = getStripe(dbRoot);

    // 既存のStripe Customerを検索 or 作成
    const db = admin.database();
    const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
    let customerId: string | undefined;

    if (billingSnap.exists()) {
      customerId = billingSnap.val()?.stripeCustomerId;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { firebaseUid: uid, dbRoot },
      });
      customerId = customer.id;
    }

    // 翌月1日 00:00 UTC を billing_cycle_anchor に設定
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
    const billingCycleAnchor = Math.floor(nextMonth.getTime() / 1000);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      locale: 'auto',
      line_items: [{ price: priceId }],
      subscription_data: {
        billing_cycle_anchor: billingCycleAnchor,
      },
      success_url: successUrl
        ? `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
        : `${hostingUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${hostingUrl}/?billing=cancel`,
      metadata: { firebaseUid: uid, dbRoot },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe Checkout Session creation failed:', error);
    res.status(500).json({ error: 'Checkout session creation failed' });
  }
}

/**
 * Checkout Session を確認して billing 情報を保存（Webhook の代替）
 */
async function handleVerifyCheckoutSession(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let uid: string;
  try { uid = await verifyAuth(req); } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  try {
    const stripe = getStripe(dbRoot);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      res.status(400).json({ error: 'Checkout session is not completed' });
      return;
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (customerId && subscriptionId) {
      await admin.database().ref(`${dbRoot}/users/${uid}/billing`).update({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscribedAt: new Date().toISOString(),
        cancelledAt: null,
      });
    }

    res.json({ success: true, status: 'subscribed' });
  } catch (error) {
    console.error('Verify checkout session failed:', error);
    res.status(500).json({ error: 'Session verification failed' });
  }
}

/**
 * サブスクリプション解約API
 */
async function handleCancelSubscription(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let uid: string;
  try { uid = await verifyAuth(req); } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const db = admin.database();
  const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
  if (!billingSnap.exists()) {
    res.status(400).json({ error: 'サブスクリプションが見つかりません' });
    return;
  }

  const billing = billingSnap.val();
  if (!billing.stripeSubscriptionId) {
    res.status(400).json({ error: 'アクティブなサブスクリプションがありません' });
    return;
  }

  try {
    const stripe = getStripe(dbRoot);
    // 即時解約ではなく期間終了時に解約（当月は有効）
    await stripe.subscriptions.update(billing.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.ref(`${dbRoot}/users/${uid}/billing`).update({
      cancelAtPeriodEnd: true,
      cancelRequestedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: '当月末で解約予定です。当月中は引き続きご利用いただけます。' });
  } catch (error) {
    console.error('Subscription cancellation failed:', error);
    res.status(500).json({ error: '解約に失敗しました' });
  }
}

/**
 * サブスクリプション解約取り消しAPI（cancel_at_period_end を false に戻す）
 */
async function handleReactivateSubscription(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let uid: string;
  try { uid = await verifyAuth(req); } catch (authErr) {
    console.error('reactivateSubscription auth failed:', authErr);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const db = admin.database();
  const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
  if (!billingSnap.exists()) {
    res.status(400).json({ error: 'サブスクリプションが見つかりません' });
    return;
  }

  const billing = billingSnap.val();
  if (!billing.stripeSubscriptionId) {
    res.status(400).json({ error: 'アクティブなサブスクリプションがありません' });
    return;
  }

  try {
    const stripe = getStripe(dbRoot);
    await stripe.subscriptions.update(billing.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db.ref(`${dbRoot}/users/${uid}/billing`).update({
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
    });

    res.json({ success: true, message: '解約を取り消しました。引き続きご利用いただけます。' });
  } catch (error) {
    console.error('Subscription reactivation failed:', error);
    res.status(500).json({ error: '解約取り消しに失敗しました' });
  }
}

/**
 * Stripe Webhook: subscription作成・解約時にFirebase DBを更新
 */
async function handleStripeWebhook(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  const webhookSecret = getStripeWebhookSecret(dbRoot);

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    const stripe = getStripe(dbRoot);
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionDbRoot = session.metadata?.dbRoot || 'dev';
    const firebaseUid = session.metadata?.firebaseUid;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (customerId && subscriptionId && firebaseUid) {
      await admin.database().ref(`${sessionDbRoot}/users/${firebaseUid}/billing`).update({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscribedAt: new Date().toISOString(),
        cancelledAt: null,
      });
      console.log(`Billing info saved: ${sessionDbRoot}/users/${firebaseUid}/billing`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    // ユーザーを検索してbillingを更新
    const usersSnap = await admin.database().ref(`${dbRoot}/users`).get();
    if (usersSnap.exists()) {
      const users = usersSnap.val() as Record<string, { billing?: { stripeCustomerId?: string } }>;
      for (const [uid, userData] of Object.entries(users)) {
        if (userData.billing?.stripeCustomerId === customerId) {
          await admin.database().ref(`${dbRoot}/users/${uid}/billing`).update({
            stripeSubscriptionId: null,
            cancelledAt: new Date().toISOString(),
          });
          console.log(`Subscription cancelled: ${dbRoot}/users/${uid}/billing`);
          break;
        }
      }
    }
  }

  res.json({ received: true });
}

/**
 * Stripe に使用量を報告（Billing Meter Events API）
 */
async function handleReportUsage(
  req: functions.https.Request,
  res: functions.Response,
  dbRoot: string,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let uid: string;
  try { uid = await verifyAuth(req); } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const { quantity } = req.body as { quantity?: number };
  if (!quantity || quantity < 1) {
    res.status(400).json({ error: 'quantity is required (>= 1)' });
    return;
  }

  const db = admin.database();
  const billingSnap = await db.ref(`${dbRoot}/users/${uid}/billing`).get();
  if (!billingSnap.exists() || !billingSnap.val().stripeCustomerId) {
    res.json({ success: true, reported: false, reason: 'no_subscription' });
    return;
  }

  const billing = billingSnap.val();
  const suffix = dbRoot === 'prd' ? 'PRD' : 'DEV';
  const eventName = process.env[`STRIPE_METER_EVENT_NAME_${suffix}`];

  if (!eventName) {
    console.warn(`STRIPE_METER_EVENT_NAME_${suffix} is not set, skipping usage report`);
    res.json({ success: true, reported: false, reason: 'no_meter_event_name' });
    return;
  }

  try {
    const stripe = getStripe(dbRoot);

    // Billing Meter Events API で使用量を報告
    for (let i = 0; i < quantity; i++) {
      await stripe.billing.meterEvents.create({
        event_name: eventName,
        payload: {
          stripe_customer_id: billing.stripeCustomerId,
          value: '1',
        },
      });
    }

    res.json({ success: true, reported: true, quantity });
  } catch (error) {
    console.error('Usage report failed:', error);
    res.status(500).json({ error: 'Usage report failed' });
  }
}

// ============================================================
// DEV 関数（dev/ パスを参照）
// ============================================================
export const getPointsSummaryDev = functions.region(REGION).https.onRequest((req, res) => handleGetPointsSummary(req, res, 'dev'));
export const createCheckoutSessionDev = functions.region(REGION).https.onRequest((req, res) => handleCreateCheckoutSession(req, res, 'dev'));
export const verifyCheckoutSessionDev = functions.region(REGION).https.onRequest((req, res) => handleVerifyCheckoutSession(req, res, 'dev'));
export const cancelSubscriptionDev = functions.region(REGION).https.onRequest((req, res) => handleCancelSubscription(req, res, 'dev'));
export const reactivateSubscriptionDev = functions.region(REGION).https.onRequest((req, res) => handleReactivateSubscription(req, res, 'dev'));
export const reportUsageDev = functions.region(REGION).https.onRequest((req, res) => handleReportUsage(req, res, 'dev'));
export const stripeWebhookDev = functions.region(REGION).https.onRequest((req, res) => handleStripeWebhook(req, res, 'dev'));

// ============================================================
// PRD 関数（prd/ パスを参照）
// ============================================================
export const getPointsSummaryPrd = functions.region(REGION).https.onRequest((req, res) => handleGetPointsSummary(req, res, 'prd'));
export const createCheckoutSessionPrd = functions.region(REGION).https.onRequest((req, res) => handleCreateCheckoutSession(req, res, 'prd'));
export const verifyCheckoutSessionPrd = functions.region(REGION).https.onRequest((req, res) => handleVerifyCheckoutSession(req, res, 'prd'));
export const cancelSubscriptionPrd = functions.region(REGION).https.onRequest((req, res) => handleCancelSubscription(req, res, 'prd'));
export const reactivateSubscriptionPrd = functions.region(REGION).https.onRequest((req, res) => handleReactivateSubscription(req, res, 'prd'));
export const reportUsagePrd = functions.region(REGION).https.onRequest((req, res) => handleReportUsage(req, res, 'prd'));
export const stripeWebhookPrd = functions.region(REGION).https.onRequest((req, res) => handleStripeWebhook(req, res, 'prd'));
