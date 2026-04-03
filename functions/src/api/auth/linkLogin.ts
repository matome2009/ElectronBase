import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { ethers } from 'ethers';
import { REGION, setCors } from '../../common/cors';
import { verifyUser } from '../../common/auth';
import { linkLoginToUser } from '../../common/db';
import { LINE_CHANNEL_ID, APPLE_CLIENT_ID, verifyAppleIdToken } from './_helpers';

async function handleLinkLogin(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let currentUid: string;
  try { currentUid = await verifyUser(req); } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const { loginType, loginKey, signature, message } = req.body as {
    loginType: 'wallet' | 'google' | 'line' | 'apple';
    loginKey: string;
    signature?: string; // walletの場合のみ必須
    message?: string;   // walletの場合のみ必須
  };
  if (!loginType || !loginKey) {
    res.status(400).json({ error: 'loginType and loginKey are required' });
    return;
  }

  // 最終的にlogin_tに保存するキー（検証後に確定）
  let resolvedLoginKey = loginKey;

  // google連携: Firebase ID Token → Google sub
  if (loginType === 'google') {
    try {
      const decoded = await admin.auth().verifyIdToken(loginKey);
      const identities = decoded.firebase?.identities as Record<string, string[]> | undefined;
      const googleIdentities = identities?.['google.com'];
      if (!googleIdentities || googleIdentities.length === 0) throw new Error('No Google identity in token');
      resolvedLoginKey = googleIdentities[0];
    } catch {
      res.status(401).json({ error: 'Invalid Firebase ID token' });
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
    if (!LINE_CHANNEL_ID) {
      res.status(500).json({ error: 'LINE Sign In is not configured on the server' });
      return;
    }
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

  // wallet連携: メッセージ+署名検証（フロントエンドでnonce生成済み）
  if (loginType === 'wallet') {
    const normalizedAddress = loginKey.toLowerCase();
    resolvedLoginKey = normalizedAddress;
    if (!signature || !message) {
      res.status(400).json({ error: 'signature and message are required for wallet link' });
      return;
    }

    // メッセージからnonceを抽出
    const nonceMatch = message.match(/Nonce: (.+)/);
    if (!nonceMatch) {
      res.status(400).json({ error: 'Invalid message format: nonce not found' });
      return;
    }
    const nonce = nonceMatch[1];

    // リプレイ攻撃対策
    const usedNonceRef = admin.database().ref(`${env}/usedNonces/${nonce}`);
    let alreadyUsed = false;
    await usedNonceRef.transaction((current: number | null) => {
      if (current !== null) {
        alreadyUsed = true;
        return current;
      }
      return Date.now();
    });
    if (alreadyUsed) {
      res.status(400).json({ error: 'Nonce already used. Please try again.' });
      return;
    }

    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== normalizedAddress) {
        await usedNonceRef.remove();
        res.status(401).json({ error: 'Signature verification failed' });
        return;
      }
    } catch {
      await usedNonceRef.remove();
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  try {
    await linkLoginToUser(env, currentUid, loginType, resolvedLoginKey);
    res.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Link failed';
    res.status(409).json({ error: msg });
  }
}

export const linkLoginDev = functions.region(REGION).https.onRequest((req, res) => handleLinkLogin(req, res, 'dev'));
export const linkLoginPrd = functions.region(REGION).https.onRequest((req, res) => handleLinkLogin(req, res, 'prd'));
