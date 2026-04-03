import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { REGION, setCors } from '../../common/cors';
import { findOrCreateUser, updateLastLoginAt } from '../../common/db';
import { getOrCreateFirebaseUser, NONCE_EXPIRY_MS } from './_helpers';

// verifyWalletConnect — WalletConnect署名検証 → UUID払い出し
// フロントエンドが生成した nonce を含む署名メッセージを検証する。
// リプレイ攻撃対策として使用済み nonce を Realtime DB に記録する。
async function handleVerifyWalletConnect(
  req: functions.https.Request,
  res: functions.Response,
  env: 'dev' | 'prd',
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { address, signature, message, issuedAt } = req.body as {
    address: string; signature: string; message: string; issuedAt?: number;
  };
  if (!address || !signature || !message) {
    res.status(400).json({ error: 'address, signature, and message are required' });
    return;
  }

  const normalizedAddress = address.toLowerCase();

  // メッセージからnonceを抽出
  const nonceMatch = message.match(/Nonce: (.+)/);
  if (!nonceMatch) {
    res.status(400).json({ error: 'Invalid message format: nonce not found' });
    return;
  }
  const nonce = nonceMatch[1];

  // タイムスタンプ検証（フロントエンドから送られた発行時刻が5分以内か）
  if (issuedAt) {
    const age = Date.now() - issuedAt;
    if (age > NONCE_EXPIRY_MS || age < -30000) { // 30秒の時計ずれ許容
      res.status(400).json({ error: 'Message expired. Please try again.' });
      return;
    }
  }

  // リプレイ攻撃対策: 使用済みnonceをアトミックにチェック＆記録
  const usedNonceRef = admin.database().ref(`${env}/usedNonces/${nonce}`);
  let alreadyUsed = false;
  await usedNonceRef.transaction((current: number | null) => {
    if (current !== null) {
      alreadyUsed = true;
      return current; // 変更なし
    }
    return Date.now(); // 使用済みとして記録
  });
  if (alreadyUsed) {
    res.status(400).json({ error: 'Nonce already used. Please try again.' });
    return;
  }

  // 署名検証
  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== normalizedAddress) {
      // 署名不一致の場合、記録したnonceを削除（消費しない）
      await usedNonceRef.remove();
      res.status(401).json({ error: 'Signature verification failed' });
      return;
    }
  } catch {
    await usedNonceRef.remove();
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const uid = await findOrCreateUser(env, 'wallet', normalizedAddress, uuidv4());
  await getOrCreateFirebaseUser(uid);
  await updateLastLoginAt(env, uid);

  const customToken = await admin.auth().createCustomToken(uid, { loginType: 'wallet' });
  res.json({ customToken, userId: uid });
}

export const verifyWalletConnectDev = functions.region(REGION).https.onRequest((req, res) => handleVerifyWalletConnect(req, res, 'dev'));
export const verifyWalletConnectPrd = functions.region(REGION).https.onRequest((req, res) => handleVerifyWalletConnect(req, res, 'prd'));
